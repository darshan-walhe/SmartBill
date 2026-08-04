import { apiClient } from "./client";
import type { ApiResponse, Page } from "../types/api";

// Mirrors AuditLog.Action exactly
export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "CANCEL"
  | "CONFIRM"
  | "LOGIN"
  | "ROLE_CHANGE"
  | "DEACTIVATE"
  | "REACTIVATE"
  | "PAYMENT"
  | "INVITE";

// Mirrors AuditLogDTOs.AuditLogResponse
export interface AuditLogEntry {
  id: string;
  companyId: string | null;
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  description: string;
  metadata?: Record<string, string>;
  createdAt: string;
}

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  if (data.data === undefined) throw new Error(data.message ?? "Empty response from server");
  return data.data;
}

export const auditLogApi = {
  // Company-scoped — ADMIN/MANAGER only (see AuditController)
  list: (page = 0, size = 10) =>
    unwrap<Page<AuditLogEntry>>(apiClient.get("/api/audit-logs", { params: { page, size } })),

  // Platform-wide — SUPER_ADMIN only (see AdminController)
  listAll: (page = 0, size = 10) =>
    unwrap<Page<AuditLogEntry>>(
      apiClient.get("/api/admin/audit-logs", { params: { page, size } })
    ),
};
