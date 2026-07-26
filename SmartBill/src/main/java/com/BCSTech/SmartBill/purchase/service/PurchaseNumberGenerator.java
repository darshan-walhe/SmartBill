package com.BCSTech.SmartBill.purchase.service;

import com.BCSTech.SmartBill.purchase.repository.PurchaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
public class PurchaseNumberGenerator {

    private final PurchaseRepository purchaseRepository;

    /**
     * Format: PUR-{YYYY}-{sequence padded to 4 digits}
     * Example: PUR-2024-0001
     * Sequence derived from total purchase count — simple and effective for single instance.
     */
    public synchronized String generate(String companyId) {
        long count = purchaseRepository.count() + 1;
        int year   = LocalDate.now().getYear();
        return String.format("PUR-%d-%04d", year, count);
    }
}