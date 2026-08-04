package com.BCSTech.SmartBill.notification.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

public class NotificationDTOs {

    // ── POST /api/notifications — admin broadcast to the whole company ───────
    @Data
    public static class CreateRequest {

        @NotBlank(message = "Title is required")
        private String title;

        @NotBlank(message = "Message is required")
        private String message;
    }

    // ── Returned in list/detail/broadcast responses ───────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NotificationResponse {
        private String id;
        private String type;
        private String title;
        private String message;
        private String referenceType;
        private String referenceId;
        private boolean read;
        private LocalDateTime createdAt;
    }

    // ── GET /api/notifications/unread-count ───────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UnreadCountResponse {
        private long unreadCount;
    }
}