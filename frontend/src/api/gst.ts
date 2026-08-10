import { apiClient } from "./client";
import type { ApiResponse } from "../types/api";

export interface HsnSummaryRow {
  hsnCode: string;
  productDescription: string;
  uqc?: string;
  totalQuantity: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  taxRate: number;
}

export interface InvoiceGstDetail {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerGstin?: string; // null/undefined = B2C
  invoiceType: "B2B" | "B2C" | "EXPORT";
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalAmount: number;
  currencyCode: string;
}

// Mirrors GstDTOs.Gstr1Report
export interface Gstr1Report {
  financialYear: string;
  period: string;
  from: string;
  to: string;
  totalTaxableTurnover: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalGstCollected: number;
  b2bTaxableAmount: number;
  b2cTaxableAmount: number;
  exportTaxableAmount: number;
  hsnSummary: HsnSummaryRow[];
  invoices: InvoiceGstDetail[];
}

// Mirrors GstDTOs.Gstr3bReport
export interface Gstr3bReport {
  financialYear: string;
  period: string;
  from: string;
  to: string;
  outwardTaxableAmount: number;
  outwardCgst: number;
  outwardSgst: number;
  outwardIgst: number;
  outwardTotalTax: number;
  inputCgst: number;
  inputSgst: number;
  inputIgst: number;
  totalInputTax: number;
  netCgstPayable: number;
  netSgstPayable: number;
  netIgstPayable: number;
  netTaxPayable: number;
  isRefundable: boolean;
}

// Mirrors GstDTOs.TaxSlabBreakdown
export interface TaxSlabBreakdown {
  taxRate: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  invoiceCount: number;
}

// Mirrors GstDTOs.FilingStatus — note there's no real "filed with the
// government" tracking here, just whether sales/purchase activity existed
// that month. Nothing in this system actually files anything.
export interface FilingStatus {
  month: string;
  from: string;
  to: string;
  hasSales: boolean;
  hasPurchases: boolean;
  totalSales: number;
  totalPurchases: number;
  netTaxPayable: number;
}

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  if (data.data === undefined) throw new Error(data.message ?? "Empty response from server");
  return data.data;
}

export const gstApi = {
  getGstr1: (from: string, to: string) =>
    unwrap<Gstr1Report>(apiClient.get("/api/gst/gstr1", { params: { from, to } })),

  getGstr3b: (from: string, to: string) =>
    unwrap<Gstr3bReport>(apiClient.get("/api/gst/gstr3b", { params: { from, to } })),

  getHsnSummary: (from: string, to: string) =>
    unwrap<HsnSummaryRow[]>(apiClient.get("/api/gst/hsn-summary", { params: { from, to } })),

  getTaxSlabBreakdown: (from: string, to: string) =>
    unwrap<TaxSlabBreakdown[]>(apiClient.get("/api/gst/tax-slab", { params: { from, to } })),

  // fy format: "2024-25" — omit to let the backend default to the current FY
  getFilingStatus: (fy?: string) =>
    unwrap<FilingStatus[]>(apiClient.get("/api/gst/filing-status", { params: { fy: fy || undefined } })),
};