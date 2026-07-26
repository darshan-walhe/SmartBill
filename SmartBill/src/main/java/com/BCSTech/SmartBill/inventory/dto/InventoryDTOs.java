package com.BCSTech.SmartBill.inventory.dto;

import com.BCSTech.SmartBill.inventory.model.StockLedger;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

public class InventoryDTOs {

    // ── Manual stock adjustment request ───────────────────────────────────────
    @Data
    public static class AdjustmentRequest {

        @NotBlank(message = "Product ID is required")
        private String productId;

        @NotNull(message = "Adjustment type is required")
        private StockLedger.TransactionType type;  // ADJUSTMENT_IN or ADJUSTMENT_OUT

        @Min(value = 1, message = "Quantity must be at least 1")
        private int quantity;

        private String notes;
    }

    // ── Stock transfer request ─────────────────────────────────────────────────
    @Data
    public static class TransferRequest {

        @NotBlank(message = "Product ID is required")
        private String productId;

        @Min(value = 1, message = "Quantity must be at least 1")
        private int quantity;

        private String notes;
    }

    // ── Stock ledger entry response ────────────────────────────────────────────
    @Data
    @Builder
    public static class StockLedgerResponse {
        private String id;
        private String productId;
        private String productName;
        private String productSku;
        private StockLedger.TransactionType transactionType;
        private int quantity;
        private int balanceAfter;
        private StockLedger.ReferenceType referenceType;
        private String referenceId;
        private String referenceNumber;
        private String notes;
        private LocalDateTime createdAt;
    }

    // ── Mapper ────────────────────────────────────────────────────────────────
    public static StockLedgerResponse toResponse(StockLedger s) {
        return StockLedgerResponse.builder()
                .id(s.getId())
                .productId(s.getProductId())
                .productName(s.getProductName())
                .productSku(s.getProductSku())
                .transactionType(s.getTransactionType())
                .quantity(s.getQuantity())
                .balanceAfter(s.getBalanceAfter())
                .referenceType(s.getReferenceType())
                .referenceId(s.getReferenceId())
                .referenceNumber(s.getReferenceNumber())
                .notes(s.getNotes())
                .createdAt(s.getCreatedAt())
                .build();
    }
}