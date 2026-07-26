package com.BCSTech.SmartBill.invoice.model;

import lombok.*;
import org.springframework.data.annotation.Id;

import java.math.BigDecimal;

/**
 * Embedded inside Invoice document — not a separate collection.
 * Snapshot of product data at time of invoicing (price/tax may change later).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceItem {

    @Id
    private String id;

    private String productId;

    // Snapshot fields — copied from Product at invoice time
    private String productName;
    private String hsnCode;
    private String unit;

    private Integer quantity;

    private BigDecimal unitPrice;

    // Discount on this line item
    @Builder.Default
    private BigDecimal discountPercent = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    // GST rate applied
    @Builder.Default
    private BigDecimal taxRate = BigDecimal.ZERO;

    // Split GST for intra-state (CGST + SGST) or inter-state (IGST)
    @Builder.Default
    private BigDecimal cgst = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal sgst = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal igst = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;

    // Final line total after discount + tax
    private BigDecimal lineTotal;
}