package com.BCSTech.SmartBill.accounts.repository;

import com.BCSTech.SmartBill.accounts.model.JournalEntry;
import com.BCSTech.SmartBill.accounts.model.JournalEntry.ReferenceType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface JournalEntryRepository extends MongoRepository<JournalEntry, String> {

    Optional<JournalEntry> findByIdAndCompanyId(String id, String companyId);

    // All entries in date range — for cash book / bank book / P&L
    List<JournalEntry> findByCompanyIdAndEntryDateBetweenOrderByEntryDateAsc(
            String companyId, LocalDate from, LocalDate to);

    // All entries for a specific invoice / purchase
    List<JournalEntry> findByCompanyIdAndReferenceId(String companyId, String referenceId);

    // All entries of a specific reference type
    List<JournalEntry> findByCompanyIdAndReferenceTypeAndEntryDateBetween(
            String companyId, ReferenceType type, LocalDate from, LocalDate to);

    // Paginated for journal entry list view
    Page<JournalEntry> findByCompanyIdOrderByEntryDateDesc(
            String companyId, Pageable pageable);
}