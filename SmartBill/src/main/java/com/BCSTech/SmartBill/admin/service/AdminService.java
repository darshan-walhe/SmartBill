package com.BCSTech.SmartBill.admin.service;

import com.BCSTech.SmartBill.admin.dto.AdminDTOs.*;
import com.BCSTech.SmartBill.audit.dto.AuditLogDTOs.AuditLogResponse;
import com.BCSTech.SmartBill.audit.model.AuditLog;
import com.BCSTech.SmartBill.audit.model.AuditLog.Action;
import com.BCSTech.SmartBill.audit.service.AuditService;
import com.BCSTech.SmartBill.common.exception.AppException;
import com.BCSTech.SmartBill.company.model.Company;
import com.BCSTech.SmartBill.company.model.SubscriptionPlan;
import com.BCSTech.SmartBill.company.repository.CompanyRepository;
import com.BCSTech.SmartBill.user.model.Role;
import com.BCSTech.SmartBill.user.model.User;
import com.BCSTech.SmartBill.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Platform-level operations for SUPER_ADMIN — NOT scoped to any single
 * company. Every method here can read or act on any company/user in the
 * system, so every entry point into this class must stay behind
 * @PreAuthorize("hasRole('SUPER_ADMIN')") in AdminController. There is no
 * companyId-based filtering here on purpose.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    // ── GET /api/admin/companies ───────────────────────────────────────────────
    public Page<CompanyAdminSummary> listCompanies(int page, int size) {
        return companyRepository
                .findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()))
                .map(this::toCompanySummary);
    }

    // ── GET /api/admin/companies/{id} ──────────────────────────────────────────
    public CompanyAdminSummary getCompany(String companyId) {
        return toCompanySummary(getCompanyOrThrow(companyId));
    }

    // ── PATCH /api/admin/companies/{id}/deactivate ─────────────────────────────
    // Locks out every user of that company (JwtFilter still issues a valid
    // token, but every tenant-scoped read/write goes through this flag —
    // see the note on Company.active for where this needs to be checked).
    public CompanyAdminSummary deactivateCompany(String companyId, String superAdminId) {
        Company company = getCompanyOrThrow(companyId);

        if (!company.isActive()) {
            throw AppException.badRequest("Company is already deactivated.");
        }

        company.setActive(false);
        company = companyRepository.save(company);

        auditService.record(companyId, superAdminId, Action.DEACTIVATE, "COMPANY", companyId,
                "Company deactivated by platform admin");
        log.warn("Company {} deactivated by SUPER_ADMIN {}", companyId, superAdminId);
        return toCompanySummary(company);
    }

    // ── PATCH /api/admin/companies/{id}/reactivate ─────────────────────────────
    public CompanyAdminSummary reactivateCompany(String companyId, String superAdminId) {
        Company company = getCompanyOrThrow(companyId);

        if (company.isActive()) {
            throw AppException.badRequest("Company is already active.");
        }

        company.setActive(true);
        company = companyRepository.save(company);

        auditService.record(companyId, superAdminId, Action.REACTIVATE, "COMPANY", companyId,
                "Company reactivated by platform admin");
        log.info("Company {} reactivated by SUPER_ADMIN {}", companyId, superAdminId);
        return toCompanySummary(company);
    }

    // ── PATCH /api/admin/companies/{id}/subscription-plan ──────────────────────
    public CompanyAdminSummary updateSubscriptionPlan(String companyId, String superAdminId,
                                                      SubscriptionPlanUpdateRequest request) {
        Company company = getCompanyOrThrow(companyId);
        SubscriptionPlan previousPlan = company.getSubscriptionPlan();

        if (previousPlan == request.getPlan()) {
            throw AppException.badRequest("Company is already on the " + request.getPlan() + " plan.");
        }

        company.setSubscriptionPlan(request.getPlan());
        company = companyRepository.save(company);

        auditService.record(companyId, superAdminId, Action.UPDATE, "COMPANY", companyId,
                "Subscription plan changed from " + previousPlan + " to " + request.getPlan(),
                Map.of("previousPlan", previousPlan.name(), "newPlan", request.getPlan().name()));
        log.info("Company {} subscription plan changed {} -> {} by SUPER_ADMIN {}",
                companyId, previousPlan, request.getPlan(), superAdminId);
        return toCompanySummary(company);
    }

    // ── GET /api/admin/users ────────────────────────────────────────────────────
    public Page<PlatformUserSummary> listUsers(int page, int size) {
        return userRepository
                .findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()))
                .map(this::toUserSummary);
    }

    // ── GET /api/admin/audit-logs ────────────────────────────────────────────────
    // Platform-wide trail, across every company — includes entries with no
    // companyId (e.g. SUPER_ADMIN promotion), unlike GET /api/audit-logs
    // which is scoped to the caller's own company.
    public Page<AuditLogResponse> listAllAuditLogs(int page, int size) {
        return auditService.listAll(page, size).map(this::toAuditLogResponse);
    }

    // ── PATCH /api/admin/users/{id}/promote ─────────────────────────────────────
    // Lets an existing SUPER_ADMIN create the next one, instead of every new
    // platform admin needing an env-var restart via SuperAdminBootstrap.
    public PlatformUserSummary promoteToSuperAdmin(String targetUserId, String requestingSuperAdminId) {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> AppException.notFound("User not found"));

        if (user.getRole() == Role.SUPER_ADMIN) {
            throw AppException.badRequest("User is already a SUPER_ADMIN.");
        }

        Role previousRole = user.getRole();
        user.setRole(Role.SUPER_ADMIN);
        user = userRepository.save(user);

        auditService.record(null, requestingSuperAdminId, Action.ROLE_CHANGE, "USER", targetUserId,
                "Promoted " + user.getEmail() + " from " + previousRole + " to SUPER_ADMIN",
                Map.of("previousRole", previousRole.name(), "newRole", Role.SUPER_ADMIN.name()));
        log.warn("User {} promoted to SUPER_ADMIN by {}", targetUserId, requestingSuperAdminId);
        return toUserSummary(user);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private Company getCompanyOrThrow(String companyId) {
        return companyRepository.findById(companyId)
                .orElseThrow(() -> AppException.notFound("Company not found"));
    }

    private CompanyAdminSummary toCompanySummary(Company company) {
        return CompanyAdminSummary.builder()
                .id(company.getId())
                .name(company.getName())
                .gstNumber(company.getGstNumber())
                .email(company.getEmail())
                .mobile(company.getMobile())
                .subscriptionPlan(company.getSubscriptionPlan())
                .active(company.isActive())
                .createdByUserId(company.getCreatedByUserId())
                .createdAt(company.getCreatedAt())
                .build();
    }

    private PlatformUserSummary toUserSummary(User user) {
        return PlatformUserSummary.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .mobile(user.getMobile())
                .role(user.getRole())
                .companyId(user.getCompanyId())
                .active(user.isActive())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private AuditLogResponse toAuditLogResponse(AuditLog log) {
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