package com.BCSTech.SmartBill.user.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "otp_tokens")
public class OtpToken {

    @Id
    private String id;

    @Indexed
    private String mobile;

    private String email;

    private String otp;

    // MongoDB TTL index — document auto-deleted after this time
    @Indexed(expireAfter  = "0s")
    private LocalDateTime expiresAt;

    @Builder.Default
    private boolean isUsed = false;

    @Builder.Default
    private int attempts = 0;

    private LocalDateTime createdAt;
}