package com.BCSTech.SmartBill.audit.controller;

import com.BCSTech.SmartBill.audit.dto.AuditLogDTOs.AuditLogResponse;
import com.BCSTech.SmartBill.audit.model.AuditLog;
import com.BCSTech.SmartBill.audit.service.AuditService;
import com.BCSTech.SmartBill.common.dto.ApiResponse;
import com.BCSTech.SmartBill.common.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Company-scoped audit trail — every entry is filtered to the caller's own
 * companyId, same tenant-isolation pattern as every other controller in the
 * app. Restricted to ADMIN/MANAGER: seeing who did what (role changes,
 * cancellations, deactivations) is a level of visibility above what a
 * STAFF/ACCOUNTANT day-to-day user needs.
 *
 * For the cross-company platform view, see
 * GET /api/admin/audit-logs in AdminController (SUPER_ADMIN only).
 */
@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditController {

    private final AuditService auditService;

    // GET /api/audit-logs?page=0&size=10 — full trail for the caller's company
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @CurrentUser CurrentUser.AuthUser authUser) {

        Page<AuditLogResponse> logs = auditService
                .listForCompany(authUser.getCompanyId(), page, size)
                .map(this::toResponse);
        return ResponseEntity.ok(ApiResponse.success("Audit logs fetched successfully", logs));
    }

    // GET /api/audit-logs/entity?entityType=INVOICE&entityId=... — trail for
    // one specific record, e.g. every action ever taken on one invoice
    @GetMapping("/entity")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> listForEntity(
            @RequestParam String entityType,
            @RequestParam String entityId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @CurrentUser CurrentUser.AuthUser authUser) {

        Page<AuditLogResponse> logs = auditService
                .listForEntity(authUser.getCompanyId(), entityType, entityId, page, size)
                .map(this::toResponse);
        return ResponseEntity.ok(ApiResponse.success("Audit logs fetched successfully", logs));
    }

    // GET /api/audit-logs/user/{userId} — trail for one teammate
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> listForUser(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @CurrentUser CurrentUser.AuthUser authUser) {

        Page<AuditLogResponse> logs = auditService
                .listForUser(authUser.getCompanyId(), userId, page, size)
                .map(this::toResponse);
        return ResponseEntity.ok(ApiResponse.success("Audit logs fetched successfully", logs));
    }

    private AuditLogResponse toResponse(AuditLog log) {
        return AuditLogResponse.builder()
                .id(log.getId())
                .companyId(log.getCompanyId())
                .userId(log.getUserId())
                .action(log.getAction())
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .description(log.getDescription())
                .metadata(log.getMetadata())
                .createdAt(log.getCreatedAt())
                .build();
    }
}