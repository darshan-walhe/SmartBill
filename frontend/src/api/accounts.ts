import { apiClient } from "./client";
import type { ApiResponse, Page } from "../types/api";

export type AccountType =
  | "CASH" | "BANK" | "ACCOUNTS_RECEIVABLE" | "ACCOUNTS_PAYABLE" | "SALES_REVENUE"
  | "PURCHASE" | "CGST_PAYABLE" | "SGST_PAYABLE" | "IGST_PAYABLE" | "INPUT_CGST"
  | "INPUT_SGST" | "INPUT_IGST" | "EXPENSE" | "INCOME" | "DISCOUNT_GIVEN"
  | "DISCOUNT_RECEIVED" | "STOCK" | "CAPITAL" | "DRAWING";

export type JournalReferenceType =
  | "INVOICE" | "PAYMENT_RECEIVED" | "PURCHASE" | "PAYMENT_MADE" | "EXPENSE" | "INCOME" | "MANUAL";

// Mirrors AccountsDTOs.LineRequest
export interface JournalLineRequest {
  accountType: AccountType;
  accountName: string;
  debitAmount?: number;
  creditAmount?: number;
  narration?: string;
}

// Mirrors AccountsDTOs.JournalRequest
export interface JournalRequest {
  entryDate: string; // ISO "yyyy-MM-dd"
  description: string;
  lines: JournalLineRequest[];
}

// Mirrors JournalLine model — as returned inside JournalEntryResponse.lines
export interface JournalLine {
  id: string;
  accountType: AccountType;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  narration?: string;
}

// Mirrors AccountsDTOs.JournalEntryResponse
export interface JournalEntryResponse {
  id: string;
  entryDate: string;
  referenceType: JournalReferenceType;
  referenceId?: string;
  referenceNumber?: string;
  description: string;
  totalAmount: number;
  lines: JournalLine[];
  createdAt: string;
}

// Mirrors AccountsDTOs.BookEntry
export interface BookEntry {
  date: string;
  particulars: string;
  voucherType?: string;
  voucherNumber?: string;
  debit: number;
  credit: number;
  balance: number;
}

// Mirrors AccountsDTOs.CashBookResponse
export interface CashBookResponse {
  from: string;
  to: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  entries: BookEntry[];
}

// Mirrors AccountsDTOs.ProfitLossReport
export interface ProfitLossReport {
  from: string;
  to: string;
  totalSales: number;
  totalOtherIncome: number;
  grossIncome: number;
  totalPurchases: number;
  totalExpenses: number;
  grossExpenses: number;
  netProfit: number;
  isProfit: boolean;
}

// Mirrors AccountsDTOs.TrialBalanceLine
export interface TrialBalanceLine {
  accountName: string;
  accountType: AccountType;
  debitTotal: number;
  creditTotal: number;
  netBalance: number;
}

// Mirrors AccountsDTOs.TrialBalanceReport
export interface TrialBalanceReport {
  asOfDate: string;
  lines: TrialBalanceLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  if (data.data === undefined) throw new Error(data.message ?? "Empty response from server");
  return data.data;
}

export const accountsApi = {
  postJournal: (body: JournalRequest) =>
    unwrap<JournalEntryResponse>(apiClient.post("/api/accounts/journal", body)),

  listJournal: (page = 0, size = 20) =>
    unwrap<Page<JournalEntryResponse>>(apiClient.get("/api/accounts/journal", { params: { page, size } })),

  getJournalById: (id: string) =>
    unwrap<JournalEntryResponse>(apiClient.get(`/api/accounts/journal/${id}`)),

  // from/to default server-side to "this month" if omitted
  getCashBook: (from?: string, to?: string) =>
    unwrap<CashBookResponse>(apiClient.get("/api/accounts/cash-book", { params: { from, to } })),

  // from/to default server-side to "this financial year" if omitted
  getProfitLoss: (from?: string, to?: string) =>
    unwrap<ProfitLossReport>(apiClient.get("/api/accounts/profit-loss", { params: { from, to } })),

  // asOf defaults server-side to today if omitted
  getTrialBalance: (asOf?: string) =>
    unwrap<TrialBalanceReport>(apiClient.get("/api/accounts/trial-balance", { params: { asOf } })),
};