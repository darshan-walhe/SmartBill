package com.BCSTech.SmartBill.accounts.model;

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
@Document(collection = "journal_entries")
@CompoundIndexes({
        @CompoundIndex(name = "company_date",      def = "{'companyId': 1, 'entryDate': -1}"),
        @CompoundIndex(name = "company_ref",       def = "{'companyId': 1, 'referenceType': 1}"),
        @CompoundIndex(name = "company_ref_id",    def = "{'companyId': 1, 'referenceId': 1}")
})
public class JournalEntry {

    @Id
    private String id;

    @Indexed
    private String companyId;

    private LocalDate entryDate;

    // What triggered this entry
    private ReferenceType referenceType;

    // ID of the invoice / purchase / payment that triggered this
    private String referenceId;

    // Human readable: INV-2024-0001 / PUR-2024-0001
    private String referenceNumber;

    private String description;

    // Total amount (Dr = Cr always)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    // Lines — embedded
    @Builder.Default
    private List<JournalLine> lines = new ArrayList<>();

    private String createdBy;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    // ── Reference types ───────────────────────────────────────────────────────
    public enum ReferenceType {
        INVOICE,           // sale invoice
        PAYMENT_RECEIVED,  // customer payment
        PURCHASE,          // purchase entry
        PAYMENT_MADE,      // supplier payment
        EXPENSE,           // direct expense entry
        INCOME,            // direct income entry
        MANUAL             // manually posted journal
    }
}