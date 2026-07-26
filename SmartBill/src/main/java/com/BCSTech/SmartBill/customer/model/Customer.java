package com.BCSTech.SmartBill.customer.model;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "customers")
@CompoundIndexes({
        @CompoundIndex(name = "company_mobile", def = "{'companyId': 1, 'mobile': 1}"),
        @CompoundIndex(name = "company_email",  def = "{'companyId': 1, 'email': 1}")
})
public class Customer {

    @Id
    private String id;

    // Multi-tenant — every query filters by companyId first
    @Indexed
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

    // Maximum credit allowed for this customer
    @Builder.Default
    private BigDecimal creditLimit = BigDecimal.ZERO;

    // Running balance — positive = customer owes us (receivable)
    @Builder.Default
    private BigDecimal currentBalance = BigDecimal.ZERO;

    // Opening balance at the time of onboarding
    @Builder.Default
    private BigDecimal openingBalance = BigDecimal.ZERO;

    @Builder.Default
    private boolean active = true;

    private String createdBy;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}