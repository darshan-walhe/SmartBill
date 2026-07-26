package com.BCSTech.SmartBill.inventory.model;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "stock_ledger")
@CompoundIndexes({
        @CompoundIndex(name = "product_date", def = "{'productId': 1, 'createdAt': -1}"),
        @CompoundIndex(name = "company_date", def = "{'companyId': 1, 'createdAt': -1}")
})
public class StockLedger {

    @Id
    private String id;

    @Indexed
    private String companyId;

    @Indexed
    private String productId;

    private String productName;   // denormalized — avoids join on every read

    private String productSku;

    private TransactionType transactionType;

    // +ve = stock in, -ve = stock out
    private int quantity;

    // Stock level after this transaction
    private int balanceAfter;

    // What caused this movement
    private ReferenceType referenceType;

    // ID of the invoice/purchase/adjustment that caused this
    private String referenceId;

    // Human readable reference number e.g. "INV-2024-0891"
    private String referenceNumber;

    private String notes;

    private String createdBy;

    @CreatedDate
    private LocalDateTime createdAt;

    // ── Enums ─────────────────────────────────────────────────────────────────
    public enum TransactionType {
        OPENING,        // opening stock on product creation
        PURCHASE,       // stock in from purchase entry
        SALE,           // stock out from invoice
        PURCHASE_RETURN, // stock out — returned to supplier
        SALE_RETURN,    // stock in — returned by customer
        ADJUSTMENT_IN,  // manual stock increase
        ADJUSTMENT_OUT, // manual stock decrease
        TRANSFER_IN,    // stock transferred from another location
        TRANSFER_OUT    // stock transferred to another location
    }

    public enum ReferenceType {
        INVOICE,
        PURCHASE,
        MANUAL_ADJUSTMENT,
        OPENING_STOCK,
        TRANSFER
    }
}