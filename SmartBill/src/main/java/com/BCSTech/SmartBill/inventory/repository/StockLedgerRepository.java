package com.BCSTech.SmartBill.inventory.repository;

import com.BCSTech.SmartBill.inventory.model.StockLedger;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface StockLedgerRepository extends MongoRepository<StockLedger, String> {

    // Full movement history for a single product
    Page<StockLedger> findByProductIdAndCompanyIdOrderByCreatedAtDesc(
            String productId, String companyId, Pageable pageable);

    // All movements for a company in date range — for reports
    List<StockLedger> findByCompanyIdAndCreatedAtBetweenOrderByCreatedAtDesc(
            String companyId, LocalDateTime from, LocalDateTime to);

    // All movements linked to a specific invoice or purchase
    List<StockLedger> findByReferenceIdAndCompanyId(String referenceId, String companyId);
}