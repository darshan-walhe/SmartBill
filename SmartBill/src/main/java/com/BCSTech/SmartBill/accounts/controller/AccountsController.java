package com.BCSTech.SmartBill.accounts.controller;

import com.BCSTech.SmartBill.accounts.dto.AccountsDTOs.*;
import com.BCSTech.SmartBill.accounts.service.AccountsService;
import com.BCSTech.SmartBill.common.dto.ApiResponse;
import com.BCSTech.SmartBill.common.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountsController {

    private final AccountsService accountsService;

    // ── POST /api/accounts/journal ────────────────────────────────────────────
    // Post a manual journal entry (must be balanced — Dr = Cr)
    @PostMapping("/journal")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<JournalEntryResponse>> postJournal(
            @Valid @RequestBody JournalRequest request,
            @CurrentUser CurrentUser.AuthUser authUser) {

        JournalEntryResponse response = accountsService.postManual(
                authUser.getCompanyId(), authUser.getUserId(), request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Journal entry posted successfully", response));
    }

    // ── GET /api/accounts/journal ─────────────────────────────────────────────
    // List all journal entries paginated
    @GetMapping("/journal")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','MANAGER')")
    public ResponseEntity<ApiResponse<Page<JournalEntryResponse>>> listJournal(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @CurrentUser CurrentUser.AuthUser authUser) {

        Page<JournalEntryResponse> entries = accountsService.list(
                authUser.getCompanyId(), page, size);

        return ResponseEntity.ok(ApiResponse.success("Journal entries fetched", entries));
    }

    // ── GET /api/accounts/journal/{id} ───────────────────────────────────────
    @GetMapping("/journal/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','MANAGER')")
    public ResponseEntity<ApiResponse<JournalEntryResponse>> getJournalById(
            @PathVariable String id,
            @CurrentUser CurrentUser.AuthUser authUser) {

        JournalEntryResponse response = accountsService.getById(id, authUser.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success("Journal entry fetched", response));
    }

    // ── GET /api/accounts/cash-book ───────────────────────────────────────────
    // Cash book — all cash/bank movements in date range with running balance
    // ?from=2024-06-01&to=2024-06-30
    @GetMapping("/cash-book")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','MANAGER')")
    public ResponseEntity<ApiResponse<CashBookResponse>> getCashBook(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @CurrentUser CurrentUser.AuthUser authUser) {

        LocalDate dateFrom = from != null ? from : LocalDate.now().withDayOfMonth(1);
        LocalDate dateTo   = to   != null ? to   : LocalDate.now();

        CashBookResponse response = accountsService.getCashBook(
                authUser.getCompanyId(), dateFrom, dateTo);

        return ResponseEntity.ok(ApiResponse.success("Cash book fetched", response));
    }

    // ── GET /api/accounts/profit-loss ─────────────────────────────────────────
    // Profit & Loss report for a date range
    // ?from=2024-04-01&to=2024-03-31
    @GetMapping("/profit-loss")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<ProfitLossReport>> getProfitLoss(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @CurrentUser CurrentUser.AuthUser authUser) {

        // Default: current financial year (April to March)
        LocalDate now      = LocalDate.now();
        LocalDate dateFrom = from != null ? from
                : (now.getMonthValue() >= 4
                ? LocalDate.of(now.getYear(), 4, 1)
                : LocalDate.of(now.getYear() - 1, 4, 1));
        LocalDate dateTo   = to != null ? to : now;

        ProfitLossReport report = accountsService.getProfitLoss(
                authUser.getCompanyId(), dateFrom, dateTo);

        return ResponseEntity.ok(ApiResponse.success("P&L report fetched", report));
    }

    // ── GET /api/accounts/trial-balance ──────────────────────────────────────
    // Trial balance as of a given date
    // ?asOf=2024-06-30
    @GetMapping("/trial-balance")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<TrialBalanceReport>> getTrialBalance(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOf,
            @CurrentUser CurrentUser.AuthUser authUser) {

        LocalDate asOfDate = asOf != null ? asOf : LocalDate.now();

        TrialBalanceReport report = accountsService.getTrialBalance(
                authUser.getCompanyId(), asOfDate);

        return ResponseEntity.ok(ApiResponse.success("Trial balance fetched", report));
    }
}