import { apiClient } from "./client";
import type { ApiResponse, Page } from "../types/api";

export type NotificationType =
  | "LOW_STOCK" | "OUT_OF_STOCK" | "PAYMENT_RECEIVED" | "PAYMENT_MADE"
  | "INVOICE_OVERDUE" | "INVOICE_CANCELLED" | "PURCHASE_RECEIVED" | "USER_INVITED" | "GENERAL";

// Mirrors NotificationDTOs.NotificationResponse
export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceType?: string;
  referenceId?: string;
  read: boolean;
  createdAt: string;
}

// Mirrors NotificationDTOs.CreateRequest — ADMIN-only broadcast
export interface BroadcastRequest {
  title: string;
  message: string;
}

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  if (data.data === undefined) throw new Error(data.message ?? "Empty response from server");
  return data.data;
}

export const notificationsApi = {
  list: (page = 0, size = 20) =>
    unwrap<Page<NotificationResponse>>(apiClient.get("/api/notifications", { params: { page, size } })),

  unreadCount: () =>
    unwrap<{ unreadCount: number }>(apiClient.get("/api/notifications/unread-count")),

  markRead: (id: string) =>
    unwrap<NotificationResponse>(apiClient.patch(`/api/notifications/${id}/read`)),

  markAllRead: () => unwrap<void>(apiClient.patch("/api/notifications/read-all")),

  broadcast: (body: BroadcastRequest) =>
    unwrap<NotificationResponse>(apiClient.post("/api/notifications", body)),
};