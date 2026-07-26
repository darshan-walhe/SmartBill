package com.BCSTech.SmartBill.customer.service;

import com.BCSTech.SmartBill.common.exception.AppException;
import com.BCSTech.SmartBill.customer.dto.CustomerDTOs;
import com.BCSTech.SmartBill.customer.dto.CustomerDTOs.*;
import com.BCSTech.SmartBill.customer.model.Customer;
import com.BCSTech.SmartBill.customer.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;

    // ── Create ────────────────────────────────────────────────────────────────
    public CustomerResponse create(String companyId, String userId, SaveRequest request) {

        // Check duplicate mobile within same company
        if (request.getMobile() != null
                && customerRepository.existsByMobileAndCompanyId(request.getMobile(), companyId)) {
            throw AppException.conflict("A customer with this mobile number already exists.");
        }

        // Check duplicate email within same company
        if (request.getEmail() != null
                && customerRepository.existsByEmailAndCompanyId(request.getEmail(), companyId)) {
            throw AppException.conflict("A customer with this email already exists.");
        }

        BigDecimal openingBalance = request.getOpeningBalance() != null
                ? request.getOpeningBalance() : BigDecimal.ZERO;

        Customer customer = Customer.builder()
                .companyId(companyId)
                .name(request.getName())
                .mobile(request.getMobile())
                .email(request.getEmail())
                .gstin(request.getGstin())
                .address(request.getAddress())
                .city(request.getCity())
                .state(request.getState())
                .country(request.getCountry())
                .pincode(request.getPincode())
                .creditLimit(request.getCreditLimit() != null
                        ? request.getCreditLimit() : BigDecimal.ZERO)
                .openingBalance(openingBalance)
                .currentBalance(openingBalance)   // current balance starts at opening balance
                .createdBy(userId)
                .active(true)
                .build();

        customer = customerRepository.save(customer);
        log.info("Customer created: {} for company: {}", customer.getId(), companyId);
        return CustomerDTOs.toResponse(customer);
    }

    // ── Update ────────────────────────────────────────────────────────────────
    public CustomerResponse update(String customerId, String companyId, SaveRequest request) {

        Customer customer = getCustomerOrThrow(customerId, companyId);

        // Check mobile duplicate — exclude current customer
        if (request.getMobile() != null
                && !request.getMobile().equals(customer.getMobile())
                && customerRepository.existsByMobileAndCompanyId(request.getMobile(), companyId)) {
            throw AppException.conflict("A customer with this mobile number already exists.");
        }

        // Check email duplicate — exclude current customer
        if (request.getEmail() != null
                && !request.getEmail().equals(customer.getEmail())
                && customerRepository.existsByEmailAndCompanyId(request.getEmail(), companyId)) {
            throw AppException.conflict("A customer with this email already exists.");
        }

        customer.setName(request.getName());
        customer.setMobile(request.getMobile());
        customer.setEmail(request.getEmail());
        customer.setGstin(request.getGstin());
        customer.setAddress(request.getAddress());
        customer.setCity(request.getCity());
        customer.setState(request.getState());
        customer.setCountry(request.getCountry());
        customer.setPincode(request.getPincode());

        if (request.getCreditLimit() != null) {
            customer.setCreditLimit(request.getCreditLimit());
        }

        customer = customerRepository.save(customer);
        return CustomerDTOs.toResponse(customer);
    }

    // ── Get by ID ─────────────────────────────────────────────────────────────
    public CustomerResponse getById(String customerId, String companyId) {
        return CustomerDTOs.toResponse(getCustomerOrThrow(customerId, companyId));
    }

    // ── List with pagination and optional search ───────────────────────────────
    public Page<CustomerSummary> list(String companyId, String keyword,
                                      int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        if (keyword != null && !keyword.isBlank()) {
            return customerRepository
                    .searchByCompanyId(companyId, keyword, pageable)
                    .map(CustomerDTOs::toSummary);
        }
        return customerRepository
                .findByCompanyIdAndActiveTrue(companyId, pageable)
                .map(CustomerDTOs::toSummary);
    }

    // ── Soft delete ───────────────────────────────────────────────────────────
    public void delete(String customerId, String companyId) {
        Customer customer = getCustomerOrThrow(customerId, companyId);
        customer.setActive(false);
        customerRepository.save(customer);
        log.info("Customer soft-deleted: {}", customerId);
    }

    // ── Get all with outstanding balance (for dashboard) ──────────────────────
    public List<CustomerSummary> getWithOutstanding(String companyId) {
        return customerRepository
                .findByCompanyIdAndCurrentBalanceGreaterThanAndActiveTrue(
                        companyId, BigDecimal.ZERO)
                .stream()
                .map(CustomerDTOs::toSummary)
                .collect(Collectors.toList());
    }

    // ── Total receivable amount (for dashboard KPI) ───────────────────────────
    public BigDecimal getTotalReceivable(String companyId) {
        return customerRepository
                .findByCompanyIdAndCurrentBalanceGreaterThanAndActiveTrue(
                        companyId, BigDecimal.ZERO)
                .stream()
                .map(Customer::getCurrentBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // ── Total customer count (for dashboard KPI) ──────────────────────────────
    public long getTotalCount(String companyId) {
        return customerRepository.countByCompanyIdAndActiveTrue(companyId);
    }

    // ── Called from InvoiceService when invoice is created/paid ──────────────
    // amount > 0 = debit (customer owes more), amount < 0 = credit (payment received)
    public void updateBalance(String customerId, String companyId, BigDecimal amount) {
        Customer customer = getCustomerOrThrow(customerId, companyId);
        customer.setCurrentBalance(customer.getCurrentBalance().add(amount));
        customerRepository.save(customer);
    }

    // ── Validate credit limit before creating invoice ─────────────────────────
    public void validateCreditLimit(String customerId, String companyId, BigDecimal invoiceAmount) {
        Customer customer = getCustomerOrThrow(customerId, companyId);

        if (customer.getCreditLimit().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal newBalance = customer.getCurrentBalance().add(invoiceAmount);
            if (newBalance.compareTo(customer.getCreditLimit()) > 0) {
                throw AppException.badRequest(
                        "Invoice amount exceeds credit limit for " + customer.getName() +
                                ". Credit limit: ₹" + customer.getCreditLimit() +
                                ", Current balance: ₹" + customer.getCurrentBalance()
                );
            }
        }
    }

    // ── Internal helper ───────────────────────────────────────────────────────
    public Customer getCustomerOrThrow(String customerId, String companyId) {
        return customerRepository.findByIdAndCompanyId(customerId, companyId)
                .orElseThrow(() -> AppException.notFound("Customer not found"));
    }
}