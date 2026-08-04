package com.BCSTech.SmartBill.user.controller;

import com.BCSTech.SmartBill.common.dto.ApiResponse;
import com.BCSTech.SmartBill.common.security.CurrentUser;
import com.BCSTech.SmartBill.user.dto.UserDTOs.*;
import com.BCSTech.SmartBill.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // GET /api/users?page=0&size=10 — company-scoped team list
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @CurrentUser CurrentUser.AuthUser authUser) {

        Page<UserResponse> users = userService.list(authUser.getCompanyId(), page, size);
        return ResponseEntity.ok(ApiResponse.success("Users fetched successfully", users));
    }

    // POST /api/users/invite — add a teammate to the logged-in admin's company
    @PostMapping("/invite")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<InviteResponse>> invite(
            @Valid @RequestBody InviteRequest request,
            @CurrentUser CurrentUser.AuthUser authUser) {

        InviteResponse response = userService.invite(
                authUser.getCompanyId(), authUser.getUserId(), request);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("User invited successfully", response));
    }

    // PUT /api/users/{id}/role — change a teammate's role
    @PutMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> updateRole(
            @PathVariable String id,
            @Valid @RequestBody RoleUpdateRequest request,
            @CurrentUser CurrentUser.AuthUser authUser) {

        UserResponse response = userService.updateRole(
                authUser.getCompanyId(), id, authUser.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success("Role updated successfully", response));
    }

    // PATCH /api/users/{id}/deactivate
    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> deactivate(
            @PathVariable String id,
            @CurrentUser CurrentUser.AuthUser authUser) {

        UserResponse response = userService.deactivate(
                authUser.getCompanyId(), id, authUser.getUserId());
        return ResponseEntity.ok(ApiResponse.success("User deactivated successfully", response));
    }

    // PATCH /api/users/{id}/reactivate
    @PatchMapping("/{id}/reactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserResponse>> reactivate(
            @PathVariable String id,
            @CurrentUser CurrentUser.AuthUser authUser) {

        UserResponse response = userService.reactivate(
                authUser.getCompanyId(), id, authUser.getUserId());
        return ResponseEntity.ok(ApiResponse.success("User reactivated successfully", response));
    }
}