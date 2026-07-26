package com.BCSTech.SmartBill.invoice.service;

import com.BCSTech.SmartBill.invoice.model.InvoiceItem;
import lombok.experimental.UtilityClass;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Pure GST calculation logic — no Spring dependencies.
 * Used by InvoiceService and PurchaseService.
 *
 * Indian GST rules:
 *  - Intra-state (same state): CGST = taxRate/2, SGST = taxRate/2
 *  - Inter-state / Export:     IGST = taxRate
 */
@UtilityClass
public class GstCalculator {

    private static final int SCALE = 2;
    private static final RoundingMode ROUNDING = RoundingMode.HALF_UP;

    /**
     * Calculate all amounts for a single line item.
     *
     * @param productId      product id
     * @param productName    product name (snapshot)
     * @param hsnCode        HSN code (snapshot)
     * @param unit           unit (snapshot)
     * @param quantity       qty ordered
     * @param unitPrice      price per unit
     * @param discountPct    discount % (0-100)
     * @param taxRate        GST % (0, 5, 12, 18, 28)
     * @param isInterState   true → IGST only, false → CGST+SGST
     */
    public static InvoiceItem calculate(
            String productId, String productName, String hsnCode, String unit,
            int quantity, BigDecimal unitPrice, BigDecimal discountPct,
            BigDecimal taxRate, boolean isInterState) {

        // 1. Gross amount
        BigDecimal gross = unitPrice.multiply(BigDecimal.valueOf(quantity))
                .setScale(SCALE, ROUNDING);

        // 2. Discount
        BigDecimal discountAmount = gross
                .multiply(discountPct)
                .divide(BigDecimal.valueOf(100), SCALE, ROUNDING);

        // 3. Taxable value
        BigDecimal taxable = gross.subtract(discountAmount);

        // 4. GST split
        BigDecimal cgst = BigDecimal.ZERO;
        BigDecimal sgst = BigDecimal.ZERO;
        BigDecimal igst = BigDecimal.ZERO;
        BigDecimal taxAmount;

        if (taxRate.compareTo(BigDecimal.ZERO) > 0) {
            if (isInterState) {
                igst = taxable.multiply(taxRate)
                        .divide(BigDecimal.valueOf(100), SCALE, ROUNDING);
                taxAmount = igst;
            } else {
                BigDecimal halfRate = taxRate.divide(BigDecimal.valueOf(2), 2, ROUNDING);
                cgst = taxable.multiply(halfRate)
                        .divide(BigDecimal.valueOf(100), SCALE, ROUNDING);
                sgst = cgst;  // SGST = CGST always
                taxAmount = cgst.add(sgst);
            }
        } else {
            taxAmount = BigDecimal.ZERO;
        }

        // 5. Line total
        BigDecimal lineTotal = taxable.add(taxAmount);

        return InvoiceItem.builder()
                .productId(productId)
                .productName(productName)
                .hsnCode(hsnCode)
                .unit(unit)
                .quantity(quantity)
                .unitPrice(unitPrice)
                .discountPercent(discountPct)
                .discountAmount(discountAmount)
                .taxRate(taxRate)
                .cgst(cgst)
                .sgst(sgst)
                .igst(igst)
                .taxAmount(taxAmount)
                .lineTotal(lineTotal)
                .build();
    }

    /**
     * Round off to nearest rupee — returns the round-off adjustment.
     * E.g. total = 1234.60 → roundOff = 0.40, roundedTotal = 1235.00
     */
    public static BigDecimal getRoundOff(BigDecimal total) {
        BigDecimal rounded = total.setScale(0, RoundingMode.HALF_UP)
                .setScale(SCALE, ROUNDING);
        return rounded.subtract(total);
    }
}