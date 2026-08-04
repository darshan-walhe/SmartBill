import { apiClient } from "./client";
import type { ApiResponse, Page, Role } from "../types/api";
import type { SubscriptionPlan } from "./company";

// Mirrors AdminDTOs.CompanyAdminSummary
export interface CompanyAdminSummary {
  id: string;
  name: string;
  gstNumber?: string;
  email?: string;
  mobile?: string;
  subscriptionPlan: SubscriptionPlan;
  active: boolean;
  createdByUserId?: string;
  createdAt: string;
}

// Mirrors AdminDTOs.PlatformUserSummary
export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: Role;
  companyId: string | null;
  active: boolean;
  createdAt: string;
}

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  if (data.data === undefined) throw new Error(data.message ?? "Empty response from server");
  return data.data;
}

export const adminApi = {
  listCompanies: (page = 0, size = 10) =>
    unwrap<Page<CompanyAdminSummary>>(
      apiClient.get("/api/admin/companies", { params: { page, size } })
    ),

  getCompany: (id: string) =>
    unwrap<CompanyAdminSummary>(apiClient.get(`/api/admin/companies/${id}`)),

  deactivateCompany: (id: string) =>
    unwrap<CompanyAdminSummary>(apiClient.patch(`/api/admin/companies/${id}/deactivate`)),

  reactivateCompany: (id: string) =>
    unwrap<CompanyAdminSummary>(apiClient.patch(`/api/admin/companies/${id}/reactivate`)),

  updateSubscriptionPlan: (id: string, plan: SubscriptionPlan) =>
    unwrap<CompanyAdminSummary>(
      apiClient.patch(`/api/admin/companies/${id}/subscription-plan`, { plan })
    ),

  listUsers: (page = 0, size = 10) =>
    unwrap<Page<PlatformUser>>(apiClient.get("/api/admin/users", { params: { page, size } })),

  promoteToSuperAdmin: (userId: string) =>
    unwrap<PlatformUser>(apiClient.patch(`/api/admin/users/${userId}/promote`)),
};
