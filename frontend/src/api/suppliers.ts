import { apiClient } from "./client";
import type { ApiResponse, Page } from "../types/api";

// Mirrors SupplierDTOs.SaveRequest
export interface SupplierSaveRequest {
  name: string;
  mobile?: string;
  email?: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  openingBalance?: number;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  accountHolderName?: string;
}

// Mirrors SupplierDTOs.SupplierResponse
export interface SupplierResponse extends SupplierSaveRequest {
  id: string;
  companyId: string;
  outstandingAmount: number;
}

// Mirrors SupplierDTOs.SupplierSummary — used in the list table
export interface SupplierSummary {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  gstin?: string;
  city?: string;
  state?: string;
  outstandingAmount: number;
}

// Mirrors the inline SupplierStatsResponse record — totalPayable only, no
// "active suppliers" or "overdue bills" counts exist on the backend.
export interface SupplierStats {
  totalPayable: number;
}

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  if (data.data === undefined) throw new Error(data.message ?? "Empty response from server");
  return data.data;
}

export const suppliersApi = {
  list: (keyword: string | undefined, page = 0, size = 10) =>
    unwrap<Page<SupplierSummary>>(
      apiClient.get("/api/suppliers", { params: { keyword: keyword || undefined, page, size } })
    ),

  getById: (id: string) => unwrap<SupplierResponse>(apiClient.get(`/api/suppliers/${id}`)),

  create: (body: SupplierSaveRequest) =>
    unwrap<SupplierResponse>(apiClient.post("/api/suppliers", body)),

  update: (id: string, body: SupplierSaveRequest) =>
    unwrap<SupplierResponse>(apiClient.put(`/api/suppliers/${id}`, body)),

  delete: (id: string) => unwrap<void>(apiClient.delete(`/api/suppliers/${id}`)),

  outstanding: () => unwrap<SupplierSummary[]>(apiClient.get("/api/suppliers/outstanding")),

  stats: () => unwrap<SupplierStats>(apiClient.get("/api/suppliers/stats")),
};