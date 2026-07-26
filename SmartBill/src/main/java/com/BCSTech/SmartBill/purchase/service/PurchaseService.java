package com.BCSTech.SmartBill.purchase.service;

import com.BCSTech.SmartBill.accounts.service.AccountsService;
import com.BCSTech.SmartBill.common.exception.AppException;
import com.BCSTech.SmartBill.company.model.Company;
import com.BCSTech.SmartBill.company.repository.CompanyRepository;
import com.BCSTech.SmartBill.inventory.service.InventoryService;
import com.BCSTech.SmartBill.purchase.dto.PurchaseDTOs;
import com.BCSTech.SmartBill.purchase.dto.PurchaseDTOs.*;
import com.BCSTech.SmartBill.purchase.model.Purchase;
import com.BCSTech.SmartBill.purchase.model.Purchase.PaymentStatus;
import com.BCSTech.SmartBill.purchase.model.PurchaseItem;
import com.BCSTech.SmartBill.purchase.repository.PurchaseRepository;
import com.BCSTech.SmartBill.product.service.ProductService;
import com.BCSTech.SmartBill.supplier.model.Supplier;
import com.BCSTech.SmartBill.supplier.service.SupplierService;
import com.BCSTech.SmartBill.invoice.service.GstCalculator;
import com.BCSTech.SmartBill.invoice.model.InvoiceItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PurchaseService {

    private final PurchaseRepository       purchaseRepository;
    private final SupplierService          supplierService;
    private final ProductService           productService;
    private final InventoryService         inventoryService;
    private final PurchaseNumberGenerator  numberGenerator;
    private final CompanyRepository        companyRepository;
    private final AccountsService          accountsService;

    // ══════════════════════════════════════════════════════════════
    //  CREATE PURCHASE
    // ══════════════════════════════════════════════════════════════
    public PurchaseResponse create(String companyId, String userId, SaveRequest request) {

        Supplier supplier = supplierService.getSupplierOrThrow(
                request.getSupplierId(), companyId);

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> AppException.notFound("Company not found"));

        // Determine intra vs inter state for input GST
        boolean isInterState = !isSameState(company.getState(), supplier.getState());

        BigDecimal exchangeRate = request.getExchangeRate() != null
                ? request.getExchangeRate() : BigDecimal.ONE;

        // Build line items using same GstCalculator as invoices
        List<PurchaseItem> items = buildLineItems(
                request.getItems(), companyId, isInterState);

        // Compute totals
        BigDecimal subtotal  = items.stream()
                .map(i -> i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCgst = items.stream().map(PurchaseItem::getCgst)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalSgst = items.stream().map(PurchaseItem::getSgst)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalIgst = items.stream().map(PurchaseItem::getIgst)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalTax  = totalCgst.add(totalSgst).add(totalIgst);

        BigDecimal totalAmount    = subtotal.add(totalTax)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalAmountInr = totalAmount.multiply(exchangeRate)
                .setScale(2, RoundingMode.HALF_UP);

        boolean isDraft = request.isSaveAsDraft();

        String purchaseNumber = numberGenerator.generate(companyId);

        Purchase purchase = Purchase.builder()
                .companyId(companyId)
                .supplierId(supplier.getId())
                .supplierName(supplier.getName())
                .supplierGstin(supplier.getGstin())
                .purchaseNumber(purchaseNumber)
                .supplierInvoiceNumber(request.getSupplierInvoiceNumber())
                .purchaseDate(request.getPurchaseDate())
                .dueDate(request.getDueDate())
                .currencyCode(request.getCurrencyCode() != null
                        ? request.getCurrencyCode() : "INR")
                .exchangeRate(exchangeRate)
                .items(items)
                .subtotal(subtotal)
                .totalCgst(totalCgst)
                .totalSgst(totalSgst)
                .totalIgst(totalIgst)
                .totalTax(totalTax)
                .totalAmount(totalAmount)
                .totalAmountInr(totalAmountInr)
                .totalPaid(BigDecimal.ZERO)
                .balanceDue(totalAmount)
                .paymentStatus(isDraft ? PaymentStatus.DRAFT : PaymentStatus.UNPAID)
                .isReturn(false)
                .notes(request.getNotes())
                .createdBy(userId)
                .build();

        purchase = purchaseRepository.save(purchase);

        // If confirmed — add stock + update supplier outstanding + post accounting entry
        if (!isDraft) {
            addStock(items, companyId, userId, purchase.getId(), purchaseNumber);
            supplierService.updateOutstanding(
                    supplier.getId(), companyId, totalAmountInr);
            accountsService.postPurchaseEntry(companyId, userId, purchase);
        }

        log.info("Purchase created: {} from supplier: {} total: {}",
                purchaseNumber, supplier.getName(), totalAmount);

        return toResponse(purchase);
    }

    // ══════════════════════════════════════════════════════════════
    //  CONFIRM DRAFT PURCHASE
    // ══════════════════════════════════════════════════════════════
    public PurchaseResponse confirmDraft(String purchaseId, String companyId, String userId) {
        Purchase purchase = getPurchaseOrThrow(purchaseId, companyId);

        if (purchase.getPaymentStatus() != PaymentStatus.DRAFT) {
            throw AppException.badRequest("Only DRAFT purchases can be confirmed.");
        }

        purchase.setPaymentStatus(PaymentStatus.UNPAID);
        purchase = purchaseRepository.save(purchase);

        addStock(purchase.getItems(), companyId, userId,
                purchase.getId(), purchase.getPurchaseNumber());
        supplierService.updateOutstanding(
                purchase.getSupplierId(), companyId, purchase.getTotalAmountInr());
        accountsService.postPurchaseEntry(companyId, userId, purchase);

        log.info("Purchase draft confirmed: {}", purchase.getPurchaseNumber());
        return toResponse(purchase);
    }

    // ══════════════════════════════════════════════════════════════
    //  RECORD SUPPLIER PAYMENT
    // ══════════════════════════════════════════════════════════════
    public PurchaseResponse recordPayment(String purchaseId, String companyId,
                                          String userId, SupplierPaymentRequest request) {
        Purchase purchase = getPurchaseOrThrow(purchaseId, companyId);

        if (purchase.getPaymentStatus() == PaymentStatus.PAID) {
            throw AppException.badRequest("Purchase is already fully paid.");
        }
        if (purchase.getPaymentStatus() == PaymentStatus.DRAFT) {
            throw AppException.badRequest("Confirm the purchase before recording payment.");
        }
        if (request.getAmount().compareTo(purchase.getBalanceDue()) > 0) {
            throw AppException.badRequest(
                    "Payment ₹" + request.getAmount() +
                            " exceeds balance due ₹" + purchase.getBalanceDue());
        }

        BigDecimal newTotalPaid  = purchase.getTotalPaid().add(request.getAmount());
        BigDecimal newBalanceDue = purchase.getTotalAmount().subtract(newTotalPaid);

        purchase.setTotalPaid(newTotalPaid);
        purchase.setBalanceDue(newBalanceDue.max(BigDecimal.ZERO));
        purchase.setPaymentStatus(
                newBalanceDue.compareTo(BigDecimal.ZERO) <= 0
                        ? PaymentStatus.PAID
                        : PaymentStatus.PARTIAL);

        purchase = purchaseRepository.save(purchase);

        // Reduce supplier outstanding
        supplierService.updateOutstanding(
                purchase.getSupplierId(), companyId, request.getAmount().negate());

        // Post accounting entry: Dr Accounts Payable / Cr Cash/Bank
        BigDecimal amountInr = request.getAmount().multiply(purchase.getExchangeRate())
                .setScale(2, RoundingMode.HALF_UP);
        accountsService.postPaymentMadeEntry(companyId, userId, purchase, amountInr,
                request.getPaymentMethod(), request.getPaymentDate());

        log.info("Supplier payment recorded: {} for purchase: {}",
                request.getAmount(), purchase.getPurchaseNumber());

        return toResponse(purchase);
    }

    // ══════════════════════════════════════════════════════════════
    //  PURCHASE RETURN
    // ══════════════════════════════════════════════════════════════
    public PurchaseResponse createReturn(String companyId, String userId,
                                         ReturnRequest request) {

        Purchase original = getPurchaseOrThrow(request.getPurchaseId(), companyId);

        if (original.isReturn()) {
            throw AppException.badRequest("Cannot return a purchase that is already a return.");
        }

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> AppException.notFound("Company not found"));

        Supplier supplier = supplierService.getSupplierOrThrow(
                original.getSupplierId(), companyId);

        boolean isInterState = !isSameState(company.getState(), supplier.getState());

        List<PurchaseItem> returnItems = buildLineItems(
                request.getItems(), companyId, isInterState);

        BigDecimal subtotal = returnItems.stream()
                .map(i -> i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCgst = returnItems.stream().map(PurchaseItem::getCgst)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalSgst = returnItems.stream().map(PurchaseItem::getSgst)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalIgst = returnItems.stream().map(PurchaseItem::getIgst)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalTax  = totalCgst.add(totalSgst).add(totalIgst);

        BigDecimal totalAmount    = subtotal.add(totalTax).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalAmountInr = totalAmount.multiply(original.getExchangeRate())
                .setScale(2, RoundingMode.HALF_UP);

        String returnNumber = numberGenerator.generate(companyId);

        Purchase returnPurchase = Purchase.builder()
                .companyId(companyId)
                .supplierId(original.getSupplierId())
                .supplierName(original.getSupplierName())
                .supplierGstin(original.getSupplierGstin())
                .purchaseNumber(returnNumber)
                .purchaseDate(LocalDate.now())
                .currencyCode(original.getCurrencyCode())
                .exchangeRate(original.getExchangeRate())
                .items(returnItems)
                .subtotal(subtotal)
                .totalCgst(totalCgst)
                .totalSgst(totalSgst)
                .totalIgst(totalIgst)
                .totalTax(totalTax)
                .totalAmount(totalAmount)
                .totalAmountInr(totalAmountInr)
                .totalPaid(totalAmount)    // returns are considered settled immediately
                .balanceDue(BigDecimal.ZERO)
                .paymentStatus(PaymentStatus.PAID)
                .isReturn(true)
                .returnOfPurchaseId(original.getId())
                .returnReason(request.getReturnReason())
                .createdBy(userId)
                .build();

        returnPurchase = purchaseRepository.save(returnPurchase);

        // Deduct stock for returned items
        for (PurchaseItem item : returnItems) {
            inventoryService.recordPurchaseReturn(companyId, userId,
                    item.getProductId(), item.getQuantity(),
                    returnPurchase.getId(), returnNumber);
        }

        // Reduce supplier outstanding by return amount
        supplierService.updateOutstanding(
                original.getSupplierId(), companyId, totalAmountInr.negate());

        // Post accounting entry: Dr Accounts Payable / Cr Purchase + Input GST
            accountsService.postPurchaseReturnEntry(companyId, userId, returnPurchase);

        log.info("Purchase return created: {} against: {}",
                returnNumber, original.getPurchaseNumber());

        return toResponse(returnPurchase);
    }

    // ══════════════════════════════════════════════════════════════
    //  READ OPERATIONS
    // ══════════════════════════════════════════════════════════════
    public PurchaseResponse getById(String purchaseId, String companyId) {
        return toResponse(getPurchaseOrThrow(purchaseId, companyId));
    }

    public Page<PurchaseSummary> list(String companyId, String keyword,
                                      String status, String supplierId,
                                      int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        if (keyword != null && !keyword.isBlank()) {
            return purchaseRepository.searchByCompanyId(companyId, keyword, pageable)
                    .map(this::toSummary);
        }
        if (supplierId != null && !supplierId.isBlank()) {
            return purchaseRepository
                    .findByCompanyIdAndSupplierIdAndIsReturnFalse(companyId, supplierId, pageable)
                    .map(this::toSummary);
        }
        if (status != null && !status.isBlank()) {
            PaymentStatus ps = PaymentStatus.valueOf(status.toUpperCase());
            return purchaseRepository
                    .findByCompanyIdAndPaymentStatusAndIsReturnFalse(companyId, ps, pageable)
                    .map(this::toSummary);
        }
        return purchaseRepository
                .findByCompanyIdAndIsReturnFalse(companyId, pageable)
                .map(this::toSummary);
    }

    // ── Dashboard stats ───────────────────────────────────────────────────────
    public PurchaseStats getStats(String companyId) {
        LocalDate today = LocalDate.now();

        List<Purchase> todayList = purchaseRepository
                .findByCompanyIdAndPurchaseDateBetweenAndIsReturnFalse(
                        companyId, today, today);

        BigDecimal todayPurchases = todayList.stream()
                .map(Purchase::getTotalAmountInr)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Purchase> monthList = purchaseRepository
                .findByCompanyIdAndPurchaseDateBetweenAndIsReturnFalse(
                        companyId, today.withDayOfMonth(1), today);

        BigDecimal monthPurchases = monthList.stream()
                .map(Purchase::getTotalAmountInr)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long unpaidCount = purchaseRepository
                .findByCompanyIdAndPaymentStatusAndIsReturnFalse(
                        companyId, PaymentStatus.UNPAID, PageRequest.of(0, 1))
                .getTotalElements();

        BigDecimal totalPayable = supplierService.getTotalPayable(companyId);

        return PurchaseStats.builder()
                .todayPurchases(todayPurchases)
                .monthPurchases(monthPurchases)
                .totalPayable(totalPayable)
                .unpaidCount(unpaidCount)
                .build();
    }

    // ── For GST input tax report ──────────────────────────────────────────────
    public List<Purchase> getPurchasesInDateRange(String companyId,
                                                  LocalDate from, LocalDate to) {
        return purchaseRepository
                .findByCompanyIdAndPurchaseDateBetweenAndIsReturnFalse(
                        companyId, from, to);
    }

    // ══════════════════════════════════════════════════════════════
    //  PRIVATE HELPERS
    // ══════════════════════════════════════════════════════════════
    private List<PurchaseItem> buildLineItems(List<PurchaseDTOs.ItemRequest> requests,
                                              String companyId, boolean isInterState) {
        List<PurchaseItem> items = new ArrayList<>();
        for (PurchaseDTOs.ItemRequest req : requests) {
            var product = productService.getProductOrThrow(req.getProductId(), companyId);

            BigDecimal taxRate = req.getTaxRate() != null
                    ? req.getTaxRate() : product.getTaxRate();

            // Reuse GstCalculator — purchase and invoice math is identical
            InvoiceItem calc = GstCalculator.calculate(
                    product.getId(), product.getName(),
                    product.getHsnCode(), product.getUnit(),
                    req.getQuantity(), req.getUnitPrice(),
                    BigDecimal.ZERO,   // no discount on purchases
                    taxRate, isInterState);

            items.add(PurchaseItem.builder()
                    .productId(product.getId())
                    .productName(product.getName())
                    .hsnCode(product.getHsnCode())
                    .unit(product.getUnit())
                    .quantity(req.getQuantity())
                    .unitPrice(req.getUnitPrice())
                    .taxRate(taxRate)
                    .cgst(calc.getCgst())
                    .sgst(calc.getSgst())
                    .igst(calc.getIgst())
                    .taxAmount(calc.getTaxAmount())
                    .lineTotal(calc.getLineTotal())
                    .build());
        }
        return items;
    }

    private void addStock(List<PurchaseItem> items, String companyId,
                          String userId, String purchaseId, String purchaseNumber) {
        for (PurchaseItem item : items) {
            inventoryService.recordPurchase(companyId, userId,
                    item.getProductId(), item.getQuantity(),
                    purchaseId, purchaseNumber);
        }
    }

    private boolean isSameState(String companyState, String supplierState) {
        if (companyState == null || supplierState == null) return true;
        return companyState.trim().equalsIgnoreCase(supplierState.trim());
    }

    public Purchase getPurchaseOrThrow(String purchaseId, String companyId) {
        return purchaseRepository.findByIdAndCompanyId(purchaseId, companyId)
                .orElseThrow(() -> AppException.notFound("Purchase not found"));
    }

    private PurchaseResponse toResponse(Purchase p) {
        return PurchaseResponse.builder()
                .id(p.getId())
                .companyId(p.getCompanyId())
                .supplierId(p.getSupplierId())
                .supplierName(p.getSupplierName())
                .supplierGstin(p.getSupplierGstin())
                .purchaseNumber(p.getPurchaseNumber())
                .supplierInvoiceNumber(p.getSupplierInvoiceNumber())
                .purchaseDate(p.getPurchaseDate())
                .dueDate(p.getDueDate())
                .currencyCode(p.getCurrencyCode())
                .exchangeRate(p.getExchangeRate())
                .items(p.getItems())
                .subtotal(p.getSubtotal())
                .totalCgst(p.getTotalCgst())
                .totalSgst(p.getTotalSgst())
                .totalIgst(p.getTotalIgst())
                .totalTax(p.getTotalTax())
                .totalAmount(p.getTotalAmount())
                .totalAmountInr(p.getTotalAmountInr())
                .totalPaid(p.getTotalPaid())
                .balanceDue(p.getBalanceDue())
                .paymentStatus(p.getPaymentStatus())
                .isReturn(p.isReturn())
                .returnOfPurchaseId(p.getReturnOfPurchaseId())
                .returnReason(p.getReturnReason())
                .notes(p.getNotes())
                .createdAt(p.getCreatedAt())
                .build();
    }

    private PurchaseSummary toSummary(Purchase p) {
        return PurchaseSummary.builder()
                .id(p.getId())
                .purchaseNumber(p.getPurchaseNumber())
                .supplierName(p.getSupplierName())
                .purchaseDate(p.getPurchaseDate())
                .dueDate(p.getDueDate())
                .totalAmount(p.getTotalAmount())
                .balanceDue(p.getBalanceDue())
                .paymentStatus(p.getPaymentStatus())
                .isReturn(p.isReturn())
                .build();
    }
}