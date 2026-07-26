package com.BCSTech.SmartBill.supplier.model;

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
@Document(collection = "suppliers")
@CompoundIndexes({
        @CompoundIndex(name = "company_mobile", def = "{'companyId': 1, 'mobile': 1}"),
        @CompoundIndex(name = "company_gstin",  def = "{'companyId': 1, 'gstin': 1}")
})
public class Supplier {

    @Id
    private String id;

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

    // Amount we owe to this supplier (payable)
    // Positive = we owe them money
    @Builder.Default
    private BigDecimal outstandingAmount = BigDecimal.ZERO;

    // Opening balance at time of onboarding
    @Builder.Default
    private BigDecimal openingBalance = BigDecimal.ZERO;

    // Bank details for payment
    private String bankName;
    private String accountNumber;
    private String ifscCode;
    private String accountHolderName;

    @Builder.Default
    private boolean active = true;

    private String createdBy;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}