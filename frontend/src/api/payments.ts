import { apiClient } from "./client";
import type { ApiResponse } from "../types/api";
import type { PaymentMethod } from "./invoices";

// Mirrors PaymentService.PaymentRecord
export interface PaymentRecord {
  id: string;
  amount: number;
  currencyCode: string;
  amountInr: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  paymentDate: string;
  notes?: string;
}

// Mirrors PaymentService.PaymentMethodStat — PaymentController's own code
// comment says this is "Used in Dashboard donut chart", so it's genuinely
// built for this exact widget, not repurposed from something else.
export interface PaymentMethodStat {
  method: PaymentMethod;
  totalAmount: number;
  percentage: number;
}

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  if (data.data === undefined) throw new Error(data.message ?? "Empty response from server");
  return data.data;
}

export const paymentsApi = {
  // from/to default server-side to "this month" if omitted
  getBreakdown: (from?: string, to?: string) =>
    unwrap<PaymentMethodStat[]>(apiClient.get("/api/payments/breakdown", { params: { from, to } })),

  getTotalCollected: (from?: string, to?: string) =>
    unwrap<number>(apiClient.get("/api/payments/total", { params: { from, to } })),

  getCustomerPayments: (customerId: string) =>
    unwrap<PaymentRecord[]>(apiClient.get(`/api/payments/customer/${customerId}`)),
};