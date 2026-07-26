package com.BCSTech.SmartBill.product.controller;

import com.BCSTech.SmartBill.common.dto.ApiResponse;
import com.BCSTech.SmartBill.common.security.CurrentUser;
import com.BCSTech.SmartBill.product.dto.ProductDTOs.*;
import com.BCSTech.SmartBill.product.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    // ══════════════════════════════════════════════════════════════
    //  CATEGORY ENDPOINTS — /api/product-categories
    // ══════════════════════════════════════════════════════════════

    @PostMapping("/api/product-categories")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<CategoryResponse>> createCategory(
            @Valid @RequestBody CategoryRequest request,
            @CurrentUser CurrentUser.AuthUser authUser) {

        CategoryResponse response = productService.createCategory(authUser.getCompanyId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Category created successfully", response));
    }

    @GetMapping("/api/product-categories")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> listCategories(
            @CurrentUser CurrentUser.AuthUser authUser) {

        List<CategoryResponse> list = productService.listCategories(authUser.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success("Categories fetched", list));
    }

    @DeleteMapping("/api/product-categories/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(
            @PathVariable String id,
            @CurrentUser CurrentUser.AuthUser authUser) {

        productService.deleteCategory(id, authUser.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success("Category deleted successfully"));
    }

    // ══════════════════════════════════════════════════════════════
    //  PRODUCT ENDPOINTS — /api/products
    // ══════════════════════════════════════════════════════════════

    // POST /api/products
    @PostMapping("/api/products")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','STAFF')")
    public ResponseEntity<ApiResponse<ProductResponse>> create(
            @Valid @RequestBody SaveRequest request,
            @CurrentUser CurrentUser.AuthUser authUser) {

        ProductResponse response = productService.create(
                authUser.getCompanyId(), authUser.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Product created successfully", response));
    }

    // GET /api/products?keyword=rice&categoryId=xxx&page=0&size=10
    @GetMapping("/api/products")
    public ResponseEntity<ApiResponse<Page<ProductSummary>>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String categoryId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @CurrentUser CurrentUser.AuthUser authUser) {

        Page<ProductSummary> products = productService.list(
                authUser.getCompanyId(), keyword, categoryId, page, size);
        return ResponseEntity.ok(ApiResponse.success("Products fetched", products));
    }

    // GET /api/products/{id}
    @GetMapping("/api/products/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> getById(
            @PathVariable String id,
            @CurrentUser CurrentUser.AuthUser authUser) {

        ProductResponse response = productService.getById(id, authUser.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success("Product fetched", response));
    }

    // GET /api/products/barcode/{barcode}  — for barcode scanner
    @GetMapping("/api/products/barcode/{barcode}")
    public ResponseEntity<ApiResponse<ProductResponse>> getByBarcode(
            @PathVariable String barcode,
            @CurrentUser CurrentUser.AuthUser authUser) {

        ProductResponse response = productService.getByBarcode(barcode, authUser.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success("Product fetched", response));
    }

    // PUT /api/products/{id}
    @PutMapping("/api/products/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','STAFF')")
    public ResponseEntity<ApiResponse<ProductResponse>> update(
            @PathVariable String id,
            @Valid @RequestBody SaveRequest request,
            @CurrentUser CurrentUser.AuthUser authUser) {

        ProductResponse response = productService.update(id, authUser.getCompanyId(), request);
        return ResponseEntity.ok(ApiResponse.success("Product updated successfully", response));
    }

    // DELETE /api/products/{id}
    @DeleteMapping("/api/products/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable String id,
            @CurrentUser CurrentUser.AuthUser authUser) {

        productService.delete(id, authUser.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success("Product deleted successfully"));
    }

    // GET /api/products/low-stock
    @GetMapping("/api/products/low-stock")
    public ResponseEntity<ApiResponse<List<ProductSummary>>> getLowStock(
            @CurrentUser CurrentUser.AuthUser authUser) {

        List<ProductSummary> list = productService.getLowStockProducts(authUser.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success("Low stock products fetched", list));
    }

    // GET /api/products/stats  — dashboard KPIs
    @GetMapping("/api/products/stats")
    public ResponseEntity<ApiResponse<StockStats>> getStats(
            @CurrentUser CurrentUser.AuthUser authUser) {

        StockStats stats = productService.getStockStats(authUser.getCompanyId());
        return ResponseEntity.ok(ApiResponse.success("Stock stats fetched", stats));
    }
}