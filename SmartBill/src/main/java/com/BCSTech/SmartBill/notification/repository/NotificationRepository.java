package com.BCSTech.SmartBill.notification.repository;

import com.BCSTech.SmartBill.notification.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.Optional;

public interface NotificationRepository extends MongoRepository<Notification, String> {

    // Visible to a user = company-wide (userId is null) OR targeted at them specifically
    @Query("{ 'companyId': ?0, $or: [ { 'userId': null }, { 'userId': ?1 } ] }")
    Page<Notification> findVisibleToUser(String companyId, String userId, Pageable pageable);

    @Query(value = "{ 'companyId': ?0, 'read': false, $or: [ { 'userId': null }, { 'userId': ?1 } ] }",
            count = true)
    long countUnreadForUser(String companyId, String userId);

    // Tenant-scoped lookup — always use this (not findById) when acting on a
    // notification referenced from a request.
    Optional<Notification> findByIdAndCompanyId(String id, String companyId);
}