package com.BCSTech.SmartBill.admin.dto;

import com.BCSTech.SmartBill.company.model.SubscriptionPlan;
import com.BCSTech.SmartBill.user.model.Role;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

public class AdminDTOs {

    // ── GET /api/admin/companies, GET /api/admin/companies/{id} ───────────────
    @Data
    @Builder
    public static class CompanyAdminSummary {
        private String id;
        private String name;
        private String gstNumber;
        private String email;
        private String mobile;
        private SubscriptionPlan subscriptionPlan;
        private boolean active;
        private String createdByUserId;
        private LocalDateTime createdAt;
    }

    // ── PATCH /api/admin/companies/{id}/subscription-plan ─────────────────────
    @Data
    public static class SubscriptionPlanUpdateRequest {

        @NotNull(message = "Subscription plan is required")
        private SubscriptionPlan plan;
    }

    // ── GET /api/admin/users ────────────────────────────────────────────────
    @Data
    @Builder
    public static class PlatformUserSummary {
        private String id;
        private String name;
        private String email;
        private String mobile;
        private Role role;
        private String companyId;
        private boolean active;
        private LocalDateTime createdAt;
    }
}
