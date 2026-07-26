package com.BCSTech.SmartBill.gst.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class GstDTOs {

    // ── GSTR-1 — Outward Supply Summary ──────────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Gstr1Report {
        private String financialYear;    // e.g. "2024-25"
        private String period;           // e.g. "June 2024"
        private LocalDate from;
        private LocalDate to;

        // Top summary
        private BigDecimal totalTaxableTurnover;
        private BigDecimal totalCgst;
        private BigDecimal totalSgst;
        private BigDecimal totalIgst;
        private BigDecimal totalGstCollected;

        // Breakdown by invoice type
        private BigDecimal b2bTaxableAmount;    // B2B (GST registered customers)
        private BigDecimal b2cTaxableAmount;    // B2C (unregistered customers)
        private BigDecimal exportTaxableAmount; // Export invoices

        // HSN-wise summary
        private List<HsnSummary> hsnSummary;

        // Invoice list
        private List<InvoiceGstDetail> invoices;
    }

    // ── GSTR-3B — Monthly Return Summary ─────────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Gstr3bReport {
        private String financialYear;
        private String period;
        private LocalDate from;
        private LocalDate to;

        // 3.1 — Outward supplies (from sales invoices)
        private BigDecimal outwardTaxableAmount;
        private BigDecimal outwardCgst;
        private BigDecimal outwardSgst;
        private BigDecimal outwardIgst;
        private BigDecimal outwardTotalTax;

        // 4 — Input Tax Credit (from purchase invoices)
        private BigDecimal inputCgst;
        private BigDecimal inputSgst;
        private BigDecimal inputIgst;
        private BigDecimal totalInputTax;

        // Net payable
        private BigDecimal netCgstPayable;   // outwardCgst - inputCgst
        private BigDecimal netSgstPayable;
        private BigDecimal netIgstPayable;
        private BigDecimal netTaxPayable;    // total net after ITC
        private boolean isRefundable;        // if input > output
    }

    // ── HSN-wise summary (required in GSTR-1) ────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HsnSummary {
        private String hsnCode;
        private String productDescription;
        private String uqc;             // Unit Quantity Code (BAG, PCS, KGS etc.)
        private Integer totalQuantity;
        private BigDecimal taxableValue;
        private BigDecimal cgst;
        private BigDecimal sgst;
        private BigDecimal igst;
        private BigDecimal totalTax;
        private BigDecimal taxRate;
    }

    // ── Individual invoice detail for GSTR-1 ─────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvoiceGstDetail {
        private String invoiceNumber;
        private LocalDate invoiceDate;
        private String customerName;
        private String customerGstin;   // null = B2C
        private String invoiceType;     // B2B / B2C / EXPORT
        private BigDecimal taxableAmount;
        private BigDecimal cgst;
        private BigDecimal sgst;
        private BigDecimal igst;
        private BigDecimal totalAmount;
        private String currencyCode;
    }

    // ── Tax slab breakdown ────────────────────────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaxSlabBreakdown {
        private BigDecimal taxRate;        // 0, 5, 12, 18, 28
        private BigDecimal taxableAmount;
        private BigDecimal cgst;
        private BigDecimal sgst;
        private BigDecimal igst;
        private BigDecimal totalTax;
        private int invoiceCount;
    }

    // ── Filing status for FY calendar view ───────────────────────────────────
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FilingStatus {
        private String month;           // "April 2024"
        private LocalDate from;
        private LocalDate to;
        private boolean hasSales;
        private boolean hasPurchases;
        private BigDecimal totalSales;
        private BigDecimal totalPurchases;
        private BigDecimal netTaxPayable;
    }
}