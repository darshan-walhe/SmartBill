package com.BCSTech.SmartBill.invoice.service;

import com.BCSTech.SmartBill.common.exception.AppException;
import com.BCSTech.SmartBill.company.model.Company;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class InvoiceNumberGenerator {

    private final MongoTemplate mongoTemplate;

    /**
     * Generates and increments the invoice number atomically at the database level.
     * Format: {prefix}{YYYY}-{sequence padded to 4 digits}
     * Example: INV-2024-0001, INV-2024-0002, ...
     *
     * Uses MongoDB's findAndModify — a single atomic document operation — instead
     * of a Java `synchronized` block, so this is safe even when multiple app
     * instances are running behind a load balancer. findAndModify returns the
     * document as it was BEFORE the $inc is applied, so the sequence value we
     * read here is guaranteed not to be handed out to any other concurrent caller.
     */
    public String generate(String companyId) {
        Query query = new Query(Criteria.where("id").is(companyId));
        Update update = new Update().inc("invoiceSequence", 1);
        FindAndModifyOptions options = FindAndModifyOptions.options()
                .returnNew(false)   // we want the pre-increment value
                .upsert(false);

        Company before = mongoTemplate.findAndModify(query, update, options, Company.class);
        if (before == null) {
            throw AppException.notFound("Company not found");
        }

        int year = LocalDate.now().getYear();
        return String.format("%s%d-%04d", before.getInvoicePrefix(), year, before.getInvoiceSequence());
    }
}