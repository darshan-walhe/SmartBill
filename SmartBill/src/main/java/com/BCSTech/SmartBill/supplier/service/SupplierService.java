package com.BCSTech.SmartBill.supplier.service;

import com.BCSTech.SmartBill.common.exception.AppException;
import com.BCSTech.SmartBill.supplier.dto.SupplierDTOs;
import com.BCSTech.SmartBill.supplier.dto.SupplierDTOs.*;
import com.BCSTech.SmartBill.supplier.model.Supplier;
import com.BCSTech.SmartBill.supplier.repository.SupplierRepository;
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
public class SupplierService {

    private final SupplierRepository supplierRepository;

    // ── Create ────────────────────────────────────────────────────────────────
    public SupplierResponse create(String companyId, String userId, SaveRequest request) {

        if (request.getMobile() != null
                && supplierRepository.existsByMobileAndCompanyId(request.getMobile(), companyId)) {
            throw AppException.conflict("A supplier with this mobile number already exists.");
        }

        if (request.getGstin() != null
                && supplierRepository.existsByGstinAndCompanyId(request.getGstin(), companyId)) {
            throw AppException.conflict("A supplier with this GSTIN already exists.");
        }

        BigDecimal openingBalance = request.getOpeningBalance() != null
                ? request.getOpeningBalance() : BigDecimal.ZERO;

        Supplier supplier = Supplier.builder()
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
                .openingBalance(openingBalance)
                .outstandingAmount(openingBalance)
                .bankName(request.getBankName())
                .accountNumber(request.getAccountNumber())
                .ifscCode(request.getIfscCode())
                .accountHolderName(request.getAccountHolderName())
                .createdBy(userId)
                .active(true)
                .build();

        supplier = supplierRepository.save(supplier);
        log.info("Supplier created: {} for company: {}", supplier.getId(), companyId);
        return SupplierDTOs.toResponse(supplier);
    }

    // ── Update ────────────────────────────────────────────────────────────────
    public SupplierResponse update(String supplierId, String companyId, SaveRequest request) {

        Supplier supplier = getSupplierOrThrow(supplierId, companyId);

        if (request.getMobile() != null
                && !request.getMobile().equals(supplier.getMobile())
                && supplierRepository.existsByMobileAndCompanyId(request.getMobile(), companyId)) {
            throw AppException.conflict("A supplier with this mobile number already exists.");
        }

        if (request.getGstin() != null
                && !request.getGstin().equals(supplier.getGstin())
                && supplierRepository.existsByGstinAndCompanyId(request.getGstin(), companyId)) {
            throw AppException.conflict("A supplier with this GSTIN already exists.");
        }

        supplier.setName(request.getName());
        supplier.setMobile(request.getMobile());
        supplier.setEmail(request.getEmail());
        supplier.setGstin(request.getGstin());
        supplier.setAddress(request.getAddress());
        supplier.setCity(request.getCity());
        supplier.setState(request.getState());
        supplier.setCountry(request.getCountry());
        supplier.setPincode(request.getPincode());
        supplier.setBankName(request.getBankName());
        supplier.setAccountNumber(request.getAccountNumber());
        supplier.setIfscCode(request.getIfscCode());
        supplier.setAccountHolderName(request.getAccountHolderName());

        supplier = supplierRepository.save(supplier);
        return SupplierDTOs.toResponse(supplier);
    }

    // ── Get by ID ─────────────────────────────────────────────────────────────
    public SupplierResponse getById(String supplierId, String companyId) {
        return SupplierDTOs.toResponse(getSupplierOrThrow(supplierId, companyId));
    }

    // ── List with pagination ──────────────────────────────────────────────────
    public Page<SupplierSummary> list(String companyId, String keyword, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        if (keyword != null && !keyword.isBlank()) {
            return supplierRepository
                    .searchByCompanyId(companyId, keyword, pageable)
                    .map(SupplierDTOs::toSummary);
        }
        return supplierRepository
                .findByCompanyIdAndActiveTrue(companyId, pageable)
                .map(SupplierDTOs::toSummary);
    }

    // ── Soft delete ───────────────────────────────────────────────────────────
    public void delete(String supplierId, String companyId) {
        Supplier supplier = getSupplierOrThrow(supplierId, companyId);
        supplier.setActive(false);
        supplierRepository.save(supplier);
        log.info("Supplier soft-deleted: {}", supplierId);
    }

    // ── Outstanding suppliers (for dashboard) ─────────────────────────────────
    public List<SupplierSummary> getWithOutstanding(String companyId) {
        return supplierRepository
                .findByCompanyIdAndOutstandingAmountGreaterThanAndActiveTrue(
                        companyId, BigDecimal.ZERO)
                .stream()
                .map(SupplierDTOs::toSummary)
                .collect(Collectors.toList());
    }

    // ── Total payable amount (for dashboard KPI) ──────────────────────────────
    public BigDecimal getTotalPayable(String companyId) {
        return supplierRepository
                .findByCompanyIdAndOutstandingAmountGreaterThanAndActiveTrue(
                        companyId, BigDecimal.ZERO)
                .stream()
                .map(Supplier::getOutstandingAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // ── Called from PurchaseService when purchase is created/paid ─────────────
    // amount > 0 = we owe more, amount < 0 = we paid them
    public void updateOutstanding(String supplierId, String companyId, BigDecimal amount) {
        Supplier supplier = getSupplierOrThrow(supplierId, companyId);
        supplier.setOutstandingAmount(supplier.getOutstandingAmount().add(amount));
        supplierRepository.save(supplier);
    }

    // ── Internal helper ───────────────────────────────────────────────────────
    public Supplier getSupplierOrThrow(String supplierId, String companyId) {
        return supplierRepository.findByIdAndCompanyId(supplierId, companyId)
                .orElseThrow(() -> AppException.notFound("Supplier not found"));
    }
}