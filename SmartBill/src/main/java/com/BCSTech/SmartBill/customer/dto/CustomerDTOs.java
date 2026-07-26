package com.BCSTech.SmartBill.customer.dto;

import com.BCSTech.SmartBill.customer.model.Customer;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class CustomerDTOs {

    // ── Create / Update request ────────────────────────────────────────────────
    @Data
    public static class SaveRequest {

        @NotBlank(message = "Customer name is required")
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

        private BigDecimal creditLimit;
        private BigDecimal openingBalance;
    }

    // ── Response ──────────────────────────────────────────────────────────────
    @Data
    @Builder
    public static class CustomerResponse {
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
        private BigDecimal creditLimit;
        private BigDecimal currentBalance;
        private BigDecimal openingBalance;
        private boolean active;
        private LocalDateTime createdAt;
    }

    // ── Summary (for lists / dropdown search) ─────────────────────────────────
    @Data
    @Builder
    public static class CustomerSummary {
        private String id;
        private String name;
        private String mobile;
        private String email;
        private String gstin;
        private String city;
        private String state;
        private BigDecimal currentBalance;
    }

    // ── Balance update (called internally from invoice/payment modules) ────────
    @Data
    public static class BalanceUpdateRequest {
        private BigDecimal amount;   // positive = debit (invoice), negative = credit (payment)
    }

    // ── Static mapper ──────────────────────────────────────────────────────────
    public static CustomerResponse toResponse(Customer c) {
        return CustomerResponse.builder()
                .id(c.getId())
                .companyId(c.getCompanyId())
                .name(c.getName())
                .mobile(c.getMobile())
                .email(c.getEmail())
                .gstin(c.getGstin())
                .address(c.getAddress())
                .city(c.getCity())
                .state(c.getState())
                .country(c.getCountry())
                .pincode(c.getPincode())
                .creditLimit(c.getCreditLimit())
                .currentBalance(c.getCurrentBalance())
                .openingBalance(c.getOpeningBalance())
                .active(c.isActive())
                .createdAt(c.getCreatedAt())
                .build();
    }

    public static CustomerSummary toSummary(Customer c) {
        return CustomerSummary.builder()
                .id(c.getId())
                .name(c.getName())
                .mobile(c.getMobile())
                .email(c.getEmail())
                .gstin(c.getGstin())
                .city(c.getCity())
                .state(c.getState())
                .currentBalance(c.getCurrentBalance())
                .build();
    }
}