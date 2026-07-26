package com.BCSTech.SmartBill.invoice.repository;

import com.BCSTech.SmartBill.invoice.model.Invoice;
import com.BCSTech.SmartBill.invoice.model.Payment;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Payments are embedded inside Invoice documents — there is no separate
 * payments collection. This repository provides payment-centric queries
 * by scanning invoice.payments[] using MongoTemplate aggregations.
 *
 * Use InvoiceRepository for invoice-level queries.
 * Use PaymentRepository for payment-level queries (e.g. cash book, payment history).
 */
@Repository
@RequiredArgsConstructor
public class PaymentRepository {

    private final MongoTemplate mongoTemplate;
    private final InvoiceRepository invoiceRepository;

    // All payments for a company — flattened from all invoices
    // Used in Cash Book (Accounts module)
    public List<Payment> findAllByCompanyId(String companyId) {
        Query query = new Query(
                Criteria.where("companyId").is(companyId)
                        .and("payments").exists(true)
        );
        return mongoTemplate.find(query, Invoice.class)
                .stream()
                .flatMap(invoice -> invoice.getPayments().stream())
                .collect(Collectors.toList());
    }

    // Payments by method — for payment method breakdown (dashboard donut chart)
    public List<Payment> findByCompanyIdAndMethod(String companyId,
                                                  Payment.PaymentMethod method) {
        Query query = new Query(
                Criteria.where("companyId").is(companyId)
                        .and("payments.paymentMethod").is(method.name())
        );
        return mongoTemplate.find(query, Invoice.class)
                .stream()
                .flatMap(inv -> inv.getPayments().stream())
                .filter(p -> p.getPaymentMethod() == method)
                .collect(Collectors.toList());
    }

    // Total collected in a date range — for dashboard + cash book
    public BigDecimal sumCollectedBetween(String companyId,
                                          LocalDate from, LocalDate to) {
        Query query = new Query(
                Criteria.where("companyId").is(companyId)
                        .and("payments").exists(true)
        );
        return mongoTemplate.find(query, Invoice.class)
                .stream()
                .flatMap(inv -> inv.getPayments().stream())
                .filter(p -> p.getPaymentDate() != null
                        && !p.getPaymentDate().isBefore(from)
                        && !p.getPaymentDate().isAfter(to))
                .map(Payment::getAmountInr)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // All payments for a specific customer across all their invoices
    public List<Payment> findByCustomerId(String companyId, String customerId) {
        Query query = new Query(
                Criteria.where("companyId").is(companyId)
                        .and("customerId").is(customerId)
                        .and("payments").exists(true)
        );
        return mongoTemplate.find(query, Invoice.class)
                .stream()
                .flatMap(inv -> inv.getPayments().stream())
                .collect(Collectors.toList());
    }
}