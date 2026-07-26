package com.BCSTech.SmartBill.accounts.model;

import lombok.*;
import org.springframework.data.annotation.Id;

import java.math.BigDecimal;

/**
 * Single debit or credit line inside a JournalEntry.
 * Rule: Sum of all debit amounts must equal sum of all credit amounts.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JournalLine {

    @Id
    private String id;

    private AccountType accountType;

    private String accountName;

    @Builder.Default
    private BigDecimal debitAmount  = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal creditAmount = BigDecimal.ZERO;

    private String narration;

    // ── Account types ─────────────────────────────────────────────────────────
    public enum AccountType {
        CASH,
        BANK,
        ACCOUNTS_RECEIVABLE,
        ACCOUNTS_PAYABLE,
        SALES_REVENUE,
        PURCHASE,
        CGST_PAYABLE,
        SGST_PAYABLE,
        IGST_PAYABLE,
        INPUT_CGST,
        INPUT_SGST,
        INPUT_IGST,
        EXPENSE,
        INCOME,
        DISCOUNT_GIVEN,
        DISCOUNT_RECEIVED,
        STOCK,
        CAPITAL,
        DRAWING
    }
}