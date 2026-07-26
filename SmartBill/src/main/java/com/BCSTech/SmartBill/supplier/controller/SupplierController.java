package com.BCSTech.SmartBill.supplier.controller;

import com.BCSTech.SmartBill.common.dto.ApiResponse;
import com.BCSTech.SmartBill.common.security.CurrentUser;
import com.BCSTech.SmartBill.supplier.dto.SupplierDTOs.*;
import com.BCSTech.SmartBill.supplier.service.SupplierService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService supplierService;

    // POST /api/suppliers
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','STAFF')")
    public ResponseEntity<ApiResponse<SupplierResponse>> create(
            @Valid @RequestBody SaveRequest request,
            @CurrentUser CurrentUser.AuthUser authUser) {

        SupplierResponse response = supplierService.create(
                authUser.getCompanyId(), authUser.getUserId(), request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Supplier created successfully", response));
    }

    // GET /api/suppliers?keyword=agro&page=0&size=10
    @GetMapping
    public ResponseEntity<ApiResponse<Page<SupplierSummary>>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @CurrentUser CurrentUser.AuthUser authUser) {

        Page<SupplierSummary> suppliers = supplierService.list(
                authUser.getCompanyId(), keyword, page, size);
        return ResponseEntity.ok(ApiResponse.success("Suppliers fetched successfully", suppliers));
    }

    // GET /api/suppliers/{id}
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SupplierResponse>> getById(
            @PathVariable String id,
            @CurrentUser CurrentUser.AuthUser authUser) {

        SupplierResponse response = supplierService.getById(id, authUser.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success("Supplier fetched successfully", response));
    }

    // PUT /api/suppliers/{id}
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','STAFF')")
    public ResponseEntity<ApiResponse<SupplierResponse>> update(
            @PathVariable String id,
            @Valid @RequestBody SaveRequest request,
            @CurrentUser CurrentUser.AuthUser authUser) {

        SupplierResponse response = supplierService.update(id, authUser.getCompanyId(), request);
        return ResponseEntity.ok(ApiResponse.success("Supplier updated successfully", response));
    }

    // DELETE /api/suppliers/{id}
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable String id,
            @CurrentUser CurrentUser.AuthUser authUser) {

        supplierService.delete(id, authUser.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success("Supplier deleted successfully"));
    }

    // GET /api/suppliers/outstanding
    @GetMapping("/outstanding")
    public ResponseEntity<ApiResponse<List<SupplierSummary>>> getOutstanding(
            @CurrentUser CurrentUser.AuthUser authUser) {

        List<SupplierSummary> list = supplierService.getWithOutstanding(authUser.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success("Outstanding suppliers fetched", list));
    }

    // GET /api/suppliers/stats
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<SupplierStatsResponse>> getStats(
            @CurrentUser CurrentUser.AuthUser authUser) {

        BigDecimal totalPayable = supplierService.getTotalPayable(authUser.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success("Supplier stats fetched",
                new SupplierStatsResponse(totalPayable)));
    }

    record SupplierStatsResponse(BigDecimal totalPayable) {}
}