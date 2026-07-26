package com.BCSTech.SmartBill.auth.service;

import com.BCSTech.SmartBill.common.exception.AppException;
import com.BCSTech.SmartBill.user.model.OtpToken;
import com.BCSTech.SmartBill.user.repository.OtpTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtpService {

    private final OtpTokenRepository otpTokenRepository;

    private static final int OTP_LENGTH = 6;
    private static final int OTP_EXPIRY_MINUTES = 10;
    private static final int MAX_ATTEMPTS = 3;

    // Generate a 6-digit OTP, save to DB, return it (for SMS/email sending)
    public String generateAndSave(String mobile) {
        // Delete any existing OTPs for this mobile first
        otpTokenRepository.deleteAllByMobile(mobile);

        String otp = generateOtp();

        OtpToken token = OtpToken.builder()
                .mobile(mobile)
                .otp(otp)
                .isUsed(false)
                .attempts(0)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES))
                .build();

        otpTokenRepository.save(token);

        // In production: send via SMS (Twilio / MSG91)
        // For now we log it — replace with SMS service call
        log.info("OTP for {}: {}", mobile, otp);

        return otp;
    }

    // Verify OTP — returns true if valid, throws AppException if not
    public void verify(String mobile, String otp) {
        OtpToken token = otpTokenRepository
                .findTopByMobileAndIsUsedFalseOrderByCreatedAtDesc(mobile)
                .orElseThrow(() -> AppException.badRequest("No OTP found for this mobile. Please request a new one."));

        // Check expiry
        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            otpTokenRepository.deleteAllByMobile(mobile);
            throw AppException.badRequest("OTP has expired. Please request a new one.");
        }

        // Check attempts
        if (token.getAttempts() >= MAX_ATTEMPTS) {
            otpTokenRepository.deleteAllByMobile(mobile);
            throw AppException.badRequest("Too many incorrect attempts. Please request a new OTP.");
        }

        // Wrong OTP — increment attempts
        if (!token.getOtp().equals(otp)) {
            token.setAttempts(token.getAttempts() + 1);
            otpTokenRepository.save(token);
            int remaining = MAX_ATTEMPTS - token.getAttempts();
            throw AppException.badRequest("Incorrect OTP. " + remaining + " attempts remaining.");
        }

        // Mark as used
        token.setUsed(true);
        otpTokenRepository.save(token);

        // Clean up all OTPs for this mobile
        otpTokenRepository.deleteAllByMobile(mobile);
    }

    private String generateOtp() {
        SecureRandom random = new SecureRandom();
        int otp = 100000 + random.nextInt(900000); // always 6 digits
        return String.valueOf(otp);
    }
}