package com.BCSTech.SmartBill.product.model;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "products")
@CompoundIndexes({
        @CompoundIndex(name = "company_sku",     def = "{'companyId': 1, 'sku': 1}",     unique = true),
        @CompoundIndex(name = "company_barcode", def = "{'companyId': 1, 'barcode': 1}"),
        @CompoundIndex(name = "company_name",    def = "{'companyId': 1, 'name': 1}")
})
public class Product {

    @Id
    private String id;

    @Indexed
    private String companyId;

    private String categoryId;

    private String name;

    // Stock Keeping Unit — unique per company
    private String sku;

    // HSN code for GST
    private String hsnCode;

    // Barcode for scanning
    private String barcode;

    // Unit of measurement — pcs, kg, bag, box, ltr, etc.
    @Builder.Default
    private String unit = "pcs";

    private BigDecimal purchasePrice;

    private BigDecimal salePrice;

    // GST tax rate — 0, 5, 12, 18, 28
    @Builder.Default
    private BigDecimal taxRate = BigDecimal.ZERO;

    // Current stock quantity
    @Builder.Default
    private Integer currentStock = 0;

    // Alert when stock falls below this level
    @Builder.Default
    private Integer lowStockThreshold = 10;

    // Reorder quantity suggestion
    @Builder.Default
    private Integer reorderQuantity = 50;

    private String imageUrl;

    private String description;

    @Builder.Default
    private boolean active = true;

    private String createdBy;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}