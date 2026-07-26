package com.BCSTech.SmartBill.invoice.dto;

import com.BCSTech.SmartBill.invoice.model.Invoice;
import com.BCSTech.SmartBill.invoice.model.InvoiceItem;
import com.BCSTech.SmartBill.invoice.model.Payment;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class InvoiceDTOs {

    // ── Line item request ──────────────────────────────────────────────────────
    @Builder
    @Data
    public static class ItemRequest {

        @NotBlank(message = "Product ID is required")
        private String productId;

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity;

        // Override sale price if needed (e.g. negotiated price)
        private BigDecimal unitPrice;

        @Builder.Default
        private BigDecimal discountPercent = BigDecimal.ZERO;
    }

    // ── Payment request (record payment against invoice) ──────────────────────
    @Data
    public static class PaymentRequest {

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
        private BigDecimal amount;

        @NotNull(message = "Payment method is required")
        private Payment.PaymentMethod paymentMethod;

        private String transactionReference;

        private LocalDate paymentDate;

        private String notes;
    }

    // ── Create / Update invoice request ───────────────────────────────────────
    @Builder
    @Data
    public static class SaveRequest {

        @NotBlank(message = "Customer ID is required")
        private String customerId;

        private Invoice.InvoiceType invoiceType;

        @NotNull(message = "Invoice date is required")
        private LocalDate invoiceDate;

        private LocalDate dueDate;

        @Builder.Default
        private String currencyCode = "INR";

        // Required if currency != INR
        private BigDecimal exchangeRate;

        private String placeOfSupply;

        @NotEmpty(message = "Invoice must have at least one item")
        @Valid
        private List<ItemRequest> items;

        private BigDecimal shippingCharges;

        private String notes;

        private String termsAndConditions;

        // If true — save as DRAFT, no stock deduction
        @Builder.Default
        private boolean saveAsDraft = false;
    }

    // ── Full invoice response ─────────────────────────────────────────────────
    @Data
    @Builder
    public static class InvoiceResponse {
        private String id;
        private String companyId;
        private String customerId;
        private String customerName;
        private String customerGstin;
        private String billingAddress;
        private String shippingAddress;
        private String invoiceNumber;
        private Invoice.InvoiceType invoiceType;
        private LocalDate invoiceDate;
        private LocalDate dueDate;
        private String currencyCode;
        private BigDecimal exchangeRate;
        private String placeOfSupply;
        private List<InvoiceItem> items;
        private BigDecimal subtotal;
        private BigDecimal totalDiscount;
        private BigDecimal taxableAmount;
        private BigDecimal totalCgst;
        private BigDecimal totalSgst;
        private BigDecimal totalIgst;
        private BigDecimal totalTax;
        private BigDecimal shippingCharges;
        private BigDecimal roundOff;
        private BigDecimal totalAmount;
        private BigDecimal totalAmountInr;
        private List<Payment> payments;
        private BigDecimal totalPaid;
        private BigDecimal balanceDue;
        private Invoice.PaymentStatus paymentStatus;
        private String notes;
        private String termsAndConditions;
        private LocalDateTime createdAt;
    }

    // ── Summary for list view ─────────────────────────────────────────────────
    @Data
    @Builder
    public static class InvoiceSummary {
        private String id;
        private String invoiceNumber;
        private String customerName;
        private LocalDate invoiceDate;
        private LocalDate dueDate;
        private String currencyCode;
        private BigDecimal totalAmount;
        private BigDecimal balanceDue;
        private Invoice.PaymentStatus paymentStatus;
        private Invoice.InvoiceType invoiceType;
    }

    // ── Dashboard sales stats ─────────────────────────────────────────────────
    @Data
    @Builder
    public static class SalesStats {
        private BigDecimal todaySales;
        private BigDecimal monthSales;
        private BigDecimal yearSales;
        private long totalInvoices;
        private long unpaidCount;
        private long overdueCount;
        private BigDecimal totalOutstanding;
    }
}