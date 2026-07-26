package com.BCSTech.SmartBill.customer.repository;

import com.BCSTech.SmartBill.customer.model.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface CustomerRepository extends MongoRepository<Customer, String> {

    // Paginated list for a company
    Page<Customer> findByCompanyIdAndActiveTrue(String companyId, Pageable pageable);

    // Search by name, mobile, or email
    @Query("{ 'companyId': ?0, 'active': true, $or: [ " +
            "{ 'name': { $regex: ?1, $options: 'i' } }, " +
            "{ 'mobile': { $regex: ?1, $options: 'i' } }, " +
            "{ 'email': { $regex: ?1, $options: 'i' } }, " +
            "{ 'gstin': { $regex: ?1, $options: 'i' } } ] }")
    Page<Customer> searchByCompanyId(String companyId, String keyword, Pageable pageable);

    // Fetch single customer — always scoped to company
    Optional<Customer> findByIdAndCompanyId(String id, String companyId);

    // Check duplicate mobile within same company
    boolean existsByMobileAndCompanyId(String mobile, String companyId);

    // Check duplicate email within same company
    boolean existsByEmailAndCompanyId(String email, String companyId);

    // All customers with outstanding balance > 0 (for receivables dashboard)
    List<Customer> findByCompanyIdAndCurrentBalanceGreaterThanAndActiveTrue(
            String companyId, BigDecimal amount);

    // Count for dashboard KPI
    long countByCompanyIdAndActiveTrue(String companyId);
}