import { apiClient } from "./client";
import type { ApiResponse, Page } from "../types/api";

// Mirrors CustomerDTOs.SaveRequest
export interface CustomerSaveRequest {
  name: string;
  mobile?: string;
  email?: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  creditLimit?: number;
  openingBalance?: number;
}

// Mirrors CustomerDTOs.CustomerResponse
export interface CustomerResponse extends CustomerSaveRequest {
  id: string;
  companyId: string;
  currentBalance: number;
  active: boolean;
  createdAt: string;
}

// Mirrors CustomerDTOs.CustomerSummary — used in the list table
export interface CustomerSummary {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  gstin?: string;
  city?: string;
  state?: string;
  currentBalance: number;
}

export interface CustomerStats {
  totalCustomers: number;
  totalReceivable: number;
}

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  if (data.data === undefined) throw new Error(data.message ?? "Empty response from server");
  return data.data;
}

export const customersApi = {
  list: (keyword: string | undefined, page = 0, size = 10) =>
    unwrap<Page<CustomerSummary>>(
      apiClient.get("/api/customers", { params: { keyword: keyword || undefined, page, size } })
    ),

  getById: (id: string) => unwrap<CustomerResponse>(apiClient.get(`/api/customers/${id}`)),

  create: (body: CustomerSaveRequest) =>
    unwrap<CustomerResponse>(apiClient.post("/api/customers", body)),

  update: (id: string, body: CustomerSaveRequest) =>
    unwrap<CustomerResponse>(apiClient.put(`/api/customers/${id}`, body)),

  delete: (id: string) => unwrap<void>(apiClient.delete(`/api/customers/${id}`)),

  outstanding: () => unwrap<CustomerSummary[]>(apiClient.get("/api/customers/outstanding")),

  stats: () => unwrap<CustomerStats>(apiClient.get("/api/customers/stats")),
};