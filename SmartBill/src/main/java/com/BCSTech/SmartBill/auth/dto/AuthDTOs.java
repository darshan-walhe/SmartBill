package com.BCSTech.SmartBill.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * All auth-related DTOs in one file for clarity.
 * Each is a static nested class.
 */
public class AuthDTOs {

    // ── Register ──────────────────────────────────────────────────────────────
    @Data
    public static class RegisterRequest {

        @NotBlank(message = "Name is required")
        private String name;

        @NotBlank(message = "Email is required")
        @Email(message = "Enter a valid email")
        private String email;

        @NotBlank(message = "Mobile is required")
        @Pattern(regexp = "^[6-9]\\d{9}$", message = "Enter a valid 10-digit Indian mobile number")
        private String mobile;

        @NotBlank(message = "Password is required")
        @Size(min = 8, message = "Password must be at least 8 characters")
        private String password;

        // Optional: company name when registering the first admin
        private String companyName;
    }

    // ── Login with email + password ───────────────────────────────────────────
    @Data
    public static class LoginRequest {

        @NotBlank(message = "Email is required")
        @Email(message = "Enter a valid email")
        private String email;

        @NotBlank(message = "Password is required")
        private String password;
    }

    // ── Request OTP ───────────────────────────────────────────────────────────
    @Data
    public static class OtpRequest {

        @NotBlank(message = "Mobile is required")
        @Pattern(regexp = "^[6-9]\\d{9}$", message = "Enter a valid 10-digit Indian mobile number")
        private String mobile;
    }

    // ── Verify OTP ────────────────────────────────────────────────────────────
    @Data
    public static class OtpVerifyRequest {

        @NotBlank(message = "Mobile is required")
        @Pattern(regexp = "^[6-9]\\d{9}$", message = "Enter a valid 10-digit Indian mobile number")
        private String mobile;

        @NotBlank(message = "OTP is required")
        @Size(min = 6, max = 6, message = "OTP must be 6 digits")
        private String otp;
    }

    // ── Google Login ──────────────────────────────────────────────────────────
    @Data
    public static class GoogleLoginRequest {

        @NotBlank(message = "Google ID token is required")
        private String idToken;  // sent from React after Google sign-in
    }

    // ── Auth Response (returned on successful login/register/OTP verify) ──────
    @Data
    public static class AuthResponse {
        private String accessToken;
        private String tokenType = "Bearer";
        private String userId;
        private String name;
        private String email;
        private String mobile;
        private String role;
        private String companyId;

        public AuthResponse(String accessToken, String userId, String name,
                            String email, String mobile, String role, String companyId) {
            this.accessToken = accessToken;
            this.userId = userId;
            this.name = name;
            this.email = email;
            this.mobile = mobile;
            this.role = role;
            this.companyId = companyId;
        }
    }
}