package com.BCSTech.SmartBill.purchase.dto;

import com.BCSTech.SmartBill.purchase.model.Purchase;
import com.BCSTech.SmartBill.purchase.model.PurchaseItem;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class PurchaseDTOs {

    // ── Line item request ─────────────────────────────────────────────────────
    @Data
    public static class ItemRequest {

        @NotBlank(message = "Product ID is required")
        private String productId;

        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity;

        @NotNull(message = "Unit price is required")
        @DecimalMin(value = "0.0", message = "Unit price must be 0 or more")
        private BigDecimal unitPrice;

        // Optional override — defaults to product taxRate
        private BigDecimal taxRate;
    }

    // ── Create purchase request ───────────────────────────────────────────────
    @Data
    public static class SaveRequest {

        @NotBlank(message = "Supplier ID is required")
        private String supplierId;

        private String supplierInvoiceNumber;

        @NotNull(message = "Purchase date is required")
        private LocalDate purchaseDate;

        private LocalDate dueDate;

        private String currencyCode = "INR";

        private BigDecimal exchangeRate;

        @NotEmpty(message = "Purchase must have at least one item")
        @Valid
        private List<ItemRequest> items;

        private String notes;

        private boolean saveAsDraft = false;
    }

    // ── Supplier payment request ──────────────────────────────────────────────
    @Data
    public static class SupplierPaymentRequest {

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
        private BigDecimal amount;

        @NotBlank(message = "Payment method is required")
        private String paymentMethod;

        private String transactionReference;

        private LocalDate paymentDate;

        private String notes;
    }

    // ── Purchase return request ───────────────────────────────────────────────
    @Data
    public static class ReturnRequest {

        @NotBlank(message = "Original purchase ID is required")
        private String purchaseId;

        @NotBlank(message = "Return reason is required")
        private String returnReason;

        @NotEmpty(message = "Return must have at least one item")
        @Valid
        private List<ItemRequest> items;
    }

    // ── Full purchase response ────────────────────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PurchaseResponse {
        private String id;
        private String companyId;
        private String supplierId;
        private String supplierName;
        private String supplierGstin;
        private String purchaseNumber;
        private String supplierInvoiceNumber;
        private LocalDate purchaseDate;
        private LocalDate dueDate;
        private String currencyCode;
        private BigDecimal exchangeRate;
        private List<PurchaseItem> items;
        private BigDecimal subtotal;
        private BigDecimal totalCgst;
        private BigDecimal totalSgst;
        private BigDecimal totalIgst;
        private BigDecimal totalTax;
        private BigDecimal totalAmount;
        private BigDecimal totalAmountInr;
        private BigDecimal totalPaid;
        private BigDecimal balanceDue;
        private Purchase.PaymentStatus paymentStatus;
        private boolean isReturn;
        private String returnOfPurchaseId;
        private String returnReason;
        private String notes;
        private LocalDateTime createdAt;
    }

    // ── Summary for list view ─────────────────────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PurchaseSummary {
        private String id;
        private String purchaseNumber;
        private String supplierName;
        private LocalDate purchaseDate;
        private LocalDate dueDate;
        private BigDecimal totalAmount;
        private BigDecimal balanceDue;
        private Purchase.PaymentStatus paymentStatus;
        private boolean isReturn;
    }

    // ── Purchase stats for dashboard ──────────────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PurchaseStats {
        private BigDecimal todayPurchases;
        private BigDecimal monthPurchases;
        private BigDecimal totalPayable;
        private long unpaidCount;
    }
}