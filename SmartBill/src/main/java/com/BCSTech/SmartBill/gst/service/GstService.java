package com.BCSTech.SmartBill.gst.service;

import com.BCSTech.SmartBill.gst.dto.GstDTOs;
import com.BCSTech.SmartBill.gst.dto.GstDTOs.*;
import com.BCSTech.SmartBill.invoice.model.Invoice;
import com.BCSTech.SmartBill.invoice.model.InvoiceItem;
import com.BCSTech.SmartBill.invoice.repository.InvoiceRepository;
import com.BCSTech.SmartBill.purchase.model.Purchase;
import com.BCSTech.SmartBill.purchase.service.PurchaseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Month;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GstService {

    private final InvoiceRepository invoiceRepository;
    private final PurchaseService   purchaseService;

    // ══════════════════════════════════════════════════════════════
    //  GSTR-1 — Outward Supply Report
    // ══════════════════════════════════════════════════════════════
    public Gstr1Report getGstr1(String companyId, LocalDate from, LocalDate to) {

        // Fetch all non-cancelled invoices in date range
        List<Invoice> invoices = invoiceRepository
                .findByCompanyIdAndInvoiceDateBetweenAndPaymentStatusNot(
                        companyId, from, to, Invoice.PaymentStatus.CANCELLED);

        // ── Totals ────────────────────────────────────────────────────────────
        BigDecimal totalTaxable = invoices.stream()
                .map(Invoice::getTaxableAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCgst = invoices.stream()
                .map(Invoice::getTotalCgst)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSgst = invoices.stream()
                .map(Invoice::getTotalSgst)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalIgst = invoices.stream()
                .map(Invoice::getTotalIgst)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalGst = totalCgst.add(totalSgst).add(totalIgst);

        // ── B2B vs B2C vs Export split ────────────────────────────────────────
        BigDecimal b2bAmount = invoices.stream()
                .filter(i -> i.getCustomerGstin() != null
                        && !i.getCustomerGstin().isBlank()
                        && i.getInvoiceType() != Invoice.InvoiceType.EXPORT_INVOICE)
                .map(Invoice::getTaxableAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal exportAmount = invoices.stream()
                .filter(i -> i.getInvoiceType() == Invoice.InvoiceType.EXPORT_INVOICE)
                .map(Invoice::getTaxableAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal b2cAmount = totalTaxable.subtract(b2bAmount).subtract(exportAmount);

        // ── HSN Summary ───────────────────────────────────────────────────────
        List<HsnSummary> hsnSummary = buildHsnSummary(invoices);

        // ── Invoice details list ──────────────────────────────────────────────
        List<InvoiceGstDetail> details = invoices.stream()
                .map(inv -> InvoiceGstDetail.builder()
                        .invoiceNumber(inv.getInvoiceNumber())
                        .invoiceDate(inv.getInvoiceDate())
                        .customerName(inv.getCustomerName())
                        .customerGstin(inv.getCustomerGstin())
                        .invoiceType(resolveInvoiceType(inv))
                        .taxableAmount(inv.getTaxableAmount())
                        .cgst(inv.getTotalCgst())
                        .sgst(inv.getTotalSgst())
                        .igst(inv.getTotalIgst())
                        .totalAmount(inv.getTotalAmount())
                        .currencyCode(inv.getCurrencyCode())
                        .build())
                .collect(Collectors.toList());

        return Gstr1Report.builder()
                .financialYear(getFinancialYear(from))
                .period(from.getMonth().name() + " " + from.getYear())
                .from(from)
                .to(to)
                .totalTaxableTurnover(totalTaxable)
                .totalCgst(totalCgst)
                .totalSgst(totalSgst)
                .totalIgst(totalIgst)
                .totalGstCollected(totalGst)
                .b2bTaxableAmount(b2bAmount)
                .b2cTaxableAmount(b2cAmount)
                .exportTaxableAmount(exportAmount)
                .hsnSummary(hsnSummary)
                .invoices(details)
                .build();
    }

    // ══════════════════════════════════════════════════════════════
    //  GSTR-3B — Monthly Summary Return
    // ══════════════════════════════════════════════════════════════
    public Gstr3bReport getGstr3b(String companyId, LocalDate from, LocalDate to) {

        // Outward supplies (sales)
        List<Invoice> invoices = invoiceRepository
                .findByCompanyIdAndInvoiceDateBetweenAndPaymentStatusNot(
                        companyId, from, to, Invoice.PaymentStatus.CANCELLED);

        BigDecimal outwardTaxable = invoices.stream()
                .map(Invoice::getTaxableAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal outwardCgst = invoices.stream()
                .map(Invoice::getTotalCgst)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal outwardSgst = invoices.stream()
                .map(Invoice::getTotalSgst)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal outwardIgst = invoices.stream()
                .map(Invoice::getTotalIgst)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal outwardTotal = outwardCgst.add(outwardSgst).add(outwardIgst);

        // Input Tax Credit (purchases)
        List<Purchase> purchases = purchaseService
                .getPurchasesInDateRange(companyId, from, to);

        BigDecimal inputCgst = purchases.stream()
                .map(Purchase::getTotalCgst)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal inputSgst = purchases.stream()
                .map(Purchase::getTotalSgst)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal inputIgst = purchases.stream()
                .map(Purchase::getTotalIgst)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalInput = inputCgst.add(inputSgst).add(inputIgst);

        // Net payable after ITC set-off
        BigDecimal netCgst = outwardCgst.subtract(inputCgst).max(BigDecimal.ZERO);
        BigDecimal netSgst = outwardSgst.subtract(inputSgst).max(BigDecimal.ZERO);
        BigDecimal netIgst = outwardIgst.subtract(inputIgst).max(BigDecimal.ZERO);
        BigDecimal netTotal = netCgst.add(netSgst).add(netIgst)
                .setScale(2, RoundingMode.HALF_UP);

        return Gstr3bReport.builder()
                .financialYear(getFinancialYear(from))
                .period(from.getMonth().name() + " " + from.getYear())
                .from(from)
                .to(to)
                .outwardTaxableAmount(outwardTaxable)
                .outwardCgst(outwardCgst)
                .outwardSgst(outwardSgst)
                .outwardIgst(outwardIgst)
                .outwardTotalTax(outwardTotal)
                .inputCgst(inputCgst)
                .inputSgst(inputSgst)
                .inputIgst(inputIgst)
                .totalInputTax(totalInput)
                .netCgstPayable(netCgst)
                .netSgstPayable(netSgst)
                .netIgstPayable(netIgst)
                .netTaxPayable(netTotal)
                .isRefundable(totalInput.compareTo(outwardTotal) > 0)
                .build();
    }

    // ══════════════════════════════════════════════════════════════
    //  HSN Summary (standalone — also embedded in GSTR-1)
    // ══════════════════════════════════════════════════════════════
    public List<HsnSummary> getHsnSummary(String companyId,
                                          LocalDate from, LocalDate to) {
        List<Invoice> invoices = invoiceRepository
                .findByCompanyIdAndInvoiceDateBetweenAndPaymentStatusNot(
                        companyId, from, to, Invoice.PaymentStatus.CANCELLED);
        return buildHsnSummary(invoices);
    }

    // ══════════════════════════════════════════════════════════════
    //  Tax Slab Breakdown
    // ══════════════════════════════════════════════════════════════
    public List<TaxSlabBreakdown> getTaxSlabBreakdown(String companyId,
                                                      LocalDate from, LocalDate to) {
        List<Invoice> invoices = invoiceRepository
                .findByCompanyIdAndInvoiceDateBetweenAndPaymentStatusNot(
                        companyId, from, to, Invoice.PaymentStatus.CANCELLED);

        // Group all line items by tax rate
        Map<BigDecimal, List<InvoiceItem>> byTaxRate = invoices.stream()
                .flatMap(inv -> inv.getItems().stream())
                .collect(Collectors.groupingBy(InvoiceItem::getTaxRate));

        return byTaxRate.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    List<InvoiceItem> items = entry.getValue();
                    BigDecimal taxable = items.stream()
                            .map(i -> i.getUnitPrice()
                                    .multiply(BigDecimal.valueOf(i.getQuantity()))
                                    .subtract(i.getDiscountAmount()))
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    BigDecimal cgst = items.stream().map(InvoiceItem::getCgst)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal sgst = items.stream().map(InvoiceItem::getSgst)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal igst = items.stream().map(InvoiceItem::getIgst)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    return TaxSlabBreakdown.builder()
                            .taxRate(entry.getKey())
                            .taxableAmount(taxable)
                            .cgst(cgst)
                            .sgst(sgst)
                            .igst(igst)
                            .totalTax(cgst.add(sgst).add(igst))
                            .invoiceCount((int) invoices.stream()
                                    .filter(inv -> inv.getItems().stream()
                                            .anyMatch(i -> i.getTaxRate()
                                                    .compareTo(entry.getKey()) == 0))
                                    .count())
                            .build();
                })
                .collect(Collectors.toList());
    }

    // ══════════════════════════════════════════════════════════════
    //  Financial Year Filing Status Calendar
    // ══════════════════════════════════════════════════════════════
    public List<FilingStatus> getFilingStatusForFY(String companyId, String fy) {
        // Parse FY — "2024-25" → April 2024 to March 2025
        int startYear = Integer.parseInt(fy.split("-")[0]);
        LocalDate fyStart = LocalDate.of(startYear, 4, 1);

        List<FilingStatus> statuses = new ArrayList<>();

        for (int i = 0; i < 12; i++) {
            LocalDate monthStart = fyStart.plusMonths(i);
            LocalDate monthEnd   = monthStart.withDayOfMonth(
                    monthStart.lengthOfMonth());

            // Only show past or current months
            if (monthStart.isAfter(LocalDate.now())) {
                statuses.add(FilingStatus.builder()
                        .month(monthStart.getMonth().name() + " " + monthStart.getYear())
                        .from(monthStart)
                        .to(monthEnd)
                        .hasSales(false)
                        .hasPurchases(false)
                        .totalSales(BigDecimal.ZERO)
                        .totalPurchases(BigDecimal.ZERO)
                        .netTaxPayable(BigDecimal.ZERO)
                        .build());
                continue;
            }

            List<Invoice> monthInvoices = invoiceRepository
                    .findByCompanyIdAndInvoiceDateBetweenAndPaymentStatusNot(
                            companyId, monthStart, monthEnd,
                            Invoice.PaymentStatus.CANCELLED);

            List<Purchase> monthPurchases = purchaseService
                    .getPurchasesInDateRange(companyId, monthStart, monthEnd);

            BigDecimal sales = monthInvoices.stream()
                    .map(Invoice::getTotalAmountInr)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal purchases = monthPurchases.stream()
                    .map(Purchase::getTotalAmountInr)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Simplified net tax
            BigDecimal outGst = monthInvoices.stream()
                    .map(Invoice::getTotalTax)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal inGst = monthPurchases.stream()
                    .map(Purchase::getTotalTax)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            statuses.add(FilingStatus.builder()
                    .month(monthStart.getMonth().name() + " " + monthStart.getYear())
                    .from(monthStart)
                    .to(monthEnd)
                    .hasSales(!monthInvoices.isEmpty())
                    .hasPurchases(!monthPurchases.isEmpty())
                    .totalSales(sales)
                    .totalPurchases(purchases)
                    .netTaxPayable(outGst.subtract(inGst).max(BigDecimal.ZERO))
                    .build());
        }

        return statuses;
    }

    // ══════════════════════════════════════════════════════════════
    //  PRIVATE HELPERS
    // ══════════════════════════════════════════════════════════════
    private List<HsnSummary> buildHsnSummary(List<Invoice> invoices) {
        // Group all line items by HSN code
        Map<String, List<InvoiceItem>> byHsn = invoices.stream()
                .flatMap(inv -> inv.getItems().stream())
                .filter(item -> item.getHsnCode() != null
                        && !item.getHsnCode().isBlank())
                .collect(Collectors.groupingBy(InvoiceItem::getHsnCode));

        return byHsn.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    List<InvoiceItem> items = entry.getValue();
                    int totalQty = items.stream()
                            .mapToInt(InvoiceItem::getQuantity).sum();

                    BigDecimal taxable = items.stream()
                            .map(i -> i.getUnitPrice()
                                    .multiply(BigDecimal.valueOf(i.getQuantity()))
                                    .subtract(i.getDiscountAmount()))
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    BigDecimal cgst = items.stream().map(InvoiceItem::getCgst)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal sgst = items.stream().map(InvoiceItem::getSgst)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal igst = items.stream().map(InvoiceItem::getIgst)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    BigDecimal taxRate = items.get(0).getTaxRate();
                    String unit = items.get(0).getUnit();
                    String name = items.get(0).getProductName();

                    return HsnSummary.builder()
                            .hsnCode(entry.getKey())
                            .productDescription(name)
                            .uqc(toUqc(unit))
                            .totalQuantity(totalQty)
                            .taxableValue(taxable)
                            .cgst(cgst)
                            .sgst(sgst)
                            .igst(igst)
                            .totalTax(cgst.add(sgst).add(igst))
                            .taxRate(taxRate)
                            .build();
                })
                .collect(Collectors.toList());
    }

    private String resolveInvoiceType(Invoice inv) {
        if (inv.getInvoiceType() == Invoice.InvoiceType.EXPORT_INVOICE) return "EXPORT";
        if (inv.getCustomerGstin() != null && !inv.getCustomerGstin().isBlank()) return "B2B";
        return "B2C";
    }

    private String getFinancialYear(LocalDate date) {
        int year = date.getYear();
        int month = date.getMonthValue();
        // Indian FY: April to March
        if (month >= 4) {
            return year + "-" + String.valueOf(year + 1).substring(2);
        } else {
            return (year - 1) + "-" + String.valueOf(year).substring(2);
        }
    }

    // Convert unit to GST UQC (Unit Quantity Code)
    private String toUqc(String unit) {
        if (unit == null) return "OTH";
        return switch (unit.toLowerCase()) {
            case "kg", "kgs"    -> "KGS";
            case "pcs", "piece" -> "PCS";
            case "bag", "bags"  -> "BAG";
            case "box", "boxes" -> "BOX";
            case "ltr", "litre" -> "LTR";
            case "mtr", "meter" -> "MTR";
            case "nos"          -> "NOS";
            default             -> "OTH";
        };
    }
}