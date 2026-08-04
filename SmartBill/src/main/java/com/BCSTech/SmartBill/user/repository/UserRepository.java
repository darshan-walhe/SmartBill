package com.BCSTech.SmartBill.user.repository;

import com.BCSTech.SmartBill.user.model.Role;
import com.BCSTech.SmartBill.user.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);

    Optional<User> findByMobile(String mobile);

    Optional<User> findByGoogleId(String googleId);

    boolean existsByEmail(String email);

    boolean existsByMobile(String mobile);

    // Used by SuperAdminBootstrap to check whether a SUPER_ADMIN already
    // exists before creating one on startup.
    boolean existsByRole(Role role);

    // Tenant-scoped lookup — always use this (not findById) when acting on a
    // user referenced from a request, so one company can never touch another
    // company's user by guessing/enumerating an id.
    Optional<User> findByIdAndCompanyId(String id, String companyId);

    Page<User> findByCompanyId(String companyId, Pageable pageable);

    // Used to stop the last active admin of a company from being demoted or
    // deactivated, which would otherwise lock every user out of admin actions.
    long countByCompanyIdAndRoleAndIsActiveTrue(String companyId, Role role);
}