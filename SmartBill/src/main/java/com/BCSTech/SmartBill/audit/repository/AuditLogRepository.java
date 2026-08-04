package com.BCSTech.SmartBill.audit.repository;

import com.BCSTech.SmartBill.audit.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AuditLogRepository extends MongoRepository<AuditLog, String> {

    // Full trail for a company — newest first
    Page<AuditLog> findByCompanyIdOrderByCreatedAtDesc(String companyId, Pageable pageable);

    // Trail for one specific entity (e.g. every action taken on one invoice)
    Page<AuditLog> findByCompanyIdAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
            String companyId, String entityType, String entityId, Pageable pageable);

    // Trail for one user (e.g. "what has this teammate been doing")
    Page<AuditLog> findByCompanyIdAndUserIdOrderByCreatedAtDesc(
            String companyId, String userId, Pageable pageable);

    // Platform-wide trail, for SUPER_ADMIN only — deliberately not scoped by
    // companyId, since some entries (e.g. SUPER_ADMIN promotion) have none.
    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}