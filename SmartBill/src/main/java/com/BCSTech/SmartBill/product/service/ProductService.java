package com.BCSTech.SmartBill.product.service;

import com.BCSTech.SmartBill.common.exception.AppException;
import com.BCSTech.SmartBill.notification.model.NotificationType;
import com.BCSTech.SmartBill.notification.service.NotificationService;
import com.BCSTech.SmartBill.product.dto.ProductDTOs;
import com.BCSTech.SmartBill.product.dto.ProductDTOs.*;
import com.BCSTech.SmartBill.product.model.Product;
import com.BCSTech.SmartBill.product.model.ProductCategory;
import com.BCSTech.SmartBill.product.repository.ProductCategoryRepository;
import com.BCSTech.SmartBill.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final MongoTemplate mongoTemplate;
    private final NotificationService notificationService;
    private final ProductCategoryRepository categoryRepository;

    // ══════════════════════════════════════════════════════════════
    //  CATEGORY OPERATIONS
    // ══════════════════════════════════════════════════════════════

    public CategoryResponse createCategory(String companyId, CategoryRequest request) {
        if (categoryRepository.existsByNameAndCompanyId(request.getName(), companyId)) {
            throw AppException.conflict("Category '" + request.getName() + "' already exists.");
        }
        ProductCategory category = ProductCategory.builder()
                .companyId(companyId)
                .name(request.getName())
                .description(request.getDescription())
                .active(true)
                .build();
        return ProductDTOs.toCategoryResponse(categoryRepository.save(category));
    }

    public List<CategoryResponse> listCategories(String companyId) {
        return categoryRepository.findByCompanyIdAndActiveTrue(companyId)
                .stream()
                .map(ProductDTOs::toCategoryResponse)
                .collect(Collectors.toList());
    }

    public void deleteCategory(String categoryId, String companyId) {
        ProductCategory category = categoryRepository.findByIdAndCompanyId(categoryId, companyId)
                .orElseThrow(() -> AppException.notFound("Category not found"));
        category.setActive(false);
        categoryRepository.save(category);
    }

    // ══════════════════════════════════════════════════════════════
    //  PRODUCT OPERATIONS
    // ══════════════════════════════════════════════════════════════

    public ProductResponse create(String companyId, String userId, SaveRequest request) {

        // Auto-generate SKU if not provided
        String sku = (request.getSku() != null && !request.getSku().isBlank())
                ? request.getSku().toUpperCase()
                : generateSku(request.getName());

        if (productRepository.existsBySkuAndCompanyId(sku, companyId)) {
            throw AppException.conflict("A product with SKU '" + sku + "' already exists.");
        }

        if (request.getBarcode() != null
                && productRepository.existsByBarcodeAndCompanyId(request.getBarcode(), companyId)) {
            throw AppException.conflict("A product with this barcode already exists.");
        }

        int openingStock = request.getOpeningStock() != null ? request.getOpeningStock() : 0;

        Product product = Product.builder()
                .companyId(companyId)
                .categoryId(request.getCategoryId())
                .name(request.getName())
                .sku(sku)
                .hsnCode(request.getHsnCode())
                .barcode(request.getBarcode())
                .unit(request.getUnit() != null ? request.getUnit() : "pcs")
                .purchasePrice(request.getPurchasePrice())
                .salePrice(request.getSalePrice())
                .taxRate(request.getTaxRate() != null ? request.getTaxRate() : BigDecimal.ZERO)
                .currentStock(openingStock)
                .lowStockThreshold(request.getLowStockThreshold() != null
                        ? request.getLowStockThreshold() : 10)
                .reorderQuantity(request.getReorderQuantity() != null
                        ? request.getReorderQuantity() : 50)
                .imageUrl(request.getImageUrl())
                .description(request.getDescription())
                .createdBy(userId)
                .active(true)
                .build();

        product = productRepository.save(product);
        log.info("Product created: {} SKU: {} for company: {}", product.getId(), sku, companyId);

        String categoryName = getCategoryName(product.getCategoryId(), companyId);
        return ProductDTOs.toResponse(product, categoryName);
    }

    public ProductResponse update(String productId, String companyId, SaveRequest request) {
        Product product = getProductOrThrow(productId, companyId);

        // SKU conflict check — exclude current product
        if (request.getSku() != null
                && !request.getSku().equalsIgnoreCase(product.getSku())
                && productRepository.existsBySkuAndCompanyId(request.getSku().toUpperCase(), companyId)) {
            throw AppException.conflict("A product with SKU '" + request.getSku() + "' already exists.");
        }

        // Barcode conflict check
        if (request.getBarcode() != null
                && !request.getBarcode().equals(product.getBarcode())
                && productRepository.existsByBarcodeAndCompanyId(request.getBarcode(), companyId)) {
            throw AppException.conflict("A product with this barcode already exists.");
        }

        product.setName(request.getName());
        product.setCategoryId(request.getCategoryId());
        if (request.getSku() != null) product.setSku(request.getSku().toUpperCase());
        product.setHsnCode(request.getHsnCode());
        product.setBarcode(request.getBarcode());
        if (request.getUnit() != null) product.setUnit(request.getUnit());
        product.setPurchasePrice(request.getPurchasePrice());
        product.setSalePrice(request.getSalePrice());
        if (request.getTaxRate() != null) product.setTaxRate(request.getTaxRate());
        if (request.getLowStockThreshold() != null) product.setLowStockThreshold(request.getLowStockThreshold());
        if (request.getReorderQuantity() != null) product.setReorderQuantity(request.getReorderQuantity());
        product.setImageUrl(request.getImageUrl());
        product.setDescription(request.getDescription());

        product = productRepository.save(product);
        String categoryName = getCategoryName(product.getCategoryId(), companyId);
        return ProductDTOs.toResponse(product, categoryName);
    }

    public ProductResponse getById(String productId, String companyId) {
        Product product = getProductOrThrow(productId, companyId);
        String categoryName = getCategoryName(product.getCategoryId(), companyId);
        return ProductDTOs.toResponse(product, categoryName);
    }

    public ProductResponse getByBarcode(String barcode, String companyId) {
        Product product = productRepository.findByBarcodeAndCompanyId(barcode, companyId)
                .orElseThrow(() -> AppException.notFound("Product not found for barcode: " + barcode));
        String categoryName = getCategoryName(product.getCategoryId(), companyId);
        return ProductDTOs.toResponse(product, categoryName);
    }

    public Page<ProductSummary> list(String companyId, String keyword,
                                     String categoryId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("name").ascending());

        if (keyword != null && !keyword.isBlank()) {
            return productRepository.searchByCompanyId(companyId, keyword, pageable)
                    .map(ProductDTOs::toSummary);
        }
        if (categoryId != null && !categoryId.isBlank()) {
            return productRepository
                    .findByCompanyIdAndCategoryIdAndActiveTrue(companyId, categoryId, pageable)
                    .map(ProductDTOs::toSummary);
        }
        return productRepository.findByCompanyIdAndActiveTrue(companyId, pageable)
                .map(ProductDTOs::toSummary);
    }

    public void delete(String productId, String companyId) {
        Product product = getProductOrThrow(productId, companyId);
        product.setActive(false);
        productRepository.save(product);
    }

    // ── Low stock list — for dashboard alerts ─────────────────────────────────
    public List<ProductSummary> getLowStockProducts(String companyId) {
        return productRepository.findLowStockByCompanyId(companyId)
                .stream()
                .map(ProductDTOs::toSummary)
                .collect(Collectors.toList());
    }

    // ── Dashboard stats ───────────────────────────────────────────────────────
    public StockStats getStockStats(String companyId) {
        List<Product> allProducts = productRepository
                .findByCompanyIdAndActiveTrue(companyId, Pageable.unpaged())
                .getContent();

        long lowStockCount  = allProducts.stream()
                .filter(p -> p.getCurrentStock() <= p.getLowStockThreshold()
                        && p.getCurrentStock() > 0)
                .count();

        long outOfStockCount = allProducts.stream()
                .filter(p -> p.getCurrentStock() == 0)
                .count();

        BigDecimal totalStockValue = allProducts.stream()
                .map(p -> p.getPurchasePrice()
                        .multiply(BigDecimal.valueOf(p.getCurrentStock())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return StockStats.builder()
                .totalProducts(allProducts.size())
                .lowStockCount(lowStockCount)
                .outOfStockCount(outOfStockCount)
                .totalStockValue(totalStockValue)
                .build();
    }

    // ── Called by InventoryService to adjust stock ────────────────────────────
    // Atomic at the DB level: the stock-sufficiency check and the decrement
    // happen as a single findAndModify document operation. The previous
    // implementation did read -> check -> save, which meant two concurrent
    // invoices for the last unit of stock could both read currentStock=1,
    // both pass the check, and both succeed (overselling).
    public void adjustStock(String productId, String companyId, int delta) {
        Query query = new Query(Criteria.where("id").is(productId).and("companyId").is(companyId));
        if (delta < 0) {
            // Only allow the decrement to go through if enough stock is present —
            // enforced as part of the same atomic operation, not a separate read.
            query.addCriteria(Criteria.where("currentStock").gte(-delta));
        }
        Update update = new Update().inc("currentStock", delta);
        FindAndModifyOptions options = FindAndModifyOptions.options().returnNew(true);

        Product updated = mongoTemplate.findAndModify(query, update, options, Product.class);

        if (updated == null) {
            // Either the product doesn't exist, or (for stock-out movements)
            // there wasn't enough stock — disambiguate with a plain lookup.
            Product existing = getProductOrThrow(productId, companyId);
            throw AppException.badRequest(
                    "Insufficient stock for '" + existing.getName() +
                            "'. Available: " + existing.getCurrentStock() + ", Required: " + Math.abs(delta));
        }

        // Low stock warning — log + persist a notification so it shows up in the UI
        if (updated.getCurrentStock() <= updated.getLowStockThreshold()) {
            log.warn("LOW STOCK: {} (SKU: {}) — {} units remaining (threshold: {})",
                    updated.getName(), updated.getSku(), updated.getCurrentStock(), updated.getLowStockThreshold());

            NotificationType type = updated.getCurrentStock() <= 0
                    ? NotificationType.OUT_OF_STOCK : NotificationType.LOW_STOCK;
            String title = type == NotificationType.OUT_OF_STOCK
                    ? "Out of stock: " + updated.getName()
                    : "Low stock: " + updated.getName();

            notificationService.notifyCompany(companyId, type, title,
                    updated.getName() + " (SKU: " + updated.getSku() + ") has "
                            + updated.getCurrentStock() + " units remaining.",
                    "PRODUCT", updated.getId());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    public Product getProductOrThrow(String productId, String companyId) {
        return productRepository.findByIdAndCompanyId(productId, companyId)
                .orElseThrow(() -> AppException.notFound("Product not found"));
    }

    private String getCategoryName(String categoryId, String companyId) {
        if (categoryId == null) return null;
        return categoryRepository.findByIdAndCompanyId(categoryId, companyId)
                .map(ProductCategory::getName)
                .orElse(null);
    }

    private String generateSku(String productName) {
        // Take first 4 chars of name + 4 random hex chars
        String prefix = productName.toUpperCase()
                .replaceAll("[^A-Z0-9]", "")
                .substring(0, Math.min(4, productName.length()));
        String suffix = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        return prefix + "-" + suffix;
    }
}