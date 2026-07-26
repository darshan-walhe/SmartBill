package com.BCSTech.SmartBill.accounts.service;

import com.BCSTech.SmartBill.accounts.dto.AccountsDTOs;
import com.BCSTech.SmartBill.accounts.dto.AccountsDTOs.*;
import com.BCSTech.SmartBill.accounts.model.JournalEntry;
import com.BCSTech.SmartBill.accounts.model.JournalEntry.ReferenceType;
import com.BCSTech.SmartBill.accounts.model.JournalLine;
import com.BCSTech.SmartBill.accounts.model.JournalLine.AccountType;
import com.BCSTech.SmartBill.accounts.repository.JournalEntryRepository;
import com.BCSTech.SmartBill.common.exception.AppException;
import com.BCSTech.SmartBill.invoice.model.Invoice;
import com.BCSTech.SmartBill.invoice.model.Payment;
import com.BCSTech.SmartBill.invoice.repository.InvoiceRepository;
import com.BCSTech.SmartBill.purchase.model.Purchase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AccountsService {

    private final JournalEntryRepository journalEntryRepository;
    private final InvoiceRepository      invoiceRepository;

    // ══════════════════════════════════════════════════════════════
    //  JOURNAL ENTRY — AUTO-POSTED FROM INVOICE / PURCHASE
    // ══════════════════════════════════════════════════════════════

    /**
     * Called by InvoiceService when a TAX_INVOICE is confirmed.
     * Posts: Dr Accounts Receivable / Cr Sales Revenue + GST Payable
     */
    public void postInvoiceEntry(String companyId, String userId, Invoice invoice) {
        List<JournalLine> lines = new ArrayList<>();

        // Dr — Accounts Receivable (full invoice amount)
        lines.add(JournalLine.builder()
                .id(UUID.randomUUID().toString())
                .accountType(AccountType.ACCOUNTS_RECEIVABLE)
                .accountName("Accounts Receivable — " + invoice.getCustomerName())
                .debitAmount(invoice.getTotalAmountInr())
                .creditAmount(BigDecimal.ZERO)
                .narration("Invoice " + invoice.getInvoiceNumber())
                .build());

        // Cr — Sales Revenue (taxable amount)
        lines.add(JournalLine.builder()
                .id(UUID.randomUUID().toString())
                .accountType(AccountType.SALES_REVENUE)
                .accountName("Sales Revenue")
                .debitAmount(BigDecimal.ZERO)
                .creditAmount(invoice.getTaxableAmount())
                .narration("Invoice " + invoice.getInvoiceNumber())
                .build());

        // Cr — CGST Payable
        if (invoice.getTotalCgst().compareTo(BigDecimal.ZERO) > 0) {
            lines.add(JournalLine.builder()
                    .id(UUID.randomUUID().toString())
                    .accountType(AccountType.CGST_PAYABLE)
                    .accountName("Output CGST Payable")
                    .debitAmount(BigDecimal.ZERO)
                    .creditAmount(invoice.getTotalCgst())
                    .narration("CGST on " + invoice.getInvoiceNumber())
                    .build());
        }

        // Cr — SGST Payable
        if (invoice.getTotalSgst().compareTo(BigDecimal.ZERO) > 0) {
            lines.add(JournalLine.builder()
                    .id(UUID.randomUUID().toString())
                    .accountType(AccountType.SGST_PAYABLE)
                    .accountName("Output SGST Payable")
                    .debitAmount(BigDecimal.ZERO)
                    .creditAmount(invoice.getTotalSgst())
                    .narration("SGST on " + invoice.getInvoiceNumber())
                    .build());
        }

        // Cr — IGST Payable
        if (invoice.getTotalIgst().compareTo(BigDecimal.ZERO) > 0) {
            lines.add(JournalLine.builder()
                    .id(UUID.randomUUID().toString())
                    .accountType(AccountType.IGST_PAYABLE)
                    .accountName("Output IGST Payable")
                    .debitAmount(BigDecimal.ZERO)
                    .creditAmount(invoice.getTotalIgst())
                    .narration("IGST on " + invoice.getInvoiceNumber())
                    .build());
        }

        // Cr — Shipping (if any) goes to Sales Revenue too
        if (invoice.getShippingCharges().compareTo(BigDecimal.ZERO) > 0) {
            lines.add(JournalLine.builder()
                    .id(UUID.randomUUID().toString())
                    .accountType(AccountType.INCOME)
                    .accountName("Shipping Income")
                    .debitAmount(BigDecimal.ZERO)
                    .creditAmount(invoice.getShippingCharges())
                    .narration("Shipping on " + invoice.getInvoiceNumber())
                    .build());
        }

        saveEntry(companyId, userId, invoice.getInvoiceDate(),
                ReferenceType.INVOICE, invoice.getId(),
                invoice.getInvoiceNumber(),
                "Sales Invoice — " + invoice.getCustomerName(),
                invoice.getTotalAmountInr(), lines);
    }

    /**
     * Called when payment is received on an invoice.
     * Posts: Dr Cash/Bank / Cr Accounts Receivable
     */
    public void postPaymentReceivedEntry(String companyId, String userId,
                                         Invoice invoice, Payment payment) {
        String cashAccount = getCashAccountName(payment.getPaymentMethod());

        List<JournalLine> lines = List.of(
                JournalLine.builder()
                        .id(UUID.randomUUID().toString())
                        .accountType(toCashAccountType(payment.getPaymentMethod()))
                        .accountName(cashAccount)
                        .debitAmount(payment.getAmountInr())
                        .creditAmount(BigDecimal.ZERO)
                        .narration("Payment from " + invoice.getCustomerName())
                        .build(),
                JournalLine.builder()
                        .id(UUID.randomUUID().toString())
                        .accountType(AccountType.ACCOUNTS_RECEIVABLE)
                        .accountName("Accounts Receivable — " + invoice.getCustomerName())
                        .debitAmount(BigDecimal.ZERO)
                        .creditAmount(payment.getAmountInr())
                        .narration("Against " + invoice.getInvoiceNumber())
                        .build()
        );

        saveEntry(companyId, userId, payment.getPaymentDate(),
                ReferenceType.PAYMENT_RECEIVED, invoice.getId(),
                invoice.getInvoiceNumber(),
                "Payment received — " + invoice.getCustomerName(),
                payment.getAmountInr(), lines);
    }

    /**
     * Called by PurchaseService when a purchase is confirmed.
     * Posts: Dr Purchase + Input GST / Cr Accounts Payable
     */
    public void postPurchaseEntry(String companyId, String userId, Purchase purchase) {
        List<JournalLine> lines = new ArrayList<>();

        // Dr — Purchase (taxable amount)
        lines.add(JournalLine.builder()
                .id(UUID.randomUUID().toString())
                .accountType(AccountType.PURCHASE)
                .accountName("Purchase — " + purchase.getSupplierName())
                .debitAmount(purchase.getSubtotal())
                .creditAmount(BigDecimal.ZERO)
                .narration("Purchase " + purchase.getPurchaseNumber())
                .build());

        // Dr — Input CGST
        if (purchase.getTotalCgst().compareTo(BigDecimal.ZERO) > 0) {
            lines.add(JournalLine.builder()
                    .id(UUID.randomUUID().toString())
                    .accountType(AccountType.INPUT_CGST)
                    .accountName("Input CGST Receivable")
                    .debitAmount(purchase.getTotalCgst())
                    .creditAmount(BigDecimal.ZERO)
                    .build());
        }

        // Dr — Input SGST
        if (purchase.getTotalSgst().compareTo(BigDecimal.ZERO) > 0) {
            lines.add(JournalLine.builder()
                    .id(UUID.randomUUID().toString())
                    .accountType(AccountType.INPUT_SGST)
                    .accountName("Input SGST Receivable")
                    .debitAmount(purchase.getTotalSgst())
                    .creditAmount(BigDecimal.ZERO)
                    .build());
        }

        // Dr — Input IGST
        if (purchase.getTotalIgst().compareTo(BigDecimal.ZERO) > 0) {
            lines.add(JournalLine.builder()
                    .id(UUID.randomUUID().toString())
                    .accountType(AccountType.INPUT_IGST)
                    .accountName("Input IGST Receivable")
                    .debitAmount(purchase.getTotalIgst())
                    .creditAmount(BigDecimal.ZERO)
                    .build());
        }

        // Cr — Accounts Payable (full amount)
        lines.add(JournalLine.builder()
                .id(UUID.randomUUID().toString())
                .accountType(AccountType.ACCOUNTS_PAYABLE)
                .accountName("Accounts Payable — " + purchase.getSupplierName())
                .debitAmount(BigDecimal.ZERO)
                .creditAmount(purchase.getTotalAmountInr())
                .narration("Purchase " + purchase.getPurchaseNumber())
                .build());

        saveEntry(companyId, userId, purchase.getPurchaseDate(),
                ReferenceType.PURCHASE, purchase.getId(),
                purchase.getPurchaseNumber(),
                "Purchase — " + purchase.getSupplierName(),
                purchase.getTotalAmountInr(), lines);
    }

    /**
     * Called when a payment is made to a supplier against a purchase.
     * Posts: Dr Accounts Payable / Cr Cash/Bank
     */
    public void postPaymentMadeEntry(String companyId, String userId, Purchase purchase,
                                     BigDecimal amountInr, String paymentMethod,
                                     LocalDate paymentDate) {
        Payment.PaymentMethod method = parsePaymentMethod(paymentMethod);
        String cashAccount = getCashAccountName(method);

        List<JournalLine> lines = List.of(
                JournalLine.builder()
                        .id(UUID.randomUUID().toString())
                        .accountType(AccountType.ACCOUNTS_PAYABLE)
                        .accountName("Accounts Payable — " + purchase.getSupplierName())
                        .debitAmount(amountInr)
                        .creditAmount(BigDecimal.ZERO)
                        .narration("Against " + purchase.getPurchaseNumber())
                        .build(),
                JournalLine.builder()
                        .id(UUID.randomUUID().toString())
                        .accountType(toCashAccountType(method))
                        .accountName(cashAccount)
                        .debitAmount(BigDecimal.ZERO)
                        .creditAmount(amountInr)
                        .narration("Payment to " + purchase.getSupplierName())
                        .build()
        );

        saveEntry(companyId, userId, paymentDate != null ? paymentDate : LocalDate.now(),
                ReferenceType.PAYMENT_MADE, purchase.getId(),
                purchase.getPurchaseNumber(),
                "Payment made — " + purchase.getSupplierName(),
                amountInr, lines);
    }

    /**
     * Called when a purchase return is created.
     * Posts the mirror image of postPurchaseEntry:
     * Dr Accounts Payable / Cr Purchase + Input GST
     */
    public void postPurchaseReturnEntry(String companyId, String userId, Purchase returnPurchase) {
        List<JournalLine> lines = new ArrayList<>();

        // Dr — Accounts Payable (reduce liability owed to supplier)
        lines.add(JournalLine.builder()
                .id(UUID.randomUUID().toString())
                .accountType(AccountType.ACCOUNTS_PAYABLE)
                .accountName("Accounts Payable — " + returnPurchase.getSupplierName())
                .debitAmount(returnPurchase.getTotalAmountInr())
                .creditAmount(BigDecimal.ZERO)
                .narration("Purchase return " + returnPurchase.getPurchaseNumber())
                .build());

        // Cr — Purchase (reduce expense)
        lines.add(JournalLine.builder()
                .id(UUID.randomUUID().toString())
                .accountType(AccountType.PURCHASE)
                .accountName("Purchase — " + returnPurchase.getSupplierName())
                .debitAmount(BigDecimal.ZERO)
                .creditAmount(returnPurchase.getSubtotal())
                .narration("Purchase return " + returnPurchase.getPurchaseNumber())
                .build());

        // Cr — Input GST (reduce recoverable input tax)
        if (returnPurchase.getTotalCgst().compareTo(BigDecimal.ZERO) > 0) {
            lines.add(JournalLine.builder()
                    .id(UUID.randomUUID().toString())
                    .accountType(AccountType.INPUT_CGST)
                    .accountName("Input CGST Receivable")
                    .debitAmount(BigDecimal.ZERO)
                    .creditAmount(returnPurchase.getTotalCgst())
                    .build());
        }
        if (returnPurchase.getTotalSgst().compareTo(BigDecimal.ZERO) > 0) {
            lines.add(JournalLine.builder()
                    .id(UUID.randomUUID().toString())
                    .accountType(AccountType.INPUT_SGST)
                    .accountName("Input SGST Receivable")
                    .debitAmount(BigDecimal.ZERO)
                    .creditAmount(returnPurchase.getTotalSgst())
                    .build());
        }
        if (returnPurchase.getTotalIgst().compareTo(BigDecimal.ZERO) > 0) {
            lines.add(JournalLine.builder()
                    .id(UUID.randomUUID().toString())
                    .accountType(AccountType.INPUT_IGST)
                    .accountName("Input IGST Receivable")
                    .debitAmount(BigDecimal.ZERO)
                    .creditAmount(returnPurchase.getTotalIgst())
                    .build());
        }

        saveEntry(companyId, userId, returnPurchase.getPurchaseDate(),
                ReferenceType.PURCHASE, returnPurchase.getId(),
                returnPurchase.getPurchaseNumber(),
                "Purchase return — " + returnPurchase.getSupplierName(),
                returnPurchase.getTotalAmountInr(), lines);
    }

    /**
     * Generic reversal — used when an invoice/purchase is cancelled after
     * being confirmed. Finds every journal entry posted against a reference
     * (the original transaction entry, plus any payment entries against it)
     * and posts a mirror entry with debit/credit swapped, so the net effect
     * on every account touched nets to zero.
     */
    public void reverseEntriesForReference(String companyId, String userId,
                                           String referenceId, LocalDate reversalDate,
                                           String description) {
        List<JournalEntry> originals =
                journalEntryRepository.findByCompanyIdAndReferenceId(companyId, referenceId);

        for (JournalEntry original : originals) {
            List<JournalLine> reversedLines = original.getLines().stream()
                    .map(l -> JournalLine.builder()
                            .id(UUID.randomUUID().toString())
                            .accountType(l.getAccountType())
                            .accountName(l.getAccountName())
                            .debitAmount(l.getCreditAmount())
                            .creditAmount(l.getDebitAmount())
                            .narration("Reversal — " + (l.getNarration() != null ? l.getNarration() : ""))
                            .build())
                    .collect(Collectors.toList());

            saveEntry(companyId, userId, reversalDate,
                    original.getReferenceType(), referenceId, original.getReferenceNumber(),
                    description, original.getTotalAmount(), reversedLines);
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  MANUAL JOURNAL ENTRY
    // ══════════════════════════════════════════════════════════════
    public JournalEntryResponse postManual(String companyId, String userId,
                                           JournalRequest request) {
        // Validate double-entry rule: sum(Dr) == sum(Cr)
        BigDecimal totalDr = request.getLines().stream()
                .map(l -> l.getDebitAmount() != null ? l.getDebitAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCr = request.getLines().stream()
                .map(l -> l.getCreditAmount() != null ? l.getCreditAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalDr.compareTo(totalCr) != 0) {
            throw AppException.badRequest(
                    "Journal entry is not balanced. Total Debit: ₹" + totalDr +
                            " ≠ Total Credit: ₹" + totalCr);
        }

        List<JournalLine> lines = request.getLines().stream()
                .map(l -> JournalLine.builder()
                        .id(UUID.randomUUID().toString())
                        .accountType(l.getAccountType())
                        .accountName(l.getAccountName())
                        .debitAmount(l.getDebitAmount() != null
                                ? l.getDebitAmount() : BigDecimal.ZERO)
                        .creditAmount(l.getCreditAmount() != null
                                ? l.getCreditAmount() : BigDecimal.ZERO)
                        .narration(l.getNarration())
                        .build())
                .collect(Collectors.toList());

        JournalEntry entry = saveEntry(companyId, userId,
                request.getEntryDate(), ReferenceType.MANUAL,
                null, null, request.getDescription(), totalDr, lines);

        return toResponse(entry);
    }

    // ══════════════════════════════════════════════════════════════
    //  CASH BOOK
    // ══════════════════════════════════════════════════════════════
    public CashBookResponse getCashBook(String companyId,
                                        LocalDate from, LocalDate to) {
        List<JournalEntry> entries = journalEntryRepository
                .findByCompanyIdAndEntryDateBetweenOrderByEntryDateAsc(
                        companyId, from, to);

        List<BookEntry> bookEntries = new ArrayList<>();
        BigDecimal runningBalance = BigDecimal.ZERO;
        BigDecimal totalDebit    = BigDecimal.ZERO;
        BigDecimal totalCredit   = BigDecimal.ZERO;

        for (JournalEntry entry : entries) {
            // Cash movements = lines with CASH or BANK account type
            for (JournalLine line : entry.getLines()) {
                if (line.getAccountType() == AccountType.CASH
                        || line.getAccountType() == AccountType.BANK) {

                    BigDecimal debit  = line.getDebitAmount();
                    BigDecimal credit = line.getCreditAmount();

                    runningBalance = runningBalance.add(debit).subtract(credit);
                    totalDebit     = totalDebit.add(debit);
                    totalCredit    = totalCredit.add(credit);

                    bookEntries.add(BookEntry.builder()
                            .date(entry.getEntryDate())
                            .particulars(entry.getDescription())
                            .voucherType(entry.getReferenceType().name())
                            .voucherNumber(entry.getReferenceNumber() != null
                                    ? entry.getReferenceNumber() : entry.getId())
                            .debit(debit.compareTo(BigDecimal.ZERO) > 0 ? debit : null)
                            .credit(credit.compareTo(BigDecimal.ZERO) > 0 ? credit : null)
                            .balance(runningBalance)
                            .build());
                }
            }
        }

        return CashBookResponse.builder()
                .from(from)
                .to(to)
                .openingBalance(BigDecimal.ZERO)
                .totalDebit(totalDebit)
                .totalCredit(totalCredit)
                .closingBalance(runningBalance)
                .entries(bookEntries)
                .build();
    }

    // ══════════════════════════════════════════════════════════════
    //  PROFIT & LOSS REPORT
    // ══════════════════════════════════════════════════════════════
    public ProfitLossReport getProfitLoss(String companyId,
                                          LocalDate from, LocalDate to) {
        List<JournalEntry> entries = journalEntryRepository
                .findByCompanyIdAndEntryDateBetweenOrderByEntryDateAsc(
                        companyId, from, to);

        BigDecimal totalSales       = BigDecimal.ZERO;
        BigDecimal totalOtherIncome = BigDecimal.ZERO;
        BigDecimal totalPurchases   = BigDecimal.ZERO;
        BigDecimal totalExpenses    = BigDecimal.ZERO;

        for (JournalEntry entry : entries) {
            for (JournalLine line : entry.getLines()) {
                switch (line.getAccountType()) {
                    case SALES_REVENUE ->
                            totalSales = totalSales.add(line.getCreditAmount());
                    case INCOME ->
                            totalOtherIncome = totalOtherIncome.add(line.getCreditAmount());
                    case PURCHASE ->
                            totalPurchases = totalPurchases.add(line.getDebitAmount());
                    case EXPENSE ->
                            totalExpenses = totalExpenses.add(line.getDebitAmount());
                    default -> {}
                }
            }
        }

        BigDecimal grossIncome   = totalSales.add(totalOtherIncome);
        BigDecimal grossExpenses = totalPurchases.add(totalExpenses);
        BigDecimal netProfit     = grossIncome.subtract(grossExpenses)
                .setScale(2, RoundingMode.HALF_UP);

        return ProfitLossReport.builder()
                .from(from).to(to)
                .totalSales(totalSales)
                .totalOtherIncome(totalOtherIncome)
                .grossIncome(grossIncome)
                .totalPurchases(totalPurchases)
                .totalExpenses(totalExpenses)
                .grossExpenses(grossExpenses)
                .netProfit(netProfit.abs())
                .isProfit(netProfit.compareTo(BigDecimal.ZERO) >= 0)
                .build();
    }

    // ══════════════════════════════════════════════════════════════
    //  TRIAL BALANCE
    // ══════════════════════════════════════════════════════════════
    public TrialBalanceReport getTrialBalance(String companyId, LocalDate asOf) {
        List<JournalEntry> entries = journalEntryRepository
                .findByCompanyIdAndEntryDateBetweenOrderByEntryDateAsc(
                        companyId, LocalDate.of(2000, 1, 1), asOf);

        // Aggregate by account type
        Map<AccountType, BigDecimal[]> totals = new LinkedHashMap<>();

        for (JournalEntry entry : entries) {
            for (JournalLine line : entry.getLines()) {
                totals.computeIfAbsent(line.getAccountType(),
                        k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
                totals.get(line.getAccountType())[0] =
                        totals.get(line.getAccountType())[0].add(line.getDebitAmount());
                totals.get(line.getAccountType())[1] =
                        totals.get(line.getAccountType())[1].add(line.getCreditAmount());
            }
        }

        BigDecimal grandDr = BigDecimal.ZERO;
        BigDecimal grandCr = BigDecimal.ZERO;
        List<TrialBalanceLine> lines = new ArrayList<>();

        for (Map.Entry<AccountType, BigDecimal[]> e : totals.entrySet()) {
            BigDecimal dr  = e.getValue()[0];
            BigDecimal cr  = e.getValue()[1];
            BigDecimal net = dr.subtract(cr);

            grandDr = grandDr.add(dr);
            grandCr = grandCr.add(cr);

            lines.add(TrialBalanceLine.builder()
                    .accountType(e.getKey())
                    .accountName(e.getKey().name().replace('_', ' '))
                    .debitTotal(dr)
                    .creditTotal(cr)
                    .netBalance(net)
                    .build());
        }

        return TrialBalanceReport.builder()
                .asOfDate(asOf)
                .lines(lines)
                .totalDebit(grandDr)
                .totalCredit(grandCr)
                .isBalanced(grandDr.compareTo(grandCr) == 0)
                .build();
    }

    // ══════════════════════════════════════════════════════════════
    //  JOURNAL ENTRY LIST
    // ══════════════════════════════════════════════════════════════
    public Page<JournalEntryResponse> list(String companyId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("entryDate").descending());
        return journalEntryRepository
                .findByCompanyIdOrderByEntryDateDesc(companyId, pageable)
                .map(this::toResponse);
    }

    public JournalEntryResponse getById(String entryId, String companyId) {
        return toResponse(journalEntryRepository.findByIdAndCompanyId(entryId, companyId)
                .orElseThrow(() -> AppException.notFound("Journal entry not found")));
    }

    // ══════════════════════════════════════════════════════════════
    //  PRIVATE HELPERS
    // ══════════════════════════════════════════════════════════════
    private JournalEntry saveEntry(String companyId, String userId,
                                   LocalDate date, ReferenceType refType,
                                   String refId, String refNumber,
                                   String description, BigDecimal amount,
                                   List<JournalLine> lines) {
        JournalEntry entry = JournalEntry.builder()
                .companyId(companyId)
                .entryDate(date)
                .referenceType(refType)
                .referenceId(refId)
                .referenceNumber(refNumber)
                .description(description)
                .totalAmount(amount)
                .lines(lines)
                .createdBy(userId)
                .build();

        entry = journalEntryRepository.save(entry);
        log.info("Journal entry posted: {} ref: {}", entry.getId(), refNumber);
        return entry;
    }

    private String getCashAccountName(Payment.PaymentMethod method) {
        return switch (method) {
            case CASH         -> "Cash Account";
            case UPI          -> "UPI — Bank Account";
            case CARD         -> "Card — Bank Account";
            case BANK_TRANSFER-> "Bank Account";
            case INTERNATIONAL-> "International — Bank Account";
            case CHEQUE       -> "Cheque — Bank Account";
        };
    }

    private AccountType toCashAccountType(Payment.PaymentMethod method) {
        return switch (method) {
            case CASH -> AccountType.CASH;
            default   -> AccountType.BANK;
        };
    }

    // Supplier payment method arrives as a free-text string from the DTO —
    // fall back to BANK_TRANSFER for anything blank/unrecognized rather than fail the payment.
    private Payment.PaymentMethod parsePaymentMethod(String raw) {
        if (raw == null || raw.isBlank()) return Payment.PaymentMethod.BANK_TRANSFER;
        try {
            return Payment.PaymentMethod.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            log.warn("Unrecognized supplier payment method '{}', defaulting to BANK_TRANSFER", raw);
            return Payment.PaymentMethod.BANK_TRANSFER;
        }
    }

    private JournalEntryResponse toResponse(JournalEntry e) {
        return JournalEntryResponse.builder()
                .id(e.getId())
                .entryDate(e.getEntryDate())
                .referenceType(e.getReferenceType())
                .referenceId(e.getReferenceId())
                .referenceNumber(e.getReferenceNumber())
                .description(e.getDescription())
                .totalAmount(e.getTotalAmount())
                .lines(e.getLines())
                .createdAt(e.getCreatedAt())
                .build();
    }
}