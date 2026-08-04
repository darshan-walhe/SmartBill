package com.BCSTech.SmartBill.audit.service;

import com.BCSTech.SmartBill.audit.model.AuditLog;
import com.BCSTech.SmartBill.audit.model.AuditLog.Action;
import com.BCSTech.SmartBill.audit.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    // ══════════════════════════════════════════════════════════════
    //  INTERNAL API — called by other modules right after a
    //  significant, security- or money-relevant action (role change,
    //  cancellation, deactivation, payment, etc). No controller yet —
    //  this is a plain service other services inject and call
    //  directly, same pattern as NotificationService.notify().
    // ══════════════════════════════════════════════════════════════

    public void record(String companyId, String userId, Action action,
                       String entityType, String entityId, String description) {
        record(companyId, userId, action, entityType, entityId, description, null);
    }

    public void record(String companyId, String userId, Action action,
                       String entityType, String entityId, String description,
                       Map<String, String> metadata) {
        AuditLog entry = AuditLog.builder()
                .companyId(companyId)
                .userId(userId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .description(description)
                .metadata(metadata)
                .build();

        auditLogRepository.save(entry);
        log.debug("Audit: {} {} {} by {} in company {}", action, entityType, entityId, userId, companyId);
    }

    // ══════════════════════════════════════════════════════════════
    //  READ-SIDE — used by AuditController (company-scoped, for
    //  ADMIN/MANAGER) and AdminController (platform-wide, SUPER_ADMIN only)
    // ══════════════════════════════════════════════════════════════

    public Page<AuditLog> listForCompany(String companyId, int page, int size) {
        return auditLogRepository.findByCompanyIdOrderByCreatedAtDesc(
                companyId, PageRequest.of(page, size));
    }

    public Page<AuditLog> listForEntity(String companyId, String entityType, String entityId,
                                        int page, int size) {
        return auditLogRepository.findByCompanyIdAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
                companyId, entityType, entityId, PageRequest.of(page, size));
    }

    public Page<AuditLog> listForUser(String companyId, String userId, int page, int size) {
        return auditLogRepository.findByCompanyIdAndUserIdOrderByCreatedAtDesc(
                companyId, userId, PageRequest.of(page, size));
    }

    // Platform-wide, SUPER_ADMIN only — includes entries with no companyId
    // (e.g. SUPER_ADMIN promotion), which the company-scoped methods above
    // would never surface.
    public Page<AuditLog> listAll(int page, int size) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size));
    }
}