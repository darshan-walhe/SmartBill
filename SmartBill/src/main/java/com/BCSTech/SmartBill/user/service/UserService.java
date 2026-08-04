package com.BCSTech.SmartBill.user.service;

import com.BCSTech.SmartBill.audit.model.AuditLog.Action;
import com.BCSTech.SmartBill.audit.service.AuditService;
import com.BCSTech.SmartBill.common.exception.AppException;
import com.BCSTech.SmartBill.notification.model.NotificationType;
import com.BCSTech.SmartBill.notification.service.NotificationService;
import com.BCSTech.SmartBill.user.dto.UserDTOs.*;
import com.BCSTech.SmartBill.user.model.AuthProvider;
import com.BCSTech.SmartBill.user.model.Role;
import com.BCSTech.SmartBill.user.model.User;
import com.BCSTech.SmartBill.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;
    private final AuditService auditService;

    private static final String TEMP_PASSWORD_CHARS =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

    public User getById(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> AppException.notFound("User not found"));
    }

    public User getByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> AppException.notFound("User not found"));
    }

    // ── GET /api/users — company-scoped team list ────────────────────────────
    public Page<UserResponse> list(String companyId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return userRepository.findByCompanyId(companyId, pageable)
                .map(this::toResponse);
    }

    // ── POST /api/users/invite — add a teammate to the logged-in admin's company
    public InviteResponse invite(String companyId, String requestingUserId, InviteRequest request) {

        if (request.getRole() == Role.SUPER_ADMIN) {
            throw AppException.badRequest("Cannot assign the SUPER_ADMIN role.");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw AppException.conflict("An account with this email already exists.");
        }
        if (userRepository.existsByMobile(request.getMobile())) {
            throw AppException.conflict("An account with this mobile number already exists.");
        }

        String temporaryPassword = generateTemporaryPassword();

        User user = User.builder()
                .companyId(companyId)
                .name(request.getName())
                .email(request.getEmail())
                .mobile(request.getMobile())
                .passwordHash(passwordEncoder.encode(temporaryPassword))
                .role(request.getRole())
                .authProvider(AuthProvider.LOCAL)
                .isActive(true)
                .build();

        user = userRepository.save(user);

        // In production: email the invitee their temporary password instead of
        // just logging it (see TODO on InviteResponse).
        log.info("Invited user {} ({}) to company {} with role {}",
                user.getEmail(), user.getId(), companyId, user.getRole());

        notificationService.notify(companyId, user.getId(), NotificationType.USER_INVITED,
                "Welcome to the team",
                "You were added as " + user.getRole() + ". Log in with your temporary password to get started.",
                "USER", user.getId());

        auditService.record(companyId, requestingUserId, Action.INVITE, "USER", user.getId(),
                "Invited " + user.getEmail() + " as " + user.getRole());

        return InviteResponse.builder()
                .user(toResponse(user))
                .temporaryPassword(temporaryPassword)
                .build();
    }

    // ── PUT /api/users/{id}/role — change a teammate's role ──────────────────
    public UserResponse updateRole(String companyId, String targetUserId,
                                   String requestingUserId, RoleUpdateRequest request) {

        if (targetUserId.equals(requestingUserId)) {
            throw AppException.forbidden("You cannot change your own role.");
        }
        if (request.getRole() == Role.SUPER_ADMIN) {
            throw AppException.badRequest("Cannot assign the SUPER_ADMIN role.");
        }

        User user = getCompanyUserOrThrow(targetUserId, companyId);

        if (user.getRole() == Role.ADMIN && request.getRole() != Role.ADMIN
                && userRepository.countByCompanyIdAndRoleAndIsActiveTrue(companyId, Role.ADMIN) <= 1) {
            throw AppException.forbidden(
                    "Cannot change this user's role — they are the last active admin for this company.");
        }

        Role previousRole = user.getRole();
        user.setRole(request.getRole());
        user = userRepository.save(user);

        auditService.record(companyId, requestingUserId, Action.ROLE_CHANGE, "USER", targetUserId,
                "Changed role of " + user.getEmail() + " from " + previousRole + " to " + request.getRole(),
                Map.of("previousRole", previousRole.name(), "newRole", request.getRole().name()));

        log.info("Role for user {} changed to {} by {}", targetUserId, request.getRole(), requestingUserId);
        return toResponse(user);
    }

    // ── PATCH /api/users/{id}/deactivate ──────────────────────────────────────
    public UserResponse deactivate(String companyId, String targetUserId, String requestingUserId) {

        if (targetUserId.equals(requestingUserId)) {
            throw AppException.forbidden("You cannot deactivate your own account.");
        }

        User user = getCompanyUserOrThrow(targetUserId, companyId);

        if (user.getRole() == Role.ADMIN
                && userRepository.countByCompanyIdAndRoleAndIsActiveTrue(companyId, Role.ADMIN) <= 1) {
            throw AppException.forbidden(
                    "Cannot deactivate this user — they are the last active admin for this company.");
        }

        user.setActive(false);
        user = userRepository.save(user);

        auditService.record(companyId, requestingUserId, Action.DEACTIVATE, "USER", targetUserId,
                "Deactivated " + user.getEmail());

        log.info("User {} deactivated by {}", targetUserId, requestingUserId);
        return toResponse(user);
    }

    // ── PATCH /api/users/{id}/reactivate ──────────────────────────────────────
    public UserResponse reactivate(String companyId, String targetUserId, String requestingUserId) {
        User user = getCompanyUserOrThrow(targetUserId, companyId);
        user.setActive(true);
        user = userRepository.save(user);

        auditService.record(companyId, requestingUserId, Action.REACTIVATE, "USER", targetUserId,
                "Reactivated " + user.getEmail());

        log.info("User {} reactivated by {}", targetUserId, requestingUserId);
        return toResponse(user);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private User getCompanyUserOrThrow(String userId, String companyId) {
        return userRepository.findByIdAndCompanyId(userId, companyId)
                .orElseThrow(() -> AppException.notFound("User not found"));
    }

    private String generateTemporaryPassword() {
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(12);
        for (int i = 0; i < 12; i++) {
            sb.append(TEMP_PASSWORD_CHARS.charAt(random.nextInt(TEMP_PASSWORD_CHARS.length())));
        }
        return sb.toString();
    }

    private UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .mobile(user.getMobile())
                .role(user.getRole())
                .active(user.isActive())
                .lastLogin(user.getLastLogin())
                .createdAt(user.getCreatedAt())
                .build();
    }
}