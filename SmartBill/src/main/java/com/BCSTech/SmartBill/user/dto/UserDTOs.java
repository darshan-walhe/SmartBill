package com.BCSTech.SmartBill.user.dto;

import com.BCSTech.SmartBill.user.model.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

public class UserDTOs {

    // ── Invite a teammate into the logged-in admin's company ─────────────────
    @Data
    public static class InviteRequest {

        @NotBlank(message = "Name is required")
        private String name;

        @NotBlank(message = "Email is required")
        @Email(message = "Email must be valid")
        private String email;

        @NotBlank(message = "Mobile number is required")
        private String mobile;

        @NotNull(message = "Role is required")
        private Role role;
    }

    // ── Change an existing team member's role ─────────────────────────────────
    @Data
    public static class RoleUpdateRequest {

        @NotNull(message = "Role is required")
        private Role role;
    }

    // ── Team member — returned in list/detail/invite responses ───────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserResponse {
        private String id;
        private String name;
        private String email;
        private String mobile;
        private Role role;
        private boolean active;
        private LocalDateTime lastLogin;
        private LocalDateTime createdAt;
    }

    // ── Returned once, right after an invite is created ───────────────────────
    // temporaryPassword is shown only in this response — share it with the
    // invitee out-of-band. TODO: wire up an email service and send this
    // directly instead of returning it in the API response (mirrors the
    // OtpService pattern already used elsewhere in this codebase, which also
    // just logs the OTP for now rather than sending it).
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InviteResponse {
        private UserResponse user;
        private String temporaryPassword;
    }
}