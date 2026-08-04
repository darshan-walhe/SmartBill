package com.BCSTech.SmartBill.notification.service;

import com.BCSTech.SmartBill.common.exception.AppException;
import com.BCSTech.SmartBill.notification.dto.NotificationDTOs.*;
import com.BCSTech.SmartBill.notification.model.Notification;
import com.BCSTech.SmartBill.notification.model.NotificationType;
import com.BCSTech.SmartBill.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final MongoTemplate mongoTemplate;

    // ══════════════════════════════════════════════════════════════
    //  INTERNAL API — called by other modules to raise a notification.
    //  No controller for this side; it's a plain service method other
    //  services inject and call directly (see ProductService/InvoiceService
    //  for examples already wired in).
    // ══════════════════════════════════════════════════════════════

    /**
     * @param userId null → visible to everyone in the company (e.g. low stock).
     *               set  → visible only to that specific user (e.g. an invite).
     */
    public void notify(String companyId, String userId, NotificationType type,
                       String title, String message,
                       String referenceType, String referenceId) {
        Notification notification = Notification.builder()
                .companyId(companyId)
                .userId(userId)
                .type(type)
                .title(title)
                .message(message)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .read(false)
                .build();

        notificationRepository.save(notification);
        log.debug("Notification raised: {} [{}] for company {}", type, title, companyId);
    }

    // Convenience overload for the common case — a company-wide notification
    // with no linked entity.
    public void notifyCompany(String companyId, NotificationType type, String title, String message) {
        notify(companyId, null, type, title, message, null, null);
    }

    // Convenience overload for a company-wide notification linked to an entity.
    public void notifyCompany(String companyId, NotificationType type, String title, String message,
                              String referenceType, String referenceId) {
        notify(companyId, null, type, title, message, referenceType, referenceId);
    }

    // ══════════════════════════════════════════════════════════════
    //  PUBLIC API — backs NotificationController
    // ══════════════════════════════════════════════════════════════

    // ── GET /api/notifications ────────────────────────────────────────────────
    public Page<NotificationResponse> list(String companyId, String userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return notificationRepository.findVisibleToUser(companyId, userId, pageable)
                .map(this::toResponse);
    }

    // ── GET /api/notifications/unread-count ───────────────────────────────────
    public UnreadCountResponse unreadCount(String companyId, String userId) {
        long count = notificationRepository.countUnreadForUser(companyId, userId);
        return UnreadCountResponse.builder().unreadCount(count).build();
    }

    // ── PATCH /api/notifications/{id}/read ─────────────────────────────────────
    public NotificationResponse markRead(String id, String companyId, String userId) {
        Notification notification = notificationRepository.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> AppException.notFound("Notification not found"));

        // A user-targeted notification belongs to that user only — a company-wide
        // one (userId == null) is fair game for anyone in the company.
        if (notification.getUserId() != null && !notification.getUserId().equals(userId)) {
            throw AppException.forbidden("This notification does not belong to you.");
        }

        notification.setRead(true);
        notification = notificationRepository.save(notification);
        return toResponse(notification);
    }

    // ── PATCH /api/notifications/read-all ──────────────────────────────────────
    // Bulk update — one atomic multi-document write instead of N individual saves.
    public void markAllRead(String companyId, String userId) {
        Query query = new Query(new Criteria().andOperator(
                Criteria.where("companyId").is(companyId),
                Criteria.where("read").is(false),
                new Criteria().orOperator(
                        Criteria.where("userId").is(null),
                        Criteria.where("userId").is(userId)
                )
        ));
        Update update = new Update().set("read", true);
        mongoTemplate.updateMulti(query, update, Notification.class);
    }

    // ── POST /api/notifications — admin broadcast to the whole company ────────
    public NotificationResponse createBroadcast(String companyId, CreateRequest request) {
        Notification notification = Notification.builder()
                .companyId(companyId)
                .userId(null)
                .type(NotificationType.GENERAL)
                .title(request.getTitle())
                .message(request.getMessage())
                .read(false)
                .build();

        notification = notificationRepository.save(notification);
        return toResponse(notification);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .type(n.getType().name())
                .title(n.getTitle())
                .message(n.getMessage())
                .referenceType(n.getReferenceType())
                .referenceId(n.getReferenceId())
                .read(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}