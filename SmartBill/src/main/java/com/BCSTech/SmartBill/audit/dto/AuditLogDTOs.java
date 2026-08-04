package com.BCSTech.SmartBill.audit.dto;

import com.BCSTech.SmartBill.audit.model.AuditLog.Action;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

public class AuditLogDTOs {

    // GET /api/audit-logs, GET /api/audit-logs/entity, GET /api/audit-logs/user/{id},
    // GET /api/admin/audit-logs
    @Data
    @Builder
    public static class AuditLogResponse {
        private String id;
        private String companyId; // null for platform-level entries (e.g. SUPER_ADMIN promotion)
        private String userId;    // who performed the action; null for system-initiated entries
        private Action action;
        private String entityType;
        private String entityId;
        private String description;
        private Map<String, String> metadata;
        private LocalDateTime createdAt;
    }
}