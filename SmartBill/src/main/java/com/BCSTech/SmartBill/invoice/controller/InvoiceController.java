package com.BCSTech.SmartBill.invoice.controller;

import com.BCSTech.SmartBill.common.dto.ApiResponse;
import com.BCSTech.SmartBill.common.security.CurrentUser;
import com.BCSTech.SmartBill.invoice.dto.InvoiceDTOs.*;
import com.BCSTech.SmartBill.invoice.service.InvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    // ── POST /api/invoices ────────────────────────────────────────────────────
    // Create invoice — pass saveAsDraft:true to save without stock deduction
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','STAFF')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> create(
            @Valid @RequestBody SaveRequest request,
            @CurrentUser CurrentUser.AuthUser authUser) {

        InvoiceResponse response = invoiceService.create(
                authUser.getCompanyId(), authUser.getUserId(), request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Invoice created successfully", response));
    }

    // ── GET /api/invoices ─────────────────────────────────────────────────────
    // List invoices with optional filters
    // ?keyword=INV-2024&status=UNPAID&customerId=xxx&page=0&size=10
    @GetMapping
    public ResponseEntity<ApiResponse<Page<InvoiceSummary>>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @CurrentUser CurrentUser.AuthUser authUser) {

        Page<InvoiceSummary> invoices = invoiceService.list(
                authUser.getCompanyId(), keyword, status, customerId, page, size);

        return ResponseEntity.ok(ApiResponse.success("Invoices fetched successfully", invoices));
    }

    // ── GET /api/invoices/{id} ────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getById(
            @PathVariable String id,
            @CurrentUser CurrentUser.AuthUser authUser) {

        InvoiceResponse response = invoiceService.getById(id, authUser.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success("Invoice fetched successfully", response));
    }

    // ── POST /api/invoices/{id}/confirm ──────────────────────────────────────
    // Confirm a DRAFT invoice — deducts stock + updates customer balance
    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','STAFF')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> confirmDraft(
            @PathVariable String id,
            @CurrentUser CurrentUser.AuthUser authUser) {

        InvoiceResponse response = invoiceService.confirmDraft(
                id, authUser.getCompanyId(), authUser.getUserId());

        return ResponseEntity.ok(ApiResponse.success("Invoice confirmed successfully", response));
    }

    // ── POST /api/invoices/{id}/payment ──────────────────────────────────────
    // Record a payment (full or partial) against an invoice
    @PostMapping("/{id}/payment")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','STAFF','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> recordPayment(
            @PathVariable String id,
            @Valid @RequestBody PaymentRequest request,
            @CurrentUser CurrentUser.AuthUser authUser) {

        InvoiceResponse response = invoiceService.recordPayment(
                id, authUser.getCompanyId(), authUser.getUserId(), request);

        return ResponseEntity.ok(ApiResponse.success("Payment recorded successfully", response));
    }

    // ── POST /api/invoices/{id}/cancel ───────────────────────────────────────
    // Cancel invoice — reverses stock and customer balance
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<InvoiceResponse>> cancel(
            @PathVariable String id,
            @CurrentUser CurrentUser.AuthUser authUser) {

        InvoiceResponse response = invoiceService.cancel(
                id, authUser.getCompanyId(), authUser.getUserId());

        return ResponseEntity.ok(ApiResponse.success("Invoice cancelled successfully", response));
    }

    // ── GET /api/invoices/overdue ─────────────────────────────────────────────
    // All invoices past due date with balance remaining
    @GetMapping("/overdue")
    public ResponseEntity<ApiResponse<List<InvoiceSummary>>> getOverdue(
            @CurrentUser CurrentUser.AuthUser authUser) {

        List<InvoiceSummary> list = invoiceService.getOverdue(authUser.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success("Overdue invoices fetched", list));
    }

    // ── GET /api/invoices/stats ───────────────────────────────────────────────
    // Dashboard KPIs — today sales, month sales, year sales, unpaid count
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<SalesStats>> getStats(
            @CurrentUser CurrentUser.AuthUser authUser) {

        SalesStats stats = invoiceService.getSalesStats(authUser.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success("Sales stats fetched", stats));
    }
}