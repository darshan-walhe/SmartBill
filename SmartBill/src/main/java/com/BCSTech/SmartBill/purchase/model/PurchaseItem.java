package com.BCSTech.SmartBill.purchase.model;

import lombok.*;
import org.springframework.data.annotation.Id;

import java.math.BigDecimal;

/**
 * Embedded inside Purchase document — mirrors InvoiceItem structure.
 * Snapshot of product data at time of purchase.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseItem {

    @Id
    private String id;

    private String productId;

    // Snapshot — copied from Product at purchase time
    private String productName;
    private String hsnCode;
    private String unit;

    private Integer quantity;

    private BigDecimal unitPrice;

    // GST rate on this item
    @Builder.Default
    private BigDecimal taxRate = BigDecimal.ZERO;

    // Input tax — split for intra/inter state
    @Builder.Default
    private BigDecimal cgst = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal sgst = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal igst = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;

    private BigDecimal lineTotal;
}