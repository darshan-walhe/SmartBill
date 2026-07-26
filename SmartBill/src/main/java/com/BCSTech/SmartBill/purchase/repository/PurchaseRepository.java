package com.BCSTech.SmartBill.purchase.repository;

import com.BCSTech.SmartBill.purchase.model.Purchase;
import com.BCSTech.SmartBill.purchase.model.Purchase.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PurchaseRepository extends MongoRepository<Purchase, String> {

    Optional<Purchase> findByIdAndCompanyId(String id, String companyId);

    Page<Purchase> findByCompanyIdAndIsReturnFalse(String companyId, Pageable pageable);

    Page<Purchase> findByCompanyIdAndSupplierIdAndIsReturnFalse(
            String companyId, String supplierId, Pageable pageable);

    Page<Purchase> findByCompanyIdAndPaymentStatusAndIsReturnFalse(
            String companyId, PaymentStatus status, Pageable pageable);

    // Search by purchase number or supplier name
    @Query("{ 'companyId': ?0, 'isReturn': false, $or: [" +
            "{ 'purchaseNumber': { $regex: ?1, $options: 'i' } }," +
            "{ 'supplierName':   { $regex: ?1, $options: 'i' } } ] }")
    Page<Purchase> searchByCompanyId(String companyId, String keyword, Pageable pageable);

    // Date range — for GST input tax + reports
    List<Purchase> findByCompanyIdAndPurchaseDateBetweenAndIsReturnFalse(
            String companyId, LocalDate from, LocalDate to);

    // All returns for a company
    List<Purchase> findByCompanyIdAndIsReturnTrue(String companyId);

    // Returns against a specific purchase
    List<Purchase> findByReturnOfPurchaseIdAndCompanyId(
            String purchaseId, String companyId);

    // Last purchase number for sequence generation
    Optional<Purchase> findTopByCompanyIdOrderByCreatedAtDesc(String companyId);
}