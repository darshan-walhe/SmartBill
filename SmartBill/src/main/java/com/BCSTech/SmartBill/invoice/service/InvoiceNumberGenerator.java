package com.BCSTech.SmartBill.invoice.service;

import com.BCSTech.SmartBill.company.model.Company;
import com.BCSTech.SmartBill.company.repository.CompanyRepository;
import com.BCSTech.SmartBill.common.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class InvoiceNumberGenerator {

    private final CompanyRepository companyRepository;

    /**
     * Generates and increments invoice number atomically.
     * Format: {prefix}{YYYY}-{sequence padded to 4 digits}
     * Example: INV-2024-0001, INV-2024-0002, ...
     */
    public synchronized String generate(String companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> AppException.notFound("Company not found"));

        int year = LocalDate.now().getYear();
        int seq  = company.getInvoiceSequence();

        String invoiceNumber = String.format("%s%d-%04d",
                company.getInvoicePrefix(), year, seq);

        // Increment sequence for next invoice
        company.setInvoiceSequence(seq + 1);
        companyRepository.save(company);

        return invoiceNumber;
    }
}