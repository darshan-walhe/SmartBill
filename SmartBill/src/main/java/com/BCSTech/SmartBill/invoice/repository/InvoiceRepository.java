package com.BCSTech.SmartBill.invoice.repository;

import com.BCSTech.SmartBill.invoice.model.Invoice;
import com.BCSTech.SmartBill.invoice.model.Invoice.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.Aggregation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends MongoRepository<Invoice, String> {

    Optional<Invoice> findByIdAndCompanyId(String id, String companyId);

    Optional<Invoice> findByInvoiceNumberAndCompanyId(String invoiceNumber, String companyId);

    Page<Invoice> findByCompanyIdAndPaymentStatusNot(
            String companyId, PaymentStatus status, Pageable pageable);

    // Filter by status
    Page<Invoice> findByCompanyIdAndPaymentStatus(
            String companyId, PaymentStatus status, Pageable pageable);

    // Filter by customer
    Page<Invoice> findByCompanyIdAndCustomerId(
            String companyId, String customerId, Pageable pageable);

    // Search by invoice number or customer name
    @Query("{ 'companyId': ?0, 'paymentStatus': { $ne: 'CANCELLED' }, $or: [" +
            "{ 'invoiceNumber':  { $regex: ?1, $options: 'i' } }," +
            "{ 'customerName':   { $regex: ?1, $options: 'i' } } ] }")
    Page<Invoice> searchByCompanyId(String companyId, String keyword, Pageable pageable);

    // Date range — for GST reports + dashboard
    List<Invoice> findByCompanyIdAndInvoiceDateBetweenAndPaymentStatusNot(
            String companyId, LocalDate from, LocalDate to, PaymentStatus status);

    // Overdue invoices — due date passed, not fully paid
    @Query("{ 'companyId': ?0, 'dueDate': { $lt: ?1 }, " +
            "'paymentStatus': { $in: ['UNPAID','PARTIAL'] } }")
    List<Invoice> findOverdueInvoices(String companyId, LocalDate today);

    // Last invoice number sequence — to generate next number
    Optional<Invoice> findTopByCompanyIdOrderByCreatedAtDesc(String companyId);

    // Total sales amount for dashboard
    @Aggregation(pipeline = {
            "{ $match: { 'companyId': ?0, 'paymentStatus': { $ne: 'CANCELLED' }, " +
                    "            'invoiceDate': { $gte: ?1, $lte: ?2 } } }",
            "{ $group: { _id: null, total: { $sum: '$totalAmountInr' } } }"
    })
    BigDecimal sumTotalAmountByCompanyAndDateRange(
            String companyId, LocalDate from, LocalDate to);
}