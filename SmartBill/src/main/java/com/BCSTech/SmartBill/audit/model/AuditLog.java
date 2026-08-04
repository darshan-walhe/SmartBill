package com.BCSTech.SmartBill.audit.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "audit_logs")
public class AuditLog {

    @Id
    private String id;

    // Every document scoped to a company (multi-tenant)
    @Indexed
    private String companyId;

    // The user who performed the action — null for system-initiated actions
    @Indexed
    private String userId;

    private Action action;

    // e.g. "INVOICE", "PURCHASE", "PRODUCT", "USER", "CUSTOMER", "COMPANY"
    @Indexed
    private String entityType;

    private String entityId;

    // Human-readable summary, e.g. "Cancelled invoice INV-2024-0001"
    private String description;

    // Optional extra context (e.g. old/new role, old/new status). Kept as
    // simple key-value pairs rather than a nested object so every entry stays
    // trivially queryable and serializable regardless of what triggered it.
    private Map<String, String> metadata;

    @CreatedDate
    private LocalDateTime createdAt;

    public enum Action {
        CREATE,
        UPDATE,
        DELETE,
        CANCEL,
        CONFIRM,
        LOGIN,
        ROLE_CHANGE,
        DEACTIVATE,
        REACTIVATE,
        PAYMENT,
        INVITE
    }
}