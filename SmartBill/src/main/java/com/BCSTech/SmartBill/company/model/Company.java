package com.BCSTech.SmartBill.company.model;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "companies")
public class Company {

    @Id
    private String id;

    private String name;

    @Indexed(unique = true, sparse = true)
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

    // Default currency for invoices — INR for Indian businesses
    @Builder.Default
    private String defaultCurrency = "INR";

    // Invoice number prefix e.g. "INV-"
    @Builder.Default
    private String invoicePrefix = "INV-";

    // Starting invoice number — incremented on each invoice creation
    @Builder.Default
    private int invoiceSequence = 1;

    // Financial year start month (4 = April for Indian FY)
    @Builder.Default
    private int financialYearStartMonth = 4;

    @Builder.Default
    private SubscriptionPlan subscriptionPlan = SubscriptionPlan.FREE;

    // Owner/admin userId who created this company
    private String createdByUserId;

    @Builder.Default
    private boolean active = true;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}