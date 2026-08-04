import { apiClient } from "./client";
import type { ApiResponse, Page } from "../types/api";
import type { ProductSummary } from "./products";

export type TransactionType =
  | "OPENING"
  | "PURCHASE"
  | "SALE"
  | "PURCHASE_RETURN"
  | "SALE_RETURN"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT";

export type ReferenceType = "INVOICE" | "PURCHASE" | "MANUAL_ADJUSTMENT" | "OPENING_STOCK" | "TRANSFER";

// Movement direction inferred from transactionType — the backend's `quantity`
// field doesn't carry a sign itself, direction comes from the type.
export const OUTGOING_TYPES: TransactionType[] = ["SALE", "ADJUSTMENT_OUT", "TRANSFER_OUT", "PURCHASE_RETURN"];

// Mirrors InventoryDTOs.AdjustmentRequest — only ADJUSTMENT_IN/OUT are valid
// here even though the backend's TransactionType enum has more values.
export interface AdjustmentRequest {
  productId: string;
  type: "ADJUSTMENT_IN" | "ADJUSTMENT_OUT";
  quantity: number;
  notes?: string;
}

// Mirrors InventoryDTOs.StockLedgerResponse
export interface StockLedgerResponse {
  id: string;
  productId: string;
  productName: string;
  productSku?: string;
  transactionType: TransactionType;
  quantity: number;
  balanceAfter: number;
  referenceType?: ReferenceType;
  referenceId?: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise;
  if (data.data === undefined) throw new Error(data.message ?? "Empty response from server");
  return data.data;
}

export const inventoryApi = {
  adjust: (body: AdjustmentRequest) =>
    unwrap<StockLedgerResponse>(apiClient.post("/api/inventory/adjust", body)),

  getLedger: (productId: string, page = 0, size = 20) =>
    unwrap<Page<StockLedgerResponse>>(
      apiClient.get(`/api/inventory/ledger/${productId}`, { params: { page, size } })
    ),

  // from/to must be full ISO date-times (LocalDateTime on the backend) —
  // callers pass e.g. "2024-04-01T00:00:00" / "2024-06-30T23:59:59"
  getReport: (from: string, to: string) =>
    unwrap<StockLedgerResponse[]>(apiClient.get("/api/inventory/report", { params: { from, to } })),

  lowStock: () => unwrap<ProductSummary[]>(apiClient.get("/api/inventory/low-stock")),
};