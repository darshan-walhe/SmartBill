import { apiClient } from "./client";
import type { ApiResponse, Page } from "../types/api";

// ── Categories ────────────────────────────────────────────────────────────
// Mirrors ProductDTOs.CategoryRequest
export interface CategoryRequest {
  name: string;
  description?: string;
}

// Mirrors ProductDTOs.CategoryResponse — no item-count field exists here
export interface CategoryResponse {
  id: string;
  name: string;
  description?: string;
}

// ── Products ──────────────────────────────────────────────────────────────
// Mirrors ProductDTOs.SaveRequest
export interface ProductSaveRequest {
  name: string;
  categoryId?: string;
  sku?: string;
  hsnCode?: string;
  barcode?: string;
  unit?: string;
  purchasePrice: number;
  salePrice: number;
  taxRate?: number;
  openingStock?: number;
  lowStockThreshold?: number;
  reorderQuantity?: number;
  imageUrl?: string;
  description?: string;
}

// Mirrors ProductDTOs.ProductResponse
export interface ProductResponse extends ProductSaveRequest {
  id: string;
  companyId: string;
  categoryName?: string;
  currentStock: number;
  lowStock: boolean;
  outOfStock: boolean;
  active: boolean;
  createdAt: string;
}

// Mirrors ProductDTOs.ProductSummary — used in the list table
export interface ProductSummary {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  hsnCode?: string;
  unit?: string;
  salePrice: number;
  taxRate?: number;
  currentStock: number;
  lowStock: boolean;
  outOfStock: boolean;
}

// Mirrors ProductDTOs.StockStats
export interface StockStats {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockValue: number;
}

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  if (data.data === undefined) throw new Error(data.message ?? "Empty response from server");
  return data.data;
}

export const categoriesApi = {
  list: () => unwrap<CategoryResponse[]>(apiClient.get("/api/product-categories")),

  create: (body: CategoryRequest) =>
    unwrap<CategoryResponse>(apiClient.post("/api/product-categories", body)),

  delete: (id: string) => unwrap<void>(apiClient.delete(`/api/product-categories/${id}`)),
};

export const productsApi = {
  list: (keyword: string | undefined, categoryId: string | undefined, page = 0, size = 10) =>
    unwrap<Page<ProductSummary>>(
      apiClient.get("/api/products", {
        params: { keyword: keyword || undefined, categoryId: categoryId || undefined, page, size },
      })
    ),

  getById: (id: string) => unwrap<ProductResponse>(apiClient.get(`/api/products/${id}`)),

  getByBarcode: (barcode: string) =>
    unwrap<ProductResponse>(apiClient.get(`/api/products/barcode/${barcode}`)),

  create: (body: ProductSaveRequest) =>
    unwrap<ProductResponse>(apiClient.post("/api/products", body)),

  update: (id: string, body: ProductSaveRequest) =>
    unwrap<ProductResponse>(apiClient.put(`/api/products/${id}`, body)),

  delete: (id: string) => unwrap<void>(apiClient.delete(`/api/products/${id}`)),

  lowStock: () => unwrap<ProductSummary[]>(apiClient.get("/api/products/low-stock")),

  stats: () => unwrap<StockStats>(apiClient.get("/api/products/stats")),
};