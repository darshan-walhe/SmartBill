package com.BCSTech.SmartBill.product.dto;

import com.BCSTech.SmartBill.product.model.Product;
import com.BCSTech.SmartBill.product.model.ProductCategory;
import jakarta.validation.constraints.*;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ProductDTOs {

    // ── Category requests ──────────────────────────────────────────────────────
    @Data
    public static class CategoryRequest {
        @NotBlank(message = "Category name is required")
        private String name;
        private String description;
    }

    @Data
    @Builder
    public static class CategoryResponse {
        private String id;
        private String name;
        private String description;
    }

    // ── Product save request (create + update) ────────────────────────────────
    @Data
    public static class SaveRequest {

        @NotBlank(message = "Product name is required")
        private String name;

        private String categoryId;

        private String sku;

        private String hsnCode;

        private String barcode;

        private String unit;

        @NotNull(message = "Purchase price is required")
        @DecimalMin(value = "0.0", message = "Purchase price must be 0 or more")
        private BigDecimal purchasePrice;

        @NotNull(message = "Sale price is required")
        @DecimalMin(value = "0.0", message = "Sale price must be 0 or more")
        private BigDecimal salePrice;

        // GST rate: 0, 5, 12, 18, 28
        private BigDecimal taxRate;

        @Min(value = 0, message = "Opening stock cannot be negative")
        private Integer openingStock;

        @Min(value = 0, message = "Low stock threshold cannot be negative")
        private Integer lowStockThreshold;

        @Min(value = 0, message = "Reorder quantity cannot be negative")
        private Integer reorderQuantity;

        private String imageUrl;
        private String description;
    }

    // ── Full product response ─────────────────────────────────────────────────
    @Data
    @Builder
    public static class ProductResponse {
        private String id;
        private String companyId;
        private String categoryId;
        private String categoryName;
        private String name;
        private String sku;
        private String hsnCode;
        private String barcode;
        private String unit;
        private BigDecimal purchasePrice;
        private BigDecimal salePrice;
        private BigDecimal taxRate;
        private Integer currentStock;
        private Integer lowStockThreshold;
        private Integer reorderQuantity;
        private String imageUrl;
        private String description;
        private boolean lowStock;         // computed: currentStock <= lowStockThreshold
        private boolean outOfStock;       // computed: currentStock == 0
        private boolean active;
        private LocalDateTime createdAt;
    }

    // ── Summary for lists / invoice line item search ───────────────────────────
    @Data
    @Builder
    public static class ProductSummary {
        private String id;
        private String name;
        private String sku;
        private String barcode;
        private String hsnCode;
        private String unit;
        private BigDecimal salePrice;
        private BigDecimal taxRate;
        private Integer currentStock;
        private boolean lowStock;
        private boolean outOfStock;
    }

    // ── Stock stats for dashboard ─────────────────────────────────────────────
    @Data
    @Builder
    public static class StockStats {
        private long totalProducts;
        private long lowStockCount;
        private long outOfStockCount;
        private BigDecimal totalStockValue;    // sum of (currentStock * purchasePrice)
    }

    // ── Mappers ───────────────────────────────────────────────────────────────
    public static ProductResponse toResponse(Product p, String categoryName) {
        return ProductResponse.builder()
                .id(p.getId())
                .companyId(p.getCompanyId())
                .categoryId(p.getCategoryId())
                .categoryName(categoryName)
                .name(p.getName())
                .sku(p.getSku())
                .hsnCode(p.getHsnCode())
                .barcode(p.getBarcode())
                .unit(p.getUnit())
                .purchasePrice(p.getPurchasePrice())
                .salePrice(p.getSalePrice())
                .taxRate(p.getTaxRate())
                .currentStock(p.getCurrentStock())
                .lowStockThreshold(p.getLowStockThreshold())
                .reorderQuantity(p.getReorderQuantity())
                .imageUrl(p.getImageUrl())
                .description(p.getDescription())
                .lowStock(p.getCurrentStock() <= p.getLowStockThreshold())
                .outOfStock(p.getCurrentStock() == 0)
                .active(p.isActive())
                .createdAt(p.getCreatedAt())
                .build();
    }

    public static ProductSummary toSummary(Product p) {
        return ProductSummary.builder()
                .id(p.getId())
                .name(p.getName())
                .sku(p.getSku())
                .barcode(p.getBarcode())
                .hsnCode(p.getHsnCode())
                .unit(p.getUnit())
                .salePrice(p.getSalePrice())
                .taxRate(p.getTaxRate())
                .currentStock(p.getCurrentStock())
                .lowStock(p.getCurrentStock() <= p.getLowStockThreshold())
                .outOfStock(p.getCurrentStock() == 0)
                .build();
    }

    public static CategoryResponse toCategoryResponse(ProductCategory c) {
        return CategoryResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .description(c.getDescription())
                .build();
    }
}