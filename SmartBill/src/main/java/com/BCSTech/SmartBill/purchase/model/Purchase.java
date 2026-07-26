package com.BCSTech.SmartBill.purchase.model;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "purchases")
@CompoundIndexes({
        @CompoundIndex(name = "company_date",     def = "{'companyId': 1, 'purchaseDate': -1}"),
        @CompoundIndex(name = "company_supplier", def = "{'companyId': 1, 'supplierId': 1}"),
        @CompoundIndex(name = "company_status",   def = "{'companyId': 1, 'paymentStatus': 1}")
})
public class Purchase {

    @Id
    private String id;

    @Indexed
    private String companyId;

    private String supplierId;

    // Snapshot of supplier at purchase time
    private String supplierName;
    private String supplierGstin;

    // Auto-generated: PUR-2024-0001
    @Indexed
    private String purchaseNumber;

    // Supplier's own invoice number (for input tax credit)
    private String supplierInvoiceNumber;

    private LocalDate purchaseDate;

    private LocalDate dueDate;

    @Builder.Default
    private String currencyCode = "INR";

    @Builder.Default
    private BigDecimal exchangeRate = BigDecimal.ONE;

    // Line items — embedded
    @Builder.Default
    private List<PurchaseItem> items = new ArrayList<>();

    // ── Totals ────────────────────────────────────────────────────────────────
    @Builder.Default
    private BigDecimal subtotal       = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal totalCgst      = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal totalSgst      = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal totalIgst      = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal totalTax       = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal totalAmount    = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal totalAmountInr = BigDecimal.ZERO;

    // ── Payment tracking ──────────────────────────────────────────────────────
    @Builder.Default
    private BigDecimal totalPaid      = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal balanceDue     = BigDecimal.ZERO;

    private PaymentStatus paymentStatus;

    // ── Return tracking ───────────────────────────────────────────────────────
    // If this is a return, points to original purchase
    private boolean isReturn;
    private String  returnOfPurchaseId;
    private String  returnReason;

    private String notes;

    private String createdBy;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    // ── Enums ─────────────────────────────────────────────────────────────────
    public enum PaymentStatus {
        DRAFT,
        UNPAID,
        PARTIAL,
        PAID
    }
}