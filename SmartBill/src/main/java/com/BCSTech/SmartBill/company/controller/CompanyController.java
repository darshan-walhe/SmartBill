package com.BCSTech.SmartBill.company.controller;

import com.BCSTech.SmartBill.common.dto.ApiResponse;
import com.BCSTech.SmartBill.common.security.CurrentUser;
import com.BCSTech.SmartBill.company.dto.CompanyDTOs.*;
import com.BCSTech.SmartBill.company.service.CompanyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/company")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyService companyService;

    // GET /api/company
    // Any authenticated user can fetch their company profile
    @GetMapping
    public ResponseEntity<ApiResponse<CompanyResponse>> getCompany(
            @CurrentUser CurrentUser.AuthUser authUser) {

        CompanyResponse response = companyService.getByCompanyId(authUser.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success("Company fetched successfully", response));
    }

    // PUT /api/company
    // Only ADMIN or SUPER_ADMIN can update company profile
    @PutMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<CompanyResponse>> updateCompany(
            @Valid @RequestBody UpdateRequest request,
            @CurrentUser CurrentUser.AuthUser authUser) {

        CompanyResponse response = companyService.update(authUser.getCompanyId(), request);
        return ResponseEntity.ok(ApiResponse.success("Company updated successfully", response));
    }
}