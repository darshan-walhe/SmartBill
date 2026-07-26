package com.BCSTech.SmartBill.accounts.dto;

import com.BCSTech.SmartBill.accounts.model.JournalEntry;
import com.BCSTech.SmartBill.accounts.model.JournalLine;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class AccountsDTOs {

    // ── Manual journal entry request ──────────────────────────────────────────
    @Data
    public static class JournalRequest {

        @NotNull(message = "Entry date is required")
        private LocalDate entryDate;

        @NotBlank(message = "Description is required")
        private String description;

        @NotEmpty(message = "At least two lines are required")
        @Valid
        private List<LineRequest> lines;
    }

    @Data
    public static class LineRequest {

        @NotNull(message = "Account type is required")
        private JournalLine.AccountType accountType;

        @NotBlank(message = "Account name is required")
        private String accountName;

        private BigDecimal debitAmount  = BigDecimal.ZERO;
        private BigDecimal creditAmount = BigDecimal.ZERO;

        private String narration;
    }

    // ── Journal entry response ────────────────────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class JournalEntryResponse {
        private String id;
        private LocalDate entryDate;
        private JournalEntry.ReferenceType referenceType;
        private String referenceId;
        private String referenceNumber;
        private String description;
        private BigDecimal totalAmount;
        private List<JournalLine> lines;
        private LocalDateTime createdAt;
    }

    // ── Cash book / Bank book entry ───────────────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BookEntry {
        private LocalDate date;
        private String particulars;
        private String voucherType;
        private String voucherNumber;
        private BigDecimal debit;    // cash/bank in
        private BigDecimal credit;   // cash/bank out
        private BigDecimal balance;  // running balance
    }

    // ── Cash book response ────────────────────────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CashBookResponse {
        private LocalDate from;
        private LocalDate to;
        private BigDecimal openingBalance;
        private BigDecimal totalDebit;
        private BigDecimal totalCredit;
        private BigDecimal closingBalance;
        private List<BookEntry> entries;
    }

    // ── P&L Report ────────────────────────────────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProfitLossReport {
        private LocalDate from;
        private LocalDate to;

        // Income
        private BigDecimal totalSales;
        private BigDecimal totalOtherIncome;
        private BigDecimal grossIncome;

        // Expenses
        private BigDecimal totalPurchases;
        private BigDecimal totalExpenses;
        private BigDecimal grossExpenses;

        // Result
        private BigDecimal netProfit;   // positive = profit, negative = loss
        private boolean isProfit;
    }

    // ── Trial Balance ─────────────────────────────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrialBalanceReport {
        private LocalDate asOfDate;
        private List<TrialBalanceLine> lines;
        private BigDecimal totalDebit;
        private BigDecimal totalCredit;
        private boolean isBalanced;   // totalDebit == totalCredit
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TrialBalanceLine {
        private String accountName;
        private JournalLine.AccountType accountType;
        private BigDecimal debitTotal;
        private BigDecimal creditTotal;
        private BigDecimal netBalance; // debit - credit
    }

    // ── Dashboard accounts summary ────────────────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AccountsSummary {
        private BigDecimal cashBalance;
        private BigDecimal totalReceivable;
        private BigDecimal totalPayable;
        private BigDecimal netProfit;
        private BigDecimal totalSalesThisMonth;
        private BigDecimal totalPurchasesThisMonth;
        private BigDecimal totalExpensesThisMonth;
    }
}