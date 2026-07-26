package com.BCSTech.SmartBill.purchase.controller;

import com.BCSTech.SmartBill.common.dto.ApiResponse;
import com.BCSTech.SmartBill.common.security.CurrentUser;
import com.BCSTech.SmartBill.purchase.dto.PurchaseDTOs.*;
import com.BCSTech.SmartBill.purchase.service.PurchaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/purchases")
@RequiredArgsConstructor
public class PurchaseController {

    private final PurchaseService purchaseService;

    // POST /api/purchases
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','STAFF')")
    public ResponseEntity<ApiResponse<PurchaseResponse>> create(
            @Valid @RequestBody SaveRequest request,
            @CurrentUser CurrentUser.AuthUser authUser) {

        PurchaseResponse response = purchaseService.create(
                authUser.getCompanyId(), authUser.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Purchase created successfully", response));
    }

    // GET /api/purchases?keyword=&status=&supplierId=&page=0&size=10
    @GetMapping
    public ResponseEntity<ApiResponse<Page<PurchaseSummary>>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String supplierId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @CurrentUser CurrentUser.AuthUser authUser) {

        Page<PurchaseSummary> purchases = purchaseService.list(
                authUser.getCompanyId(), keyword, status, supplierId, page, size);
        return ResponseEntity.ok(ApiResponse.success("Purchases fetched", purchases));
    }

    // GET /api/purchases/{id}
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PurchaseResponse>> getById(
            @PathVariable String id,
            @CurrentUser CurrentUser.AuthUser authUser) {

        PurchaseResponse response = purchaseService.getById(id, authUser.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success("Purchase fetched", response));
    }

    // POST /api/purchases/{id}/confirm — DRAFT → UNPAID + stock added
    @PostMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','STAFF')")
    public ResponseEntity<ApiResponse<PurchaseResponse>> confirmDraft(
            @PathVariable String id,
            @CurrentUser CurrentUser.AuthUser authUser) {

        PurchaseResponse response = purchaseService.confirmDraft(
                id, authUser.getCompanyId(), authUser.getUserId());
        return ResponseEntity.ok(ApiResponse.success("Purchase confirmed successfully", response));
    }

    // POST /api/purchases/{id}/payment — record supplier payment
    @PostMapping("/{id}/payment")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<PurchaseResponse>> recordPayment(
            @PathVariable String id,
            @Valid @RequestBody SupplierPaymentRequest request,
            @CurrentUser CurrentUser.AuthUser authUser) {

        PurchaseResponse response = purchaseService.recordPayment(
                id, authUser.getCompanyId(), authUser.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success("Payment recorded successfully", response));
    }

    // POST /api/purchases/return — create purchase return
    @PostMapping("/return")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<PurchaseResponse>> createReturn(
            @Valid @RequestBody ReturnRequest request,
            @CurrentUser CurrentUser.AuthUser authUser) {

        PurchaseResponse response = purchaseService.createReturn(
                authUser.getCompanyId(), authUser.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Purchase return created successfully", response));
    }

    // GET /api/purchases/stats — dashboard KPIs
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<PurchaseStats>> getStats(
            @CurrentUser CurrentUser.AuthUser authUser) {

        PurchaseStats stats = purchaseService.getStats(authUser.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success("Purchase stats fetched", stats));
    }
}