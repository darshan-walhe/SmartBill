import { apiClient } from "./client";
import type { ApiResponse, Page } from "../types/api";

export type InvoiceType = "TAX_INVOICE" | "PROFORMA" | "QUOTATION" | "EXPORT_INVOICE";
export type PaymentStatus = "DRAFT" | "UNPAID" | "PARTIAL" | "PAID" | "CANCELLED";
export type PaymentMethod = "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "INTERNATIONAL" | "CHEQUE";

// Mirrors InvoiceDTOs.ItemRequest
export interface InvoiceItemRequest {
  productId: string;
  quantity: number;
  unitPrice?: number; // only ADMIN/MANAGER overrides are honored server-side
  discountPercent?: number;
}

// Mirrors InvoiceDTOs.SaveRequest
export interface InvoiceSaveRequest {
  customerId: string;
  invoiceType?: InvoiceType;
  invoiceDate: string; // LocalDate as ISO "yyyy-MM-dd"
  dueDate?: string;
  currencyCode?: string;
  exchangeRate?: number;
  placeOfSupply?: string;
  items: InvoiceItemRequest[];
  shippingCharges?: number;
  notes?: string;
  termsAndConditions?: string;
  saveAsDraft?: boolean;
}

// Mirrors InvoiceDTOs.PaymentRequest
export interface InvoicePaymentRequest {
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  paymentDate?: string;
  notes?: string;
}

// Mirrors InvoiceItem model — as returned inside InvoiceResponse.items
export interface InvoiceItemLine {
  id: string;
  productId: string;
  productName: string;
  hsnCode?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxAmount: number;
  lineTotal: number;
}

// Mirrors Payment model — as returned inside InvoiceResponse.payments
export interface InvoicePayment {
  id: string;
  amount: number;
  currencyCode: string;
  amountInr: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  paymentDate: string;
  notes?: string;
  recordedBy: string;
}

// Mirrors InvoiceDTOs.InvoiceResponse
export interface InvoiceResponse {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  customerGstin?: string;
  billingAddress?: string;
  shippingAddress?: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  invoiceDate: string;
  dueDate?: string;
  currencyCode: string;
  exchangeRate?: number;
  placeOfSupply?: string;
  items: InvoiceItemLine[];
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  shippingCharges: number;
  roundOff: number;
  totalAmount: number;
  totalAmountInr: number;
  payments: InvoicePayment[];
  totalPaid: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  notes?: string;
  termsAndConditions?: string;
  createdAt: string;
}

// Mirrors InvoiceDTOs.InvoiceSummary — used in the list table
export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  dueDate?: string;
  currencyCode: string;
  totalAmount: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  invoiceType: InvoiceType;
}

// Mirrors InvoiceDTOs.SalesStats
export interface SalesStats {
  todaySales: number;
  monthSales: number;
  yearSales: number;
  totalInvoices: number;
  unpaidCount: number;
  overdueCount: number;
  totalOutstanding: number;
}

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  if (data.data === undefined) throw new Error(data.message ?? "Empty response from server");
  return data.data;
}

export const invoicesApi = {
  list: (
    params: { keyword?: string; status?: PaymentStatus; customerId?: string; page?: number; size?: number } = {}
  ) =>
    unwrap<Page<InvoiceSummary>>(
      apiClient.get("/api/invoices", {
        params: {
          keyword: params.keyword || undefined,
          status: params.status || undefined,
          customerId: params.customerId || undefined,
          page: params.page ?? 0,
          size: params.size ?? 10,
        },
      })
    ),

  getById: (id: string) => unwrap<InvoiceResponse>(apiClient.get(`/api/invoices/${id}`)),

  create: (body: InvoiceSaveRequest) =>
    unwrap<InvoiceResponse>(apiClient.post("/api/invoices", body)),

  confirmDraft: (id: string) =>
    unwrap<InvoiceResponse>(apiClient.post(`/api/invoices/${id}/confirm`)),

  recordPayment: (id: string, body: InvoicePaymentRequest) =>
    unwrap<InvoiceResponse>(apiClient.post(`/api/invoices/${id}/payment`, body)),

  cancel: (id: string) => unwrap<InvoiceResponse>(apiClient.post(`/api/invoices/${id}/cancel`)),

  overdue: () => unwrap<InvoiceSummary[]>(apiClient.get("/api/invoices/overdue")),

  stats: () => unwrap<SalesStats>(apiClient.get("/api/invoices/stats")),
};