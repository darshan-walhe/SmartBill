package com.BCSTech.SmartBill.company.repository;

import com.BCSTech.SmartBill.company.model.Company;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface CompanyRepository extends MongoRepository<Company, String> {

    Optional<Company> findByGstNumber(String gstNumber);

    boolean existsByGstNumber(String gstNumber);

    Optional<Company> findByCreatedByUserId(String userId);
}