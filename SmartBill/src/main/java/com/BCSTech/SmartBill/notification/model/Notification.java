package com.BCSTech.SmartBill.notification.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "notifications")
public class Notification {

    @Id
    private String id;

    // Every document scoped to a company (multi-tenant)
    @Indexed
    private String companyId;

    // null  → visible to everyone in the company (e.g. a low-stock alert)
    // set   → visible only to that specific user (e.g. "you were invited")
    @Indexed
    private String userId;

    private NotificationType type;

    private String title;

    private String message;

    // Optional link back to the entity this notification is about,
    // e.g. referenceType="INVOICE", referenceId=<invoice id>
    private String referenceType;

    private String referenceId;

    @Builder.Default
    private boolean read = false;

    @CreatedDate
    private LocalDateTime createdAt;
}