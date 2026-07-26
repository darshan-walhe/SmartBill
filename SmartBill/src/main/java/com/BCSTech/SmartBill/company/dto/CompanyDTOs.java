package com.BCSTech.SmartBill.company.dto;

import com.BCSTech.SmartBill.company.model.SubscriptionPlan;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Data;

public class CompanyDTOs {

    // ── Create (called during registration) ───────────────────────────────────
    @Data
    public static class CreateRequest {

        @NotBlank(message = "Company name is required")
        private String name;

        private String gstNumber;
        private String panNumber;
        private String address;
        private String city;
        private String state;
        private String pincode;
        private String country;
        private String email;
        private String mobile;
        private String defaultCurrency;
        private String invoicePrefix;
    }

    // ── Update (from company profile settings screen) ─────────────────────────
    @Data
    public static class UpdateRequest {

        @NotBlank(message = "Company name is required")
        private String name;

        private String gstNumber;
        private String panNumber;
        private String address;
        private String city;
        private String state;
        private String pincode;
        private String country;
        private String email;
        private String mobile;
        private String logoUrl;
        private String signatureUrl;
        private String defaultCurrency;
        private String invoicePrefix;
        private Integer financialYearStartMonth;
    }

    // ── Response ──────────────────────────────────────────────────────────────
    @Data
    @Builder
    public static class CompanyResponse {
        private String id;
        private String name;
        private String gstNumber;
        private String panNumber;
        private String address;
        private String city;
        private String state;
        private String pincode;
        private String country;
        private String email;
        private String mobile;
        private String logoUrl;
        private String signatureUrl;
        private String defaultCurrency;
        private String invoicePrefix;
        private int invoiceSequence;
        private int financialYearStartMonth;
        private SubscriptionPlan subscriptionPlan;
    }
}