package com.BCSTech.SmartBill.invoice.model;

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
@Document(collection = "invoices")
@CompoundIndexes({
        @CompoundIndex(name = "company_date",   def = "{'companyId': 1, 'invoiceDate': -1}"),
        @CompoundIndex(name = "company_status", def = "{'companyId': 1, 'paymentStatus': 1}"),
        @CompoundIndex(name = "company_customer",def = "{'companyId': 1, 'customerId': 1}")
})
public class Invoice {

    @Id
    private String id;

    @Indexed
    private String companyId;

    private String customerId;

    // Snapshot of customer at invoice time
    private String customerName;
    private String customerGstin;
    private String billingAddress;
    private String shippingAddress;

    @Indexed(unique = true)
    private String invoiceNumber;   // e.g. INV-2024-0001

    private InvoiceType invoiceType;

    private LocalDate invoiceDate;

    private LocalDate dueDate;

    // Currency used for this invoice
    @Builder.Default
    private String currencyCode = "INR";

    // FX rate at invoice time (1.0 for INR)
    @Builder.Default
    private BigDecimal exchangeRate = BigDecimal.ONE;

    // Place of supply — determines CGST+SGST vs IGST
    // If same state as company → CGST+SGST, else → IGST
    private String placeOfSupply;

    // ── Line items (embedded) ─────────────────────────────────────────────────
    @Builder.Default
    private List<InvoiceItem> items = new ArrayList<>();

    // ── Totals ────────────────────────────────────────────────────────────────
    @Builder.Default
    private BigDecimal subtotal          = BigDecimal.ZERO;  // before discount + tax

    @Builder.Default
    private BigDecimal totalDiscount     = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal taxableAmount     = BigDecimal.ZERO;  // after discount, before tax

    @Builder.Default
    private BigDecimal totalCgst         = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal totalSgst         = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal totalIgst         = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal totalTax          = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal shippingCharges   = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal roundOff          = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal totalAmount       = BigDecimal.ZERO;  // final amount in invoice currency

    @Builder.Default
    private BigDecimal totalAmountInr    = BigDecimal.ZERO;  // always in INR for accounting

    // ── Payment tracking (embedded) ───────────────────────────────────────────
    @Builder.Default
    private List<Payment> payments = new ArrayList<>();

    @Builder.Default
    private BigDecimal totalPaid         = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal balanceDue        = BigDecimal.ZERO;

    private PaymentStatus paymentStatus;

    // ── Meta ──────────────────────────────────────────────────────────────────
    private String notes;

    private String termsAndConditions;

    private String createdBy;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    // ── Enums ─────────────────────────────────────────────────────────────────
    public enum InvoiceType {
        TAX_INVOICE,
        PROFORMA,
        QUOTATION,
        EXPORT_INVOICE
    }

    public enum PaymentStatus {
        DRAFT,
        UNPAID,
        PARTIAL,
        PAID,
        CANCELLED
    }
}