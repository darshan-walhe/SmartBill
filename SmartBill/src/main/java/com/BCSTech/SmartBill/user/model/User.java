package com.BCSTech.SmartBill.user.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
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
@Document(collection = "users")
public class User {

    @Id
    private String id;

    // Every document scoped to a company (multi-tenant)
    @Indexed
    private String companyId;

    private String name;

    @Indexed(unique = true, sparse = true)
    private String email;

    @Indexed(unique = true, sparse = true)
    private String mobile;

    // Excluded from toString() — @Data auto-generates toString() over every
    // field by default, which would otherwise print the bcrypt hash into any
    // log line or exception message that happens to include a User object.
    @ToString.Exclude
    private String passwordHash;

    @Builder.Default
    private Role role = Role.STAFF;

    @Builder.Default
    private AuthProvider authProvider = AuthProvider.LOCAL;

    // Populated only for Google login
    private String googleId;

    @Builder.Default
    private boolean isActive = true;

    private LocalDateTime lastLogin;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}