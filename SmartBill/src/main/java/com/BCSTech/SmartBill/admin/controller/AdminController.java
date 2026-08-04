package com.BCSTech.SmartBill.admin.controller;

import com.BCSTech.SmartBill.admin.dto.AdminDTOs.*;
import com.BCSTech.SmartBill.admin.service.AdminService;
import com.BCSTech.SmartBill.audit.dto.AuditLogDTOs.AuditLogResponse;
import com.BCSTech.SmartBill.common.dto.ApiResponse;
import com.BCSTech.SmartBill.common.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Platform-level administration — every endpoint here can read or act on any
 * company or user in the system, not just the caller's own company. Every
 * method requires SUPER_ADMIN specifically (not ADMIN).
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    // GET /api/admin/companies?page=0&size=10 — every company on the platform
    @GetMapping("/companies")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Page<CompanyAdminSummary>>> listCompanies(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<CompanyAdminSummary> companies = adminService.listCompanies(page, size);
        return ResponseEntity.ok(ApiResponse.success("Companies fetched successfully", companies));
    }

    // GET /api/admin/companies/{id}
    @GetMapping("/companies/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<CompanyAdminSummary>> getCompany(@PathVariable String id) {
        CompanyAdminSummary company = adminService.getCompany(id);
        return ResponseEntity.ok(ApiResponse.success("Company fetched successfully", company));
    }

    // PATCH /api/admin/companies/{id}/deactivate — locks out every user of
    // this company immediately (enforced in JwtFilter, not just at next login)
    @PatchMapping("/companies/{id}/deactivate")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<CompanyAdminSummary>> deactivateCompany(
            @PathVariable String id,
            @CurrentUser CurrentUser.AuthUser authUser) {

        CompanyAdminSummary company = adminService.deactivateCompany(id, authUser.getUserId());
        return ResponseEntity.ok(ApiResponse.success("Company deactivated successfully", company));
    }

    // PATCH /api/admin/companies/{id}/reactivate
    @PatchMapping("/companies/{id}/reactivate")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<CompanyAdminSummary>> reactivateCompany(
            @PathVariable String id,
            @CurrentUser CurrentUser.AuthUser authUser) {

        CompanyAdminSummary company = adminService.reactivateCompany(id, authUser.getUserId());
        return ResponseEntity.ok(ApiResponse.success("Company reactivated successfully", company));
    }

    // PATCH /api/admin/companies/{id}/subscription-plan
    @PatchMapping("/companies/{id}/subscription-plan")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<CompanyAdminSummary>> updateSubscriptionPlan(
            @PathVariable String id,
            @Valid @RequestBody SubscriptionPlanUpdateRequest request,
            @CurrentUser CurrentUser.AuthUser authUser) {

        CompanyAdminSummary company =
                adminService.updateSubscriptionPlan(id, authUser.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success("Subscription plan updated successfully", company));
    }

    // GET /api/admin/users?page=0&size=10 — every user on the platform, across
    // every company (unlike GET /api/users, which is company-scoped)
    @GetMapping("/users")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Page<PlatformUserSummary>>> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<PlatformUserSummary> users = adminService.listUsers(page, size);
        return ResponseEntity.ok(ApiResponse.success("Users fetched successfully", users));
    }

    // PATCH /api/admin/users/{id}/promote — grants SUPER_ADMIN to an existing
    // user. This is the only path to create a SUPER_ADMIN after the very
    // first one (see SuperAdminBootstrap for that one).
    @PatchMapping("/users/{id}/promote")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<PlatformUserSummary>> promote(
            @PathVariable String id,
            @CurrentUser CurrentUser.AuthUser authUser) {

        PlatformUserSummary user = adminService.promoteToSuperAdmin(id, authUser.getUserId());
        return ResponseEntity.ok(ApiResponse.success("User promoted to SUPER_ADMIN successfully", user));
    }

    // GET /api/admin/audit-logs?page=0&size=10 — platform-wide audit trail,
    // across every company (unlike GET /api/audit-logs, which is scoped to
    // the caller's own company)
    @GetMapping("/audit-logs")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> listAllAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<AuditLogResponse> logs = adminService.listAllAuditLogs(page, size);
        return ResponseEntity.ok(ApiResponse.success("Audit logs fetched successfully", logs));
    }
}