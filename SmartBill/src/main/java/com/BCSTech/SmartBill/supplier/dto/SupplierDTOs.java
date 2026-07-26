package com.BCSTech.SmartBill.supplier.dto;

import com.BCSTech.SmartBill.supplier.model.Supplier;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class SupplierDTOs {

    // ── Create / Update request ────────────────────────────────────────────────
    @Data
    public static class SaveRequest {

        @NotBlank(message = "Supplier name is required")
        private String name;

        @Pattern(regexp = "^[6-9]\\d{9}$", message = "Enter a valid 10-digit mobile number")
        private String mobile;

        @Email(message = "Enter a valid email address")
        private String email;

        @Pattern(
                regexp = "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$",
                message = "Enter a valid 15-character GSTIN"
        )
        private String gstin;

        private String address;
        private String city;
        private String state;
        private String country;
        private String pincode;

        private BigDecimal openingBalance;

        // Bank details
        private String bankName;
        private String accountNumber;
        private String ifscCode;
        private String accountHolderName;
    }

    // ── Full response ──────────────────────────────────────────────────────────
    @Data
    @Builder
    public static class SupplierResponse {
        private String id;
        private String companyId;
        private String name;
        private String mobile;
        private String email;
        private String gstin;
        private String address;
        private String city;
        private String state;
        private String country;
        private String pincode;
        private BigDecimal outstandingAmount;
        private BigDecimal openingBalance;
        private String bankName;
        private String accountNumber;
        private String ifscCode;
        private String accountHolderName;
        private boolean active;
        private LocalDateTime createdAt;
    }

    // ── Summary (for list / dropdown) ─────────────────────────────────────────
    @Data
    @Builder
    public static class SupplierSummary {
        private String id;
        private String name;
        private String mobile;
        private String email;
        private String gstin;
        private String city;
        private String state;
        private BigDecimal outstandingAmount;
    }

    // ── Static mappers ─────────────────────────────────────────────────────────
    public static SupplierResponse toResponse(Supplier s) {
        return SupplierResponse.builder()
                .id(s.getId())
                .companyId(s.getCompanyId())
                .name(s.getName())
                .mobile(s.getMobile())
                .email(s.getEmail())
                .gstin(s.getGstin())
                .address(s.getAddress())
                .city(s.getCity())
                .state(s.getState())
                .country(s.getCountry())
                .pincode(s.getPincode())
                .outstandingAmount(s.getOutstandingAmount())
                .openingBalance(s.getOpeningBalance())
                .bankName(s.getBankName())
                .accountNumber(s.getAccountNumber())
                .ifscCode(s.getIfscCode())
                .accountHolderName(s.getAccountHolderName())
                .active(s.isActive())
                .createdAt(s.getCreatedAt())
                .build();
    }

    public static SupplierSummary toSummary(Supplier s) {
        return SupplierSummary.builder()
                .id(s.getId())
                .name(s.getName())
                .mobile(s.getMobile())
                .email(s.getEmail())
                .gstin(s.getGstin())
                .city(s.getCity())
                .state(s.getState())
                .outstandingAmount(s.getOutstandingAmount())
                .build();
    }
}