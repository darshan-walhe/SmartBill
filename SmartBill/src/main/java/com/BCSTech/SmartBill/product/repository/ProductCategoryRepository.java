package com.BCSTech.SmartBill.product.repository;

import com.BCSTech.SmartBill.product.model.ProductCategory;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ProductCategoryRepository extends MongoRepository<ProductCategory, String> {

    List<ProductCategory> findByCompanyIdAndActiveTrue(String companyId);

    Optional<ProductCategory> findByIdAndCompanyId(String id, String companyId);

    boolean existsByNameAndCompanyId(String name, String companyId);
}