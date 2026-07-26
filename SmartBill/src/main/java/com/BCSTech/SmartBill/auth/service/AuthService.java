package com.BCSTech.SmartBill.auth.service;

import com.BCSTech.SmartBill.auth.dto.AuthDTOs.*;
import com.BCSTech.SmartBill.common.exception.AppException;
import com.BCSTech.SmartBill.common.security.JwtUtil;
import com.BCSTech.SmartBill.company.model.Company;
import com.BCSTech.SmartBill.company.service.CompanyService;
import com.BCSTech.SmartBill.user.model.AuthProvider;
import com.BCSTech.SmartBill.user.model.Role;
import com.BCSTech.SmartBill.user.model.User;
import com.BCSTech.SmartBill.user.repository.UserRepository;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final OtpService otpService;
    private final CompanyService companyService;   // ← Phase 2 addition

    @Value("${app.google.client-id}")
    private String googleClientId;

    // ── Register ──────────────────────────────────────────────────────────────
    public AuthResponse register(RegisterRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw AppException.conflict("An account with this email already exists.");
        }
        if (userRepository.existsByMobile(request.getMobile())) {
            throw AppException.conflict("An account with this mobile number already exists.");
        }

        // 1. Save user first (without companyId)
        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .mobile(request.getMobile())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(Role.ADMIN)
                .authProvider(AuthProvider.LOCAL)
                .isActive(true)
                .build();

        user = userRepository.save(user);

        // 2. Create company and link back to user
        // CompanyService.createForUser() saves company + sets user.companyId
        String companyName = (request.getCompanyName() != null && !request.getCompanyName().isBlank())
                ? request.getCompanyName()
                : request.getName() + "'s Business";

        Company company = companyService.createForUser(companyName, user.getId());

        // 3. Reload user (now has companyId set by CompanyService)
        user = userRepository.findById(user.getId())
                .orElseThrow(() -> AppException.notFound("User not found"));

        // 4. Generate JWT with real companyId
        String token = jwtUtil.generateToken(user.getId(), company.getId(), user.getRole().name());
        return buildAuthResponse(token, user);
    }

    // ── Login ─────────────────────────────────────────────────────────────────
    public AuthResponse login(LoginRequest request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> AppException.unauthorized("Invalid email or password."));

        if (!user.isActive()) {
            throw AppException.unauthorized("Your account has been deactivated.");
        }
        if (user.getPasswordHash() == null ||
                !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw AppException.unauthorized("Invalid email or password.");
        }

        updateLastLogin(user);
        String token = jwtUtil.generateToken(user.getId(), user.getCompanyId(), user.getRole().name());
        return buildAuthResponse(token, user);
    }

    // ── Send OTP ──────────────────────────────────────────────────────────────
    public void sendOtp(OtpRequest request) {
        if (!userRepository.existsByMobile(request.getMobile())) {
            log.info("OTP requested for unregistered mobile: {}", request.getMobile());
        }
        otpService.generateAndSave(request.getMobile());
    }

    // ── Verify OTP ────────────────────────────────────────────────────────────
    public AuthResponse verifyOtp(OtpVerifyRequest request) {
        otpService.verify(request.getMobile(), request.getOtp());

        User user = userRepository.findByMobile(request.getMobile())
                .orElseGet(() -> {
                    User newUser = User.builder()
                            .mobile(request.getMobile())
                            .name("User")
                            .role(Role.STAFF)
                            .authProvider(AuthProvider.OTP)
                            .isActive(true)
                            .build();
                    return userRepository.save(newUser);
                });

        if (!user.isActive()) {
            throw AppException.unauthorized("Your account has been deactivated.");
        }

        updateLastLogin(user);
        String token = jwtUtil.generateToken(user.getId(), user.getCompanyId(), user.getRole().name());
        return buildAuthResponse(token, user);
    }

    // ── Google Login ──────────────────────────────────────────────────────────
    public AuthResponse googleLogin(GoogleLoginRequest request) {
        GoogleIdToken.Payload payload = verifyGoogleToken(request.getIdToken());

        String googleId = payload.getSubject();
        String email    = payload.getEmail();
        String name     = (String) payload.get("name");

        User user = userRepository.findByGoogleId(googleId)
                .orElseGet(() -> userRepository.findByEmail(email)
                        .map(existing -> {
                            existing.setGoogleId(googleId);
                            existing.setAuthProvider(AuthProvider.GOOGLE);
                            return userRepository.save(existing);
                        })
                        .orElseGet(() -> {
                            User newUser = User.builder()
                                    .name(name)
                                    .email(email)
                                    .googleId(googleId)
                                    .role(Role.STAFF)
                                    .authProvider(AuthProvider.GOOGLE)
                                    .isActive(true)
                                    .build();
                            return userRepository.save(newUser);
                        }));

        if (!user.isActive()) {
            throw AppException.unauthorized("Your account has been deactivated.");
        }

        updateLastLogin(user);
        String token = jwtUtil.generateToken(user.getId(), user.getCompanyId(), user.getRole().name());
        return buildAuthResponse(token, user);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private GoogleIdToken.Payload verifyGoogleToken(String idToken) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken googleIdToken = verifier.verify(idToken);
            if (googleIdToken == null) {
                throw AppException.unauthorized("Invalid Google token.");
            }
            return googleIdToken.getPayload();
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Google token verification failed", e);
            throw AppException.unauthorized("Google authentication failed.");
        }
    }

    private void updateLastLogin(User user) {
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);
    }

    private AuthResponse buildAuthResponse(String token, User user) {
        return new AuthResponse(
                token,
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getMobile(),
                user.getRole().name(),
                user.getCompanyId()
        );
    }
}