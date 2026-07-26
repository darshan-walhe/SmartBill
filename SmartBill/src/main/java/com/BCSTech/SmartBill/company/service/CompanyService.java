package com.BCSTech.SmartBill.company.service;

import com.BCSTech.SmartBill.common.exception.AppException;
import com.BCSTech.SmartBill.company.dto.CompanyDTOs.*;
import com.BCSTech.SmartBill.company.model.Company;
import com.BCSTech.SmartBill.company.model.SubscriptionPlan;
import com.BCSTech.SmartBill.company.repository.CompanyRepository;
import com.BCSTech.SmartBill.user.model.User;
import com.BCSTech.SmartBill.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;

    // ── Called from AuthService.register() ───────────────────────────────────
    // Creates company document and links it to the registering user
    public Company createForUser(String companyName, String userId) {

        Company company = Company.builder()
                .name(companyName)
                .defaultCurrency("INR")
                .invoicePrefix("INV-")
                .invoiceSequence(1)
                .financialYearStartMonth(4)   // April — Indian financial year
                .subscriptionPlan(SubscriptionPlan.FREE)
                .createdByUserId(userId)
                .active(true)
                .build();

        company = companyRepository.save(company);

        // Link company back to user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> AppException.notFound("User not found"));
        user.setCompanyId(company.getId());
        userRepository.save(user);

        log.info("Company created: {} for user: {}", company.getId(), userId);
        return company;
    }

    // ── GET /api/company — fetch logged-in user's company ────────────────────
    public CompanyResponse getByCompanyId(String companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> AppException.notFound("Company not found"));
        return toResponse(company);
    }

    // ── PUT /api/company — update company profile ─────────────────────────────
    public CompanyResponse update(String companyId, UpdateRequest request) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> AppException.notFound("Company not found"));

        // Check GST uniqueness if changed
        if (request.getGstNumber() != null
                && !request.getGstNumber().equals(company.getGstNumber())
                && companyRepository.existsByGstNumber(request.getGstNumber())) {
            throw AppException.conflict("A company with this GST number already exists.");
        }

        // Apply updates
        company.setName(request.getName());
        company.setGstNumber(request.getGstNumber());
        company.setPanNumber(request.getPanNumber());
        company.setAddress(request.getAddress());
        company.setCity(request.getCity());
        company.setState(request.getState());
        company.setPincode(request.getPincode());
        company.setCountry(request.getCountry());
        company.setEmail(request.getEmail());
        company.setMobile(request.getMobile());
        company.setLogoUrl(request.getLogoUrl());
        company.setSignatureUrl(request.getSignatureUrl());

        if (request.getDefaultCurrency() != null) {
            company.setDefaultCurrency(request.getDefaultCurrency());
        }
        if (request.getInvoicePrefix() != null) {
            company.setInvoicePrefix(request.getInvoicePrefix());
        }
        if (request.getFinancialYearStartMonth() != null) {
            company.setFinancialYearStartMonth(request.getFinancialYearStartMonth());
        }

        company = companyRepository.save(company);
        return toResponse(company);
    }

    // ── Map Company → CompanyResponse ─────────────────────────────────────────
    public CompanyResponse toResponse(Company company) {
        return CompanyResponse.builder()
                .id(company.getId())
                .name(company.getName())
                .gstNumber(company.getGstNumber())
                .panNumber(company.getPanNumber())
                .address(company.getAddress())
                .city(company.getCity())
                .state(company.getState())
                .pincode(company.getPincode())
                .country(company.getCountry())
                .email(company.getEmail())
                .mobile(company.getMobile())
                .logoUrl(company.getLogoUrl())
                .signatureUrl(company.getSignatureUrl())
                .defaultCurrency(company.getDefaultCurrency())
                .invoicePrefix(company.getInvoicePrefix())
                .invoiceSequence(company.getInvoiceSequence())
                .financialYearStartMonth(company.getFinancialYearStartMonth())
                .subscriptionPlan(company.getSubscriptionPlan())
                .build();
    }
}