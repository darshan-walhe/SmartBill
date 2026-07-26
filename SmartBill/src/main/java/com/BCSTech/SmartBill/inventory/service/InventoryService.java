package com.BCSTech.SmartBill.inventory.service;

import com.BCSTech.SmartBill.common.exception.AppException;
import com.BCSTech.SmartBill.inventory.dto.InventoryDTOs;
import com.BCSTech.SmartBill.inventory.dto.InventoryDTOs.*;
import com.BCSTech.SmartBill.inventory.model.StockLedger;
import com.BCSTech.SmartBill.inventory.model.StockLedger.ReferenceType;
import com.BCSTech.SmartBill.inventory.model.StockLedger.TransactionType;
import com.BCSTech.SmartBill.inventory.repository.StockLedgerRepository;
import com.BCSTech.SmartBill.product.model.Product;
import com.BCSTech.SmartBill.product.service.ProductService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryService {

    private final StockLedgerRepository stockLedgerRepository;
    private final ProductService productService;

    // ── Manual adjustment (Stock In / Stock Out) ──────────────────────────────
    public StockLedgerResponse adjust(String companyId, String userId, AdjustmentRequest request) {

        if (request.getType() != TransactionType.ADJUSTMENT_IN
                && request.getType() != TransactionType.ADJUSTMENT_OUT) {
            throw AppException.badRequest("Invalid adjustment type. Use ADJUSTMENT_IN or ADJUSTMENT_OUT.");
        }

        Product product = productService.getProductOrThrow(request.getProductId(), companyId);

        // delta: positive for IN, negative for OUT
        int delta = request.getType() == TransactionType.ADJUSTMENT_IN
                ? request.getQuantity()
                : -request.getQuantity();

        // This validates sufficient stock internally
        productService.adjustStock(product.getId(), companyId, delta);

        // Reload updated stock
        product = productService.getProductOrThrow(product.getId(), companyId);

        StockLedger entry = StockLedger.builder()
                .companyId(companyId)
                .productId(product.getId())
                .productName(product.getName())
                .productSku(product.getSku())
                .transactionType(request.getType())
                .quantity(delta)
                .balanceAfter(product.getCurrentStock())
                .referenceType(ReferenceType.MANUAL_ADJUSTMENT)
                .notes(request.getNotes())
                .createdBy(userId)
                .build();

        return InventoryDTOs.toResponse(stockLedgerRepository.save(entry));
    }

    // ── Called from InvoiceService when invoice is SAVED ─────────────────────
    // Records stock OUT for each line item
    public void recordSale(String companyId, String userId,
                           String productId, int quantity,
                           String invoiceId, String invoiceNumber) {
        recordMovement(companyId, userId, productId, -quantity,
                TransactionType.SALE, ReferenceType.INVOICE, invoiceId, invoiceNumber, null);
    }

    // ── Called from PurchaseService when purchase is SAVED ───────────────────
    // Records stock IN for each line item
    public void recordPurchase(String companyId, String userId,
                               String productId, int quantity,
                               String purchaseId, String purchaseNumber) {
        recordMovement(companyId, userId, productId, quantity,
                TransactionType.PURCHASE, ReferenceType.PURCHASE, purchaseId, purchaseNumber, null);
    }

    // ── Called when invoice is cancelled or sale is returned ─────────────────
    public void recordSaleReturn(String companyId, String userId,
                                 String productId, int quantity,
                                 String referenceId, String referenceNumber) {
        recordMovement(companyId, userId, productId, quantity,
                TransactionType.SALE_RETURN, ReferenceType.INVOICE, referenceId, referenceNumber, null);
    }

    // ── Called when purchase return is created ────────────────────────────────
    public void recordPurchaseReturn(String companyId, String userId,
                                     String productId, int quantity,
                                     String referenceId, String referenceNumber) {
        recordMovement(companyId, userId, productId, -quantity,
                TransactionType.PURCHASE_RETURN, ReferenceType.PURCHASE, referenceId, referenceNumber, null);
    }

    // ── Get stock ledger for one product ──────────────────────────────────────
    public Page<StockLedgerResponse> getLedger(String productId, String companyId,
                                               int page, int size) {
        // Validate product belongs to company
        productService.getProductOrThrow(productId, companyId);

        Pageable pageable = PageRequest.of(page, size);
        return stockLedgerRepository
                .findByProductIdAndCompanyIdOrderByCreatedAtDesc(productId, companyId, pageable)
                .map(InventoryDTOs::toResponse);
    }

    // ── Get all movements for date range — for inventory report ───────────────
    public List<StockLedgerResponse> getByDateRange(String companyId,
                                                    LocalDateTime from,
                                                    LocalDateTime to) {
        return stockLedgerRepository
                .findByCompanyIdAndCreatedAtBetweenOrderByCreatedAtDesc(companyId, from, to)
                .stream()
                .map(InventoryDTOs::toResponse)
                .collect(Collectors.toList());
    }

    // ── Core internal method — all movements go through here ─────────────────
    private void recordMovement(String companyId, String userId,
                                String productId, int delta,
                                TransactionType type, ReferenceType refType,
                                String referenceId, String referenceNumber, String notes) {

        Product product = productService.getProductOrThrow(productId, companyId);

        // Adjust stock on product (validates sufficient stock for OUT)
        productService.adjustStock(productId, companyId, delta);

        // Reload to get updated stock level
        product = productService.getProductOrThrow(productId, companyId);

        StockLedger entry = StockLedger.builder()
                .companyId(companyId)
                .productId(productId)
                .productName(product.getName())
                .productSku(product.getSku())
                .transactionType(type)
                .quantity(delta)
                .balanceAfter(product.getCurrentStock())
                .referenceType(refType)
                .referenceId(referenceId)
                .referenceNumber(referenceNumber)
                .notes(notes)
                .createdBy(userId)
                .build();

        stockLedgerRepository.save(entry);

        log.info("Stock movement: {} {} units of {} ({}). Balance: {}",
                type, delta, product.getName(), product.getSku(), product.getCurrentStock());
    }
}