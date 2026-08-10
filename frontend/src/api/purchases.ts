import { apiClient } from "./client";
import type { ApiResponse, Page } from "../types/api";

export type PurchasePaymentStatus = "DRAFT" | "UNPAID" | "PARTIAL" | "PAID";

// Mirrors PurchaseDTOs.ItemRequest — unitPrice is REQUIRED here (unlike
// invoices, where it's an optional override) since purchases record what
// you actually paid the supplier, not a catalog price.
export interface PurchaseItemRequest {
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number; // optional override — defaults to the product's own taxRate
}

// Mirrors PurchaseDTOs.SaveRequest
export interface PurchaseSaveRequest {
  supplierId: string;
  supplierInvoiceNumber?: string;
  purchaseDate: string; // ISO "yyyy-MM-dd"
  dueDate?: string;
  currencyCode?: string;
  exchangeRate?: number;
  items: PurchaseItemRequest[];
  notes?: string;
  saveAsDraft?: boolean;
}

// Mirrors PurchaseDTOs.SupplierPaymentRequest
export interface SupplierPaymentRequest {
  amount: number;
  paymentMethod: string;
  transactionReference?: string;
  paymentDate?: string;
  notes?: string;
}

// Mirrors PurchaseDTOs.ReturnRequest
export interface PurchaseReturnRequest {
  purchaseId: string;
  returnReason: string;
  items: PurchaseItemRequest[];
}

// Mirrors PurchaseItem model — as returned inside PurchaseResponse.items
export interface PurchaseItemLine {
  id: string;
  productId: string;
  productName: string;
  hsnCode?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxAmount: number;
  lineTotal: number;
}

// Mirrors PurchaseDTOs.PurchaseResponse — note there's no itemized
// `payments` list like invoices have, only the aggregate totalPaid/balanceDue.
export interface PurchaseResponse {
  id: string;
  companyId: string;
  supplierId: string;
  supplierName: string;
  supplierGstin?: string;
  purchaseNumber: string;
  supplierInvoiceNumber?: string;
  purchaseDate: string;
  dueDate?: string;
  currencyCode: string;
  exchangeRate?: number;
  items: PurchaseItemLine[];
  subtotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  totalAmount: number;
  totalAmountInr: number;
  totalPaid: number;
  balanceDue: number;
  paymentStatus: PurchasePaymentStatus;
  isReturn: boolean;
  returnOfPurchaseId?: string;
  returnReason?: string;
  notes?: string;
  createdAt: string;
}

// Mirrors PurchaseDTOs.PurchaseSummary — used in the list table
export interface PurchaseSummary {
  id: string;
  purchaseNumber: string;
  supplierName: string;
  purchaseDate: string;
  dueDate?: string;
  totalAmount: number;
  balanceDue: number;
  paymentStatus: PurchasePaymentStatus;
  isReturn: boolean;
}

// Mirrors PurchaseDTOs.PurchaseStats
export interface PurchaseStats {
  todayPurchases: number;
  monthPurchases: number;
  totalPayable: number;
  unpaidCount: number;
}

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  if (data.data === undefined) throw new Error(data.message ?? "Empty response from server");
  return data.data;
}

export const purchasesApi = {
  list: (
    params: { keyword?: string; status?: PurchasePaymentStatus; supplierId?: string; page?: number; size?: number } = {}
  ) =>
    unwrap<Page<PurchaseSummary>>(
      apiClient.get("/api/purchases", {
        params: {
          keyword: params.keyword || undefined,
          status: params.status || undefined,
          supplierId: params.supplierId || undefined,
          page: params.page ?? 0,
          size: params.size ?? 10,
        },
      })
    ),

  getById: (id: string) => unwrap<PurchaseResponse>(apiClient.get(`/api/purchases/${id}`)),

  create: (body: PurchaseSaveRequest) =>
    unwrap<PurchaseResponse>(apiClient.post("/api/purchases", body)),

  confirmDraft: (id: string) =>
    unwrap<PurchaseResponse>(apiClient.post(`/api/purchases/${id}/confirm`)),

  recordPayment: (id: string, body: SupplierPaymentRequest) =>
    unwrap<PurchaseResponse>(apiClient.post(`/api/purchases/${id}/payment`, body)),

  createReturn: (body: PurchaseReturnRequest) =>
    unwrap<PurchaseResponse>(apiClient.post("/api/purchases/return", body)),

  stats: () => unwrap<PurchaseStats>(apiClient.get("/api/purchases/stats")),
};