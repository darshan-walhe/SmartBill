package com.BCSTech.SmartBill.inventory.controller;

import com.BCSTech.SmartBill.common.dto.ApiResponse;
import com.BCSTech.SmartBill.common.security.CurrentUser;
import com.BCSTech.SmartBill.inventory.dto.InventoryDTOs.*;
import com.BCSTech.SmartBill.inventory.service.InventoryService;
import com.BCSTech.SmartBill.product.dto.ProductDTOs.ProductSummary;
import com.BCSTech.SmartBill.product.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;
    private final ProductService productService;

    // POST /api/inventory/adjust
    // Manual stock in / stock out
    @PostMapping("/adjust")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','STAFF')")
    public ResponseEntity<ApiResponse<StockLedgerResponse>> adjust(
            @Valid @RequestBody AdjustmentRequest request,
            @CurrentUser CurrentUser.AuthUser authUser) {

        StockLedgerResponse response = inventoryService.adjust(
                authUser.getCompanyId(), authUser.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success("Stock adjusted successfully", response));
    }

    // GET /api/inventory/ledger/{productId}?page=0&size=20
    // Full stock movement history for one product
    @GetMapping("/ledger/{productId}")
    public ResponseEntity<ApiResponse<Page<StockLedgerResponse>>> getLedger(
            @PathVariable String productId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @CurrentUser CurrentUser.AuthUser authUser) {

        Page<StockLedgerResponse> ledger = inventoryService.getLedger(
                productId, authUser.getCompanyId(), page, size);
        return ResponseEntity.ok(ApiResponse.success("Stock ledger fetched", ledger));
    }

    // GET /api/inventory/report?from=2024-04-01T00:00:00&to=2024-06-30T23:59:59
    // All stock movements in date range
    @GetMapping("/report")
    public ResponseEntity<ApiResponse<List<StockLedgerResponse>>> getReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @CurrentUser CurrentUser.AuthUser authUser) {

        List<StockLedgerResponse> report = inventoryService.getByDateRange(
                authUser.getCompanyId(), from, to);
        return ResponseEntity.ok(ApiResponse.success("Inventory report fetched", report));
    }

    // GET /api/inventory/low-stock
    // Delegates to ProductService — products at or below threshold
    @GetMapping("/low-stock")
    public ResponseEntity<ApiResponse<List<ProductSummary>>> getLowStock(
            @CurrentUser CurrentUser.AuthUser authUser) {

        List<ProductSummary> list = productService.getLowStockProducts(authUser.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success("Low stock products fetched", list));
    }
}




