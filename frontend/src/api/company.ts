import { apiClient } from "./client";
import type { ApiResponse } from "../types/api";

export type SubscriptionPlan = "FREE" | "BASIC" | "PRO" | "ENTERPRISE";

// Mirrors CompanyDTOs.CompanyResponse
export interface CompanyResponse {
  id: string;
  name: string;
  gstNumber?: string;
  panNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  email?: string;
  mobile?: string;
  logoUrl?: string;
  signatureUrl?: string;
  defaultCurrency?: string;
  invoicePrefix?: string;
  invoiceSequence: number;
  financialYearStartMonth: number;
  subscriptionPlan: SubscriptionPlan;
}

// Mirrors CompanyDTOs.UpdateRequest
export interface CompanyUpdateRequest {
  name: string;
  gstNumber?: string;
  panNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  email?: string;
  mobile?: string;
  logoUrl?: string;
  signatureUrl?: string;
  defaultCurrency?: string;
  invoicePrefix?: string;
  financialYearStartMonth?: number;
}

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  if (data.data === undefined) throw new Error(data.message ?? "Empty response from server");
  return data.data;
}

export const companyApi = {
  get: () => unwrap<CompanyResponse>(apiClient.get("/api/company")),

  update: (body: CompanyUpdateRequest) =>
    unwrap<CompanyResponse>(apiClient.put("/api/company", body)),
};
