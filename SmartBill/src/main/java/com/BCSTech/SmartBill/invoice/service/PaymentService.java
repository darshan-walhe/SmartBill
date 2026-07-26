package com.BCSTech.SmartBill.invoice.service;

import com.BCSTech.SmartBill.invoice.dto.InvoiceDTOs.PaymentRequest;
import com.BCSTech.SmartBill.invoice.dto.InvoiceDTOs.InvoiceResponse;
import com.BCSTech.SmartBill.invoice.model.Payment;
import com.BCSTech.SmartBill.invoice.repository.PaymentRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final InvoiceService invoiceService;

    // ── Record payment — delegates to InvoiceService ──────────────────────────
    // PaymentService is the entry point from PaymentController
    // Actual logic lives in InvoiceService to keep invoice state consistent
    public InvoiceResponse recordPayment(String invoiceId, String companyId,
                                         String userId, PaymentRequest request) {
        return invoiceService.recordPayment(invoiceId, companyId, userId, request);
    }

    // ── Payment history for a customer ────────────────────────────────────────
    public List<PaymentRecord> getCustomerPayments(String companyId, String customerId) {
        return paymentRepository.findByCustomerId(companyId, customerId)
                .stream()
                .map(this::toRecord)
                .collect(Collectors.toList());
    }

    // ── Payment method breakdown — for dashboard donut chart ──────────────────
    public List<PaymentMethodStat> getMethodBreakdown(String companyId,
                                                      LocalDate from, LocalDate to) {
        List<Payment> all = paymentRepository.findAllByCompanyId(companyId)
                .stream()
                .filter(p -> p.getPaymentDate() != null
                        && !p.getPaymentDate().isBefore(from)
                        && !p.getPaymentDate().isAfter(to))
                .collect(Collectors.toList());

        // Group by payment method and sum amounts
        Map<Payment.PaymentMethod, BigDecimal> grouped = all.stream()
                .collect(Collectors.groupingBy(
                        Payment::getPaymentMethod,
                        Collectors.reducing(BigDecimal.ZERO,
                                Payment::getAmountInr, BigDecimal::add)
                ));

        BigDecimal grandTotal = grouped.values().stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return grouped.entrySet().stream()
                .map(e -> PaymentMethodStat.builder()
                        .method(e.getKey())
                        .totalAmount(e.getValue())
                        .percentage(grandTotal.compareTo(BigDecimal.ZERO) > 0
                                ? e.getValue().multiply(BigDecimal.valueOf(100))
                                .divide(grandTotal, 2,
                                        java.math.RoundingMode.HALF_UP)
                                : BigDecimal.ZERO)
                        .build())
                .sorted((a, b) -> b.getTotalAmount().compareTo(a.getTotalAmount()))
                .collect(Collectors.toList());
    }

    // ── Total collected in date range — for cash book / dashboard ─────────────
    public BigDecimal getTotalCollected(String companyId, LocalDate from, LocalDate to) {
        return paymentRepository.sumCollectedBetween(companyId, from, to);
    }

    // ── All payments in date range — for cash book entries ────────────────────
    public List<PaymentRecord> getPaymentsInRange(String companyId,
                                                  LocalDate from, LocalDate to) {
        return paymentRepository.findAllByCompanyId(companyId)
                .stream()
                .filter(p -> p.getPaymentDate() != null
                        && !p.getPaymentDate().isBefore(from)
                        && !p.getPaymentDate().isAfter(to))
                .sorted((a, b) -> b.getPaymentDate().compareTo(a.getPaymentDate()))
                .map(this::toRecord)
                .collect(Collectors.toList());
    }

    // ── Mapper ────────────────────────────────────────────────────────────────
    private PaymentRecord toRecord(Payment p) {
        return PaymentRecord.builder()
                .id(p.getId())
                .amount(p.getAmount())
                .currencyCode(p.getCurrencyCode())
                .amountInr(p.getAmountInr())
                .paymentMethod(p.getPaymentMethod())
                .transactionReference(p.getTransactionReference())
                .paymentDate(p.getPaymentDate())
                .notes(p.getNotes())
                .build();
    }

    // ── Response DTOs ──────────────────────────────────────────────────────────
    @Data
    @Builder
    public static class PaymentRecord {
        private String id;
        private BigDecimal amount;
        private String currencyCode;
        private BigDecimal amountInr;
        private Payment.PaymentMethod paymentMethod;
        private String transactionReference;
        private LocalDate paymentDate;
        private String notes;
    }

    @Data
    @Builder
    public static class PaymentMethodStat {
        private Payment.PaymentMethod method;
        private BigDecimal totalAmount;
        private BigDecimal percentage;
    }
}