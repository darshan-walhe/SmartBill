package com.BCSTech.SmartBill.notification.controller;

import com.BCSTech.SmartBill.common.dto.ApiResponse;
import com.BCSTech.SmartBill.common.security.CurrentUser;
import com.BCSTech.SmartBill.notification.dto.NotificationDTOs.*;
import com.BCSTech.SmartBill.notification.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    // GET /api/notifications?page=0&size=20
    @GetMapping
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @CurrentUser CurrentUser.AuthUser authUser) {

        Page<NotificationResponse> notifications = notificationService.list(
                authUser.getCompanyId(), authUser.getUserId(), page, size);
        return ResponseEntity.ok(ApiResponse.success("Notifications fetched successfully", notifications));
    }

    // GET /api/notifications/unread-count
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<UnreadCountResponse>> unreadCount(
            @CurrentUser CurrentUser.AuthUser authUser) {

        UnreadCountResponse response = notificationService.unreadCount(
                authUser.getCompanyId(), authUser.getUserId());
        return ResponseEntity.ok(ApiResponse.success("Unread count fetched successfully", response));
    }

    // PATCH /api/notifications/{id}/read
    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationResponse>> markRead(
            @PathVariable String id,
            @CurrentUser CurrentUser.AuthUser authUser) {

        NotificationResponse response = notificationService.markRead(
                id, authUser.getCompanyId(), authUser.getUserId());
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read", response));
    }

    // PATCH /api/notifications/read-all
    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllRead(@CurrentUser CurrentUser.AuthUser authUser) {
        notificationService.markAllRead(authUser.getCompanyId(), authUser.getUserId());
        return ResponseEntity.ok(ApiResponse.<Void>success("All notifications marked as read"));
    }

    // POST /api/notifications — admin broadcast to the whole company
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<NotificationResponse>> broadcast(
            @Valid @RequestBody CreateRequest request,
            @CurrentUser CurrentUser.AuthUser authUser) {

        NotificationResponse response = notificationService.createBroadcast(authUser.getCompanyId(), request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Notification broadcast successfully", response));
    }
}