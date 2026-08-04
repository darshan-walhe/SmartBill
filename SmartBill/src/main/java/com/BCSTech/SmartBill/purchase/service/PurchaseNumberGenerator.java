package com.BCSTech.SmartBill.purchase.service;

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
public class PurchaseNumberGenerator {

    private final MongoTemplate mongoTemplate;

    /**
     * Format: PUR-{YYYY}-{sequence padded to 4 digits}
     * Example: PUR-2024-0001
     *
     * Previously this derived the sequence from purchaseRepository.count() + 1,
     * which had two bugs: (1) it was NOT scoped to companyId, so every tenant's
     * purchase numbers were drawn from one shared global counter, and (2)
     * count()-then-format is a read-then-write race — two concurrent purchases
     * could read the same count and produce duplicate purchase numbers.
     *
     * Fixed the same way as InvoiceNumberGenerator: an atomic, per-company
     * findAndModify $inc, which is safe under concurrent requests and across
     * multiple app instances.
     */
    public String generate(String companyId) {
        Query query = new Query(Criteria.where("id").is(companyId));
        Update update = new Update().inc("purchaseSequence", 1);
        FindAndModifyOptions options = FindAndModifyOptions.options()
                .returnNew(false)   // we want the pre-increment value
                .upsert(false);

        Company before = mongoTemplate.findAndModify(query, update, options, Company.class);
        if (before == null) {
            throw AppException.notFound("Company not found");
        }

        int year = LocalDate.now().getYear();
        return String.format("PUR-%d-%04d", year, before.getPurchaseSequence());
    }
}