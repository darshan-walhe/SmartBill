package com.BCSTech.SmartBill.common.config;

import com.BCSTech.SmartBill.user.model.AuthProvider;
import com.BCSTech.SmartBill.user.model.Role;
import com.BCSTech.SmartBill.user.model.User;
import com.BCSTech.SmartBill.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Creates the very first SUPER_ADMIN account on startup.
 *
 * SUPER_ADMIN is intentionally impossible to reach through any public API:
 * - /api/auth/register always creates a new company + an ADMIN, never SUPER_ADMIN
 * - POST /api/users/invite and PUT /api/users/{id}/role both explicitly
 *   reject Role.SUPER_ADMIN (see UserService)
 * So the first one has to be created out-of-band, from server-side
 * configuration the application operator controls — not from anything a
 * client can send over HTTP. Every SUPER_ADMIN after this one is created by
 * an existing SUPER_ADMIN via PATCH /api/admin/users/{id}/promote.
 *
 * A SUPER_ADMIN has no companyId (it isn't scoped to any single tenant) and
 * logs in through the normal POST /api/auth/login with these credentials.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SuperAdminBootstrap implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.super-admin.email:}")
    private String superAdminEmail;

    @Value("${app.super-admin.password:}")
    private String superAdminPassword;

    @Value("${app.super-admin.name:Platform Super Admin}")
    private String superAdminName;

    @Override
    public void run(String... args) {
        if (userRepository.existsByRole(Role.SUPER_ADMIN)) {
            return; // already bootstrapped — nothing to do on this or any later startup
        }

        if (!StringUtils.hasText(superAdminEmail) || !StringUtils.hasText(superAdminPassword)) {
            log.info("No SUPER_ADMIN account exists yet. Set SUPER_ADMIN_EMAIL and " +
                    "SUPER_ADMIN_PASSWORD env vars and restart the app to create one.");
            return;
        }

        if (userRepository.existsByEmail(superAdminEmail)) {
            log.warn("SUPER_ADMIN_EMAIL ({}) is already used by an existing account — " +
                    "not touching it. Use a different email, or promote that user instead via " +
                    "PATCH /api/admin/users/{{id}}/promote once a SUPER_ADMIN exists.",
                    superAdminEmail);
            return;
        }

        User superAdmin = User.builder()
                .name(superAdminName)
                .email(superAdminEmail)
                .passwordHash(passwordEncoder.encode(superAdminPassword))
                .role(Role.SUPER_ADMIN)
                .authProvider(AuthProvider.LOCAL)
                .isActive(true)
                // companyId intentionally left unset — a SUPER_ADMIN operates
                // across every company, not scoped to one.
                .build();

        userRepository.save(superAdmin);

        log.warn("Bootstrapped the first SUPER_ADMIN account ({}). " +
                "Remove SUPER_ADMIN_PASSWORD from the environment now that it's been used — " +
                "it's only read on startup when no SUPER_ADMIN exists yet.",
                superAdminEmail);
    }
}
