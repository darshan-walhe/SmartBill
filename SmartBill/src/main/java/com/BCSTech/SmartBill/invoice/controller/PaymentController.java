package com.BCSTech.SmartBill.invoice.controller;

import com.BCSTech.SmartBill.common.dto.ApiResponse;
import com.BCSTech.SmartBill.common.security.CurrentUser;
import com.BCSTech.SmartBill.invoice.dto.InvoiceDTOs.InvoiceResponse;
import com.BCSTech.SmartBill.invoice.dto.InvoiceDTOs.PaymentRequest;
import com.BCSTech.SmartBill.invoice.service.PaymentService;
import com.BCSTech.SmartBill.invoice.service.PaymentService.PaymentMethodStat;
import com.BCSTech.SmartBill.invoice.service.PaymentService.PaymentRecord;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    // ── POST /api/invoices/{invoiceId}/payment ────────────────────────────────
    // Record payment against an invoice — full or partial
    // (Also accessible via InvoiceController — this is an alternate explicit route)
    @PostMapping("/api/invoices/{invoiceId}/payments")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','STAFF','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> recordPayment(
            @PathVariable String invoiceId,
            @Valid @RequestBody PaymentRequest request,
            @CurrentUser CurrentUser.AuthUser authUser) {

        InvoiceResponse response = paymentService.recordPayment(
                invoiceId, authUser.getCompanyId(), authUser.getUserId(), request);

        return ResponseEntity.ok(ApiResponse.success("Payment recorded successfully", response));
    }

    // ── GET /api/payments/customer/{customerId} ───────────────────────────────
    // All payments received from a specific customer
    // Used in Customer Ledger screen
    @GetMapping("/api/payments/customer/{customerId}")
    public ResponseEntity<ApiResponse<List<PaymentRecord>>> getCustomerPayments(
            @PathVariable String customerId,
            @CurrentUser CurrentUser.AuthUser authUser) {

        List<PaymentRecord> payments = paymentService.getCustomerPayments(
                authUser.getCompanyId(), customerId);

        return ResponseEntity.ok(ApiResponse.success("Customer payments fetched", payments));
    }

    // ── GET /api/payments/breakdown ───────────────────────────────────────────
    // Payment method breakdown (Cash, UPI, Card, Bank, International)
    // Used in Dashboard donut chart
    // ?from=2024-06-01&to=2024-06-30
    @GetMapping("/api/payments/breakdown")
    public ResponseEntity<ApiResponse<List<PaymentMethodStat>>> getMethodBreakdown(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @CurrentUser CurrentUser.AuthUser authUser) {

        // Default to current month if no dates provided
        LocalDate dateFrom = from != null ? from : LocalDate.now().withDayOfMonth(1);
        LocalDate dateTo   = to   != null ? to   : LocalDate.now();

        List<PaymentMethodStat> breakdown = paymentService.getMethodBreakdown(
                authUser.getCompanyId(), dateFrom, dateTo);

        return ResponseEntity.ok(ApiResponse.success("Payment breakdown fetched", breakdown));
    }

    // ── GET /api/payments/total ───────────────────────────────────────────────
    // Total collected in a date range — used in cash book + dashboard
    // ?from=2024-06-01&to=2024-06-30
    @GetMapping("/api/payments/total")
    public ResponseEntity<ApiResponse<BigDecimal>> getTotalCollected(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @CurrentUser CurrentUser.AuthUser authUser) {

        LocalDate dateFrom = from != null ? from : LocalDate.now().withDayOfMonth(1);
        LocalDate dateTo   = to   != null ? to   : LocalDate.now();

        BigDecimal total = paymentService.getTotalCollected(
                authUser.getCompanyId(), dateFrom, dateTo);

        return ResponseEntity.ok(ApiResponse.success("Total collected fetched", total));
    }

    // ── GET /api/payments?from=&to= ───────────────────────────────────────────
    // All payments in date range — used in Cash Book (Accounts module)
    @GetMapping("/api/payments")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<List<PaymentRecord>>> getPaymentsInRange(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @CurrentUser CurrentUser.AuthUser authUser) {

        LocalDate dateFrom = from != null ? from : LocalDate.now().withDayOfMonth(1);
        LocalDate dateTo   = to   != null ? to   : LocalDate.now();

        List<PaymentRecord> payments = paymentService.getPaymentsInRange(
                authUser.getCompanyId(), dateFrom, dateTo);

        return ResponseEntity.ok(ApiResponse.success("Payments fetched", payments));
    }
}