package com.BCSTech.SmartBill.supplier.repository;

import com.BCSTech.SmartBill.supplier.model.Supplier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface SupplierRepository extends MongoRepository<Supplier, String> {

    Page<Supplier> findByCompanyIdAndActiveTrue(String companyId, Pageable pageable);

    @Query("{ 'companyId': ?0, 'active': true, $or: [ " +
            "{ 'name': { $regex: ?1, $options: 'i' } }, " +
            "{ 'mobile': { $regex: ?1, $options: 'i' } }, " +
            "{ 'email': { $regex: ?1, $options: 'i' } }, " +
            "{ 'gstin': { $regex: ?1, $options: 'i' } } ] }")
    Page<Supplier> searchByCompanyId(String companyId, String keyword, Pageable pageable);

    Optional<Supplier> findByIdAndCompanyId(String id, String companyId);

    boolean existsByMobileAndCompanyId(String mobile, String companyId);

    boolean existsByGstinAndCompanyId(String gstin, String companyId);

    // All suppliers with outstanding payable > 0
    List<Supplier> findByCompanyIdAndOutstandingAmountGreaterThanAndActiveTrue(
            String companyId, BigDecimal amount);

    long countByCompanyIdAndActiveTrue(String companyId);
}