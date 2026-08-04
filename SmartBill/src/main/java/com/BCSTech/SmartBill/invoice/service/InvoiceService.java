package com.BCSTech.SmartBill.invoice.service;

import com.BCSTech.SmartBill.accounts.service.AccountsService;
import com.BCSTech.SmartBill.audit.model.AuditLog.Action;
import com.BCSTech.SmartBill.audit.service.AuditService;
import com.BCSTech.SmartBill.common.exception.AppException;
import com.BCSTech.SmartBill.company.model.Company;
import com.BCSTech.SmartBill.company.repository.CompanyRepository;
import com.BCSTech.SmartBill.notification.model.NotificationType;
import com.BCSTech.SmartBill.notification.service.NotificationService;
import com.BCSTech.SmartBill.customer.model.Customer;
import com.BCSTech.SmartBill.customer.service.CustomerService;
import com.BCSTech.SmartBill.inventory.service.InventoryService;
import com.BCSTech.SmartBill.invoice.dto.InvoiceDTOs;
import com.BCSTech.SmartBill.invoice.dto.InvoiceDTOs.*;
import com.BCSTech.SmartBill.invoice.model.Invoice;
import com.BCSTech.SmartBill.invoice.model.Invoice.PaymentStatus;
import com.BCSTech.SmartBill.invoice.model.InvoiceItem;
import com.BCSTech.SmartBill.invoice.model.Payment;
import com.BCSTech.SmartBill.invoice.repository.InvoiceRepository;
import com.BCSTech.SmartBill.product.model.Product;
import com.BCSTech.SmartBill.product.service.ProductService;
import com.BCSTech.SmartBill.user.model.Role;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final CustomerService customerService;
    private final ProductService productService;
    private final InventoryService inventoryService;
    private final InvoiceNumberGenerator numberGenerator;
    private final CompanyRepository companyRepository;
    private final AccountsService accountsService;
    private final NotificationService notificationService;
    private final AuditService auditService;

    // ══════════════════════════════════════════════════════════════
    //  CREATE INVOICE
    // ══════════════════════════════════════════════════════════════

    public InvoiceResponse create(String companyId, String userId, String role, SaveRequest request) {

        // 1. Validate and fetch customer
        Customer customer = customerService.getCustomerOrThrow(request.getCustomerId(), companyId);

        // 2. Fetch company (for GST state comparison)
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> AppException.notFound("Company not found"));

        // 3. Determine inter-state vs intra-state GST
        String placeOfSupply = request.getPlaceOfSupply() != null
                ? request.getPlaceOfSupply()
                : customer.getState();
        boolean isInterState = !isSameState(company.getState(), placeOfSupply);

        // 4. Calculate each line item
        BigDecimal exchangeRate = request.getExchangeRate() != null
                ? request.getExchangeRate() : BigDecimal.ONE;

        List<InvoiceItem> items = buildLineItems(
                request.getItems(), companyId, isInterState, role);

        // 5. Compute invoice totals
        BigDecimal subtotal      = items.stream().map(i ->
                        i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalDiscount = items.stream()
                .map(InvoiceItem::getDiscountAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal taxableAmount = subtotal.subtract(totalDiscount);

        BigDecimal totalCgst = items.stream()
                .map(InvoiceItem::getCgst).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalSgst = items.stream()
                .map(InvoiceItem::getSgst).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalIgst = items.stream()
                .map(InvoiceItem::getIgst).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalTax  = totalCgst.add(totalSgst).add(totalIgst);

        BigDecimal shipping = request.getShippingCharges() != null
                ? request.getShippingCharges() : BigDecimal.ZERO;

        BigDecimal beforeRound = taxableAmount.add(totalTax).add(shipping);
        BigDecimal roundOff    = GstCalculator.getRoundOff(beforeRound);
        BigDecimal totalAmount = beforeRound.add(roundOff)
                .setScale(2, RoundingMode.HALF_UP);

        // Total in INR for accounting
        BigDecimal totalAmountInr = totalAmount.multiply(exchangeRate)
                .setScale(2, RoundingMode.HALF_UP);

        // 6. Validate credit limit (only for confirmed invoices)
        Invoice.InvoiceType invoiceType = request.getInvoiceType() != null
                ? request.getInvoiceType() : Invoice.InvoiceType.TAX_INVOICE;

        boolean isDraft = request.isSaveAsDraft()
                || invoiceType == Invoice.InvoiceType.QUOTATION
                || invoiceType == Invoice.InvoiceType.PROFORMA;

        if (!isDraft) {
            customerService.validateCreditLimit(
                    customer.getId(), companyId, totalAmountInr);
        }

        // 7. Generate invoice number
        String invoiceNumber = numberGenerator.generate(companyId);

        // 8. Build and save invoice
        Invoice invoice = Invoice.builder()
                .companyId(companyId)
                .customerId(customer.getId())
                .customerName(customer.getName())
                .customerGstin(customer.getGstin())
                .billingAddress(buildAddress(customer))
                .shippingAddress(buildAddress(customer))
                .invoiceNumber(invoiceNumber)
                .invoiceType(invoiceType)
                .invoiceDate(request.getInvoiceDate())
                .dueDate(request.getDueDate())
                .currencyCode(request.getCurrencyCode())
                .exchangeRate(exchangeRate)
                .placeOfSupply(placeOfSupply)
                .items(items)
                .subtotal(subtotal)
                .totalDiscount(totalDiscount)
                .taxableAmount(taxableAmount)
                .totalCgst(totalCgst)
                .totalSgst(totalSgst)
                .totalIgst(totalIgst)
                .totalTax(totalTax)
                .shippingCharges(shipping)
                .roundOff(roundOff)
                .totalAmount(totalAmount)
                .totalAmountInr(totalAmountInr)
                .payments(new ArrayList<>())
                .totalPaid(BigDecimal.ZERO)
                .balanceDue(totalAmount)
                .paymentStatus(isDraft ? PaymentStatus.DRAFT : PaymentStatus.UNPAID)
                .notes(request.getNotes())
                .termsAndConditions(request.getTermsAndConditions())
                .createdBy(userId)
                .build();

        invoice = invoiceRepository.save(invoice);

        // 9. Deduct stock + update customer balance + post accounting entry (only for confirmed invoices)
        if (!isDraft) {
            deductStock(items, companyId, userId, invoice.getId(), invoiceNumber);
            customerService.updateBalance(customer.getId(), companyId, totalAmountInr);
            accountsService.postInvoiceEntry(companyId, userId, invoice);
        }

        log.info("Invoice created: {} for customer: {} total: {}",
                invoiceNumber, customer.getName(), totalAmount);

        return toResponse(invoice);
    }

    // ══════════════════════════════════════════════════════════════
    //  CONFIRM DRAFT
    // ══════════════════════════════════════════════════════════════

    public InvoiceResponse confirmDraft(String invoiceId, String companyId, String userId) {
        Invoice invoice = getInvoiceOrThrow(invoiceId, companyId);

        if (invoice.getPaymentStatus() != PaymentStatus.DRAFT) {
            throw AppException.badRequest("Only DRAFT invoices can be confirmed.");
        }

        invoice.setPaymentStatus(PaymentStatus.UNPAID);
        invoice = invoiceRepository.save(invoice);

        // Now deduct stock, update balance, and post the accounting entry
        deductStock(invoice.getItems(), companyId, userId,
                invoice.getId(), invoice.getInvoiceNumber());
        customerService.updateBalance(
                invoice.getCustomerId(), companyId, invoice.getTotalAmountInr());
        accountsService.postInvoiceEntry(companyId, userId, invoice);

        log.info("Draft confirmed: {}", invoice.getInvoiceNumber());
        return toResponse(invoice);
    }

    // ══════════════════════════════════════════════════════════════
    //  RECORD PAYMENT
    // ══════════════════════════════════════════════════════════════

    public InvoiceResponse recordPayment(String invoiceId, String companyId,
                                         String userId, PaymentRequest request) {

        Invoice invoice = getInvoiceOrThrow(invoiceId, companyId);

        if (invoice.getPaymentStatus() == PaymentStatus.PAID) {
            throw AppException.badRequest("Invoice is already fully paid.");
        }
        if (invoice.getPaymentStatus() == PaymentStatus.CANCELLED) {
            throw AppException.badRequest("Cannot record payment on a cancelled invoice.");
        }
        if (invoice.getPaymentStatus() == PaymentStatus.DRAFT) {
            throw AppException.badRequest("Confirm the draft invoice before recording payment.");
        }

        // Validate amount does not exceed balance due
        if (request.getAmount().compareTo(invoice.getBalanceDue()) > 0) {
            throw AppException.badRequest(
                    "Payment amount ₹" + request.getAmount() +
                            " exceeds balance due ₹" + invoice.getBalanceDue());
        }

        // Build payment record
        Payment payment = Payment.builder()
                .id(UUID.randomUUID().toString())
                .amount(request.getAmount())
                .currencyCode(invoice.getCurrencyCode())
                .amountInr(request.getAmount().multiply(invoice.getExchangeRate())
                        .setScale(2, RoundingMode.HALF_UP))
                .paymentMethod(request.getPaymentMethod())
                .transactionReference(request.getTransactionReference())
                .paymentDate(request.getPaymentDate() != null
                        ? request.getPaymentDate() : LocalDate.now())
                .notes(request.getNotes())
                .recordedBy(userId)
                .build();

        invoice.getPayments().add(payment);

        // Update totals
        BigDecimal newTotalPaid = invoice.getTotalPaid().add(request.getAmount());
        BigDecimal newBalanceDue = invoice.getTotalAmount().subtract(newTotalPaid);

        invoice.setTotalPaid(newTotalPaid);
        invoice.setBalanceDue(newBalanceDue.max(BigDecimal.ZERO));

        // Update status
        if (newBalanceDue.compareTo(BigDecimal.ZERO) <= 0) {
            invoice.setPaymentStatus(PaymentStatus.PAID);
        } else {
            invoice.setPaymentStatus(PaymentStatus.PARTIAL);
        }

        invoice = invoiceRepository.save(invoice);

        // Reduce customer outstanding balance
        customerService.updateBalance(
                invoice.getCustomerId(), companyId, request.getAmount().negate());

        // Post accounting entry: Dr Cash/Bank / Cr Accounts Receivable
        accountsService.postPaymentReceivedEntry(companyId, userId, invoice, payment);

        notificationService.notifyCompany(companyId, NotificationType.PAYMENT_RECEIVED,
                "Payment received — " + invoice.getInvoiceNumber(),
                "₹" + request.getAmount() + " received from " + invoice.getCustomerName()
                        + " against " + invoice.getInvoiceNumber() + ".",
                "INVOICE", invoice.getId());

        log.info("Payment recorded: {} for invoice: {} method: {}",
                request.getAmount(), invoice.getInvoiceNumber(), request.getPaymentMethod());

        return toResponse(invoice);
    }

    // ══════════════════════════════════════════════════════════════
    //  CANCEL INVOICE
    // ══════════════════════════════════════════════════════════════

    public InvoiceResponse cancel(String invoiceId, String companyId, String userId) {
        Invoice invoice = getInvoiceOrThrow(invoiceId, companyId);

        if (invoice.getPaymentStatus() == PaymentStatus.PAID) {
            throw AppException.badRequest("Cannot cancel a fully paid invoice.");
        }
        if (invoice.getPaymentStatus() == PaymentStatus.CANCELLED) {
            throw AppException.badRequest("Invoice is already cancelled.");
        }

        // Reverse stock if it was confirmed
        if (invoice.getPaymentStatus() != PaymentStatus.DRAFT) {
            reverseStock(invoice.getItems(), companyId, userId,
                    invoice.getId(), invoice.getInvoiceNumber());

            // Reverse customer balance — only the OUTSTANDING (unpaid) portion.
            // Any partial payment already reduced the customer's balance when
            // it was recorded (see recordPayment()), so reversing the full
            // invoice total here would double-subtract that payment and leave
            // the customer's balance incorrectly negative. Reversing just the
            // unpaid remainder brings it back to exactly zero either way.
            BigDecimal paidSoFarInr = invoice.getPayments().stream()
                    .map(Payment::getAmountInr)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal outstandingInr = invoice.getTotalAmountInr().subtract(paidSoFarInr);

            customerService.updateBalance(
                    invoice.getCustomerId(), companyId,
                    outstandingInr.negate());

            // Reverse every journal entry posted against this invoice
            // (the sale entry, plus any payment-received entries)
            accountsService.reverseEntriesForReference(companyId, userId,
                    invoice.getId(), LocalDate.now(),
                    "Invoice cancelled — " + invoice.getInvoiceNumber());
        }

        invoice.setPaymentStatus(PaymentStatus.CANCELLED);
        invoice = invoiceRepository.save(invoice);

        notificationService.notifyCompany(companyId, NotificationType.INVOICE_CANCELLED,
                "Invoice cancelled — " + invoice.getInvoiceNumber(),
                "Invoice " + invoice.getInvoiceNumber() + " for " + invoice.getCustomerName()
                        + " was cancelled.",
                "INVOICE", invoice.getId());

        auditService.record(companyId, userId, Action.CANCEL, "INVOICE", invoice.getId(),
                "Cancelled invoice " + invoice.getInvoiceNumber());

        log.info("Invoice cancelled: {}", invoice.getInvoiceNumber());
        return toResponse(invoice);
    }

    // ══════════════════════════════════════════════════════════════
    //  READ OPERATIONS
    // ══════════════════════════════════════════════════════════════

    public InvoiceResponse getById(String invoiceId, String companyId) {
        return toResponse(getInvoiceOrThrow(invoiceId, companyId));
    }

    public Page<InvoiceSummary> list(String companyId, String keyword,
                                     String status, String customerId,
                                     int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        if (keyword != null && !keyword.isBlank()) {
            return invoiceRepository.searchByCompanyId(companyId, keyword, pageable)
                    .map(this::toSummary);
        }
        if (customerId != null && !customerId.isBlank()) {
            return invoiceRepository.findByCompanyIdAndCustomerId(companyId, customerId, pageable)
                    .map(this::toSummary);
        }
        if (status != null && !status.isBlank()) {
            PaymentStatus ps = PaymentStatus.valueOf(status.toUpperCase());
            return invoiceRepository.findByCompanyIdAndPaymentStatus(companyId, ps, pageable)
                    .map(this::toSummary);
        }
        return invoiceRepository.findByCompanyIdAndPaymentStatusNot(
                        companyId, PaymentStatus.CANCELLED, pageable)
                .map(this::toSummary);
    }

    public List<InvoiceSummary> getOverdue(String companyId) {
        return invoiceRepository.findOverdueInvoices(companyId, LocalDate.now())
                .stream().map(this::toSummary).collect(Collectors.toList());
    }

    // ── Dashboard sales stats ─────────────────────────────────────────────────
    public SalesStats getSalesStats(String companyId) {
        LocalDate today = LocalDate.now();

        BigDecimal todaySales = sumOrZero(
                invoiceRepository.sumTotalAmountByCompanyAndDateRange(companyId, today, today));

        BigDecimal monthSales = sumOrZero(
                invoiceRepository.sumTotalAmountByCompanyAndDateRange(
                        companyId, today.withDayOfMonth(1), today));

        BigDecimal yearSales = sumOrZero(
                invoiceRepository.sumTotalAmountByCompanyAndDateRange(
                        companyId, today.withDayOfYear(1), today));

        long unpaidCount = invoiceRepository
                .findByCompanyIdAndPaymentStatus(companyId, PaymentStatus.UNPAID,
                        PageRequest.of(0, 1)).getTotalElements();

        long overdueCount = invoiceRepository
                .findOverdueInvoices(companyId, today).size();

        return SalesStats.builder()
                .todaySales(todaySales)
                .monthSales(monthSales)
                .yearSales(yearSales)
                .unpaidCount(unpaidCount)
                .overdueCount(overdueCount)
                .build();
    }

    // ══════════════════════════════════════════════════════════════
    //  PRIVATE HELPERS
    // ══════════════════════════════════════════════════════════════

    private List<InvoiceItem> buildLineItems(List<InvoiceDTOs.ItemRequest> itemRequests,
                                             String companyId, boolean isInterState, String role) {
        // Only ADMIN/MANAGER may override a product's price or apply a
        // discount on an invoice. STAFF can create invoices, but always at
        // the product's real sale price — otherwise any STAFF-level account
        // (the lowest-privilege role that can create invoices at all) could
        // submit unitPrice: 0.01 for an expensive product and the system
        // would record that fabricated amount as real revenue while real
        // stock still leaves inventory. Client-supplied overrides outside
        // this rule are silently ignored, not merely bounds-checked.
        boolean canOverridePrice = Role.ADMIN.name().equals(role) || Role.MANAGER.name().equals(role);

        List<InvoiceItem> items = new ArrayList<>();
        for (InvoiceDTOs.ItemRequest req : itemRequests) {
            Product product = productService.getProductOrThrow(req.getProductId(), companyId);

            BigDecimal unitPrice = (canOverridePrice && req.getUnitPrice() != null)
                    ? req.getUnitPrice() : product.getSalePrice();

            BigDecimal discountPct = (canOverridePrice && req.getDiscountPercent() != null)
                    ? req.getDiscountPercent() : BigDecimal.ZERO;

            InvoiceItem item = GstCalculator.calculate(
                    product.getId(), product.getName(),
                    product.getHsnCode(), product.getUnit(),
                    req.getQuantity(), unitPrice, discountPct,
                    product.getTaxRate(), isInterState);

            items.add(item);
        }
        return items;
    }

    private void deductStock(List<InvoiceItem> items, String companyId,
                             String userId, String invoiceId, String invoiceNumber) {
        for (InvoiceItem item : items) {
            inventoryService.recordSale(companyId, userId,
                    item.getProductId(), item.getQuantity(),
                    invoiceId, invoiceNumber);
        }
    }

    private void reverseStock(List<InvoiceItem> items, String companyId,
                              String userId, String invoiceId, String invoiceNumber) {
        for (InvoiceItem item : items) {
            inventoryService.recordSaleReturn(companyId, userId,
                    item.getProductId(), item.getQuantity(),
                    invoiceId, invoiceNumber);
        }
    }

    private boolean isSameState(String companyState, String placeOfSupply) {
        if (companyState == null || placeOfSupply == null) return true;
        return companyState.trim().equalsIgnoreCase(placeOfSupply.trim());
    }

    private String buildAddress(Customer customer) {
        StringBuilder sb = new StringBuilder();
        if (customer.getAddress() != null) sb.append(customer.getAddress());
        if (customer.getCity() != null) sb.append(", ").append(customer.getCity());
        if (customer.getState() != null) sb.append(", ").append(customer.getState());
        if (customer.getPincode() != null) sb.append(" - ").append(customer.getPincode());
        return sb.toString();
    }

    private BigDecimal sumOrZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    public Invoice getInvoiceOrThrow(String invoiceId, String companyId) {
        return invoiceRepository.findByIdAndCompanyId(invoiceId, companyId)
                .orElseThrow(() -> AppException.notFound("Invoice not found"));
    }

    private InvoiceResponse toResponse(Invoice invoice) {
        return InvoiceResponse.builder()
                .id(invoice.getId())
                .companyId(invoice.getCompanyId())
                .customerId(invoice.getCustomerId())
                .customerName(invoice.getCustomerName())
                .customerGstin(invoice.getCustomerGstin())
                .billingAddress(invoice.getBillingAddress())
                .shippingAddress(invoice.getShippingAddress())
                .invoiceNumber(invoice.getInvoiceNumber())
                .invoiceType(invoice.getInvoiceType())
                .invoiceDate(invoice.getInvoiceDate())
                .dueDate(invoice.getDueDate())
                .currencyCode(invoice.getCurrencyCode())
                .exchangeRate(invoice.getExchangeRate())
                .placeOfSupply(invoice.getPlaceOfSupply())
                .items(invoice.getItems())
                .subtotal(invoice.getSubtotal())
                .totalDiscount(invoice.getTotalDiscount())
                .taxableAmount(invoice.getTaxableAmount())
                .totalCgst(invoice.getTotalCgst())
                .totalSgst(invoice.getTotalSgst())
                .totalIgst(invoice.getTotalIgst())
                .totalTax(invoice.getTotalTax())
                .shippingCharges(invoice.getShippingCharges())
                .roundOff(invoice.getRoundOff())
                .totalAmount(invoice.getTotalAmount())
                .totalAmountInr(invoice.getTotalAmountInr())
                .payments(invoice.getPayments())
                .totalPaid(invoice.getTotalPaid())
                .balanceDue(invoice.getBalanceDue())
                .paymentStatus(invoice.getPaymentStatus())
                .notes(invoice.getNotes())
                .termsAndConditions(invoice.getTermsAndConditions())
                .createdAt(invoice.getCreatedAt())
                .build();
    }

    private InvoiceSummary toSummary(Invoice invoice) {
        return InvoiceSummary.builder()
                .id(invoice.getId())
                .invoiceNumber(invoice.getInvoiceNumber())
                .customerName(invoice.getCustomerName())
                .invoiceDate(invoice.getInvoiceDate())
                .dueDate(invoice.getDueDate())
                .currencyCode(invoice.getCurrencyCode())
                .totalAmount(invoice.getTotalAmount())
                .balanceDue(invoice.getBalanceDue())
                .paymentStatus(invoice.getPaymentStatus())
                .invoiceType(invoice.getInvoiceType())
                .build();
    }
}