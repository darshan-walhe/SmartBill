package com.BCSTech.SmartBill.user.repository;

import com.BCSTech.SmartBill.user.model.OtpToken;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface OtpTokenRepository extends MongoRepository<OtpToken, String> {

    // Get latest unused OTP for a mobile number
    Optional<OtpToken> findTopByMobileAndIsUsedFalseOrderByCreatedAtDesc(String mobile);

    // Delete all OTPs for a mobile after successful verification
    void deleteAllByMobile(String mobile);
}