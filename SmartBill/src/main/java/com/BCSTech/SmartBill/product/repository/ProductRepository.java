package com.BCSTech.SmartBill.product.repository;

import com.BCSTech.SmartBill.product.model.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends MongoRepository<Product, String> {

    Page<Product> findByCompanyIdAndActiveTrue(String companyId, Pageable pageable);

    // Search by name, SKU, barcode or HSN code
    @Query("{ 'companyId': ?0, 'active': true, $or: [ " +
            "{ 'name':    { $regex: ?1, $options: 'i' } }, " +
            "{ 'sku':     { $regex: ?1, $options: 'i' } }, " +
            "{ 'barcode': { $regex: ?1, $options: 'i' } }, " +
            "{ 'hsnCode': { $regex: ?1, $options: 'i' } } ] }")
    Page<Product> searchByCompanyId(String companyId, String keyword, Pageable pageable);

    // Filter by category
    Page<Product> findByCompanyIdAndCategoryIdAndActiveTrue(
            String companyId, String categoryId, Pageable pageable);

    Optional<Product> findByIdAndCompanyId(String id, String companyId);

    Optional<Product> findByBarcodeAndCompanyId(String barcode, String companyId);

    Optional<Product> findBySkuAndCompanyId(String sku, String companyId);

    // Low stock products — for alerts and dashboard
    @Query("{ 'companyId': ?0, 'active': true, $expr: { $lte: ['$currentStock', '$lowStockThreshold'] } }")
    List<Product> findLowStockByCompanyId(String companyId);

    // Out of stock
    List<Product> findByCompanyIdAndCurrentStockAndActiveTrue(String companyId, Integer stock);

    boolean existsBySkuAndCompanyId(String sku, String companyId);

    boolean existsByBarcodeAndCompanyId(String barcode, String companyId);

    long countByCompanyIdAndActiveTrue(String companyId);
}