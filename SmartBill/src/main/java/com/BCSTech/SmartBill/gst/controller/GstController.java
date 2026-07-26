package com.BCSTech.SmartBill.gst.controller;

import com.BCSTech.SmartBill.common.dto.ApiResponse;
import com.BCSTech.SmartBill.common.security.CurrentUser;
import com.BCSTech.SmartBill.gst.dto.GstDTOs.*;
import com.BCSTech.SmartBill.gst.service.GstService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/gst")
@RequiredArgsConstructor
public class GstController {

    private final GstService gstService;

    // ── GET /api/gst/gstr1 ───────────────────────────────────────────────────
    // GSTR-1 outward supply report
    // ?from=2024-06-01&to=2024-06-30
    @GetMapping("/gstr1")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Gstr1Report>> getGstr1(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @CurrentUser CurrentUser.AuthUser authUser) {

        Gstr1Report report = gstService.getGstr1(authUser.getCompanyId(), from, to);
        return ResponseEntity.ok(ApiResponse.success("GSTR-1 report generated", report));
    }

    // ── GET /api/gst/gstr3b ──────────────────────────────────────────────────
    // GSTR-3B monthly return summary
    // ?from=2024-06-01&to=2024-06-30
    @GetMapping("/gstr3b")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<Gstr3bReport>> getGstr3b(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @CurrentUser CurrentUser.AuthUser authUser) {

        Gstr3bReport report = gstService.getGstr3b(authUser.getCompanyId(), from, to);
        return ResponseEntity.ok(ApiResponse.success("GSTR-3B report generated", report));
    }

    // ── GET /api/gst/hsn-summary ─────────────────────────────────────────────
    // HSN-wise summary — required for GSTR-1 filing
    // ?from=2024-06-01&to=2024-06-30
    @GetMapping("/hsn-summary")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<List<HsnSummary>>> getHsnSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @CurrentUser CurrentUser.AuthUser authUser) {

        List<HsnSummary> summary = gstService.getHsnSummary(
                authUser.getCompanyId(), from, to);
        return ResponseEntity.ok(ApiResponse.success("HSN summary fetched", summary));
    }

    // ── GET /api/gst/tax-slab ────────────────────────────────────────────────
    // Tax slab breakdown — 0%, 5%, 12%, 18%, 28% pie chart data
    // ?from=2024-06-01&to=2024-06-30
    @GetMapping("/tax-slab")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT','MANAGER')")
    public ResponseEntity<ApiResponse<List<TaxSlabBreakdown>>> getTaxSlabBreakdown(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @CurrentUser CurrentUser.AuthUser authUser) {

        List<TaxSlabBreakdown> breakdown = gstService.getTaxSlabBreakdown(
                authUser.getCompanyId(), from, to);
        return ResponseEntity.ok(ApiResponse.success("Tax slab breakdown fetched", breakdown));
    }

    // ── GET /api/gst/filing-status ───────────────────────────────────────────
    // Full financial year filing status calendar
    // ?fy=2024-25
    @GetMapping("/filing-status")
    @PreAuthorize("hasAnyRole('ADMIN','ACCOUNTANT')")
    public ResponseEntity<ApiResponse<List<FilingStatus>>> getFilingStatus(
            @RequestParam(defaultValue = "") String fy,
            @CurrentUser CurrentUser.AuthUser authUser) {

        // Default to current FY
        if (fy.isBlank()) {
            LocalDate now = LocalDate.now();
            int year = now.getMonthValue() >= 4 ? now.getYear() : now.getYear() - 1;
            fy = year + "-" + String.valueOf(year + 1).substring(2);
        }

        List<FilingStatus> status = gstService.getFilingStatusForFY(
                authUser.getCompanyId(), fy);
        return ResponseEntity.ok(ApiResponse.success("Filing status fetched", status));
    }
}