package com.BCSTech.SmartBill.customer.controller;

import com.BCSTech.SmartBill.common.dto.ApiResponse;
import com.BCSTech.SmartBill.common.security.CurrentUser;
import com.BCSTech.SmartBill.customer.dto.CustomerDTOs.*;
import com.BCSTech.SmartBill.customer.service.CustomerService;
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
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    // POST /api/customers
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','STAFF')")
    public ResponseEntity<ApiResponse<CustomerResponse>> create(
            @Valid @RequestBody SaveRequest request,
            @CurrentUser CurrentUser.AuthUser authUser) {

        CustomerResponse response = customerService.create(
                authUser.getCompanyId(), authUser.getUserId(), request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Customer created successfully", response));
    }

    // GET /api/customers?keyword=raj&page=0&size=10
    @GetMapping
    public ResponseEntity<ApiResponse<Page<CustomerSummary>>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @CurrentUser CurrentUser.AuthUser authUser) {

        Page<CustomerSummary> customers = customerService.list(
                authUser.getCompanyId(), keyword, page, size);
        return ResponseEntity.ok(ApiResponse.success("Customers fetched successfully", customers));
    }

    // GET /api/customers/{id}
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CustomerResponse>> getById(
            @PathVariable String id,
            @CurrentUser CurrentUser.AuthUser authUser) {

        CustomerResponse response = customerService.getById(id, authUser.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success("Customer fetched successfully", response));
    }

    // PUT /api/customers/{id}
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','STAFF')")
    public ResponseEntity<ApiResponse<CustomerResponse>> update(
            @PathVariable String id,
            @Valid @RequestBody SaveRequest request,
            @CurrentUser CurrentUser.AuthUser authUser) {

        CustomerResponse response = customerService.update(id, authUser.getCompanyId(), request);
        return ResponseEntity.ok(ApiResponse.success("Customer updated successfully", response));
    }

    // DELETE /api/customers/{id}
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable String id,
            @CurrentUser CurrentUser.AuthUser authUser) {

        customerService.delete(id, authUser.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success("Customer deleted successfully"));
    }

    // GET /api/customers/outstanding
    // Returns all customers with balance > 0 — used in dashboard + ledger
    @GetMapping("/outstanding")
    public ResponseEntity<ApiResponse<List<CustomerSummary>>> getOutstanding(
            @CurrentUser CurrentUser.AuthUser authUser) {

        List<CustomerSummary> list = customerService.getWithOutstanding(authUser.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success("Outstanding customers fetched", list));
    }

    // GET /api/customers/stats
    // Dashboard KPIs — total count + total receivable
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<CustomerStatsResponse>> getStats(
            @CurrentUser CurrentUser.AuthUser authUser) {

        long count = customerService.getTotalCount(authUser.getCompanyId());
        BigDecimal receivable = customerService.getTotalReceivable(authUser.getCompanyId());

        CustomerStatsResponse stats = new CustomerStatsResponse(count, receivable);
        return ResponseEntity.ok(ApiResponse.success("Customer stats fetched", stats));
    }

    // ── Inner DTO for stats response ──────────────────────────────────────────
    record CustomerStatsResponse(long totalCustomers, BigDecimal totalReceivable) {}
}