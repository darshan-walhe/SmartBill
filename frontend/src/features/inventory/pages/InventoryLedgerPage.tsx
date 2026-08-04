import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "../../../lib/useDebounce";
import { productsApi, type ProductSummary } from "../../../api/products";
import { inventoryApi, OUTGOING_TYPES, type StockLedgerResponse } from "../../../api/inventory";
import { Icon } from "../../../components/Icon";
import { Table, type Column } from "../../../components/ui/Table";
import { StockAdjustmentModal } from "../components/StockAdjustmentModal";

const typeTone: Record<string, string> = {
  PURCHASE: "bg-emerald-100 text-emerald-700",
  SALE_RETURN: "bg-emerald-100 text-emerald-700",
  ADJUSTMENT_IN: "bg-emerald-100 text-emerald-700",
  OPENING: "bg-emerald-100 text-emerald-700",
  TRANSFER_IN: "bg-emerald-100 text-emerald-700",
  SALE: "bg-amber-100 text-amber-700",
  ADJUSTMENT_OUT: "bg-amber-100 text-amber-700",
  PURCHASE_RETURN: "bg-amber-100 text-amber-700",
  TRANSFER_OUT: "bg-amber-100 text-amber-700",
};

const typeIcon: Record<string, string> = {
  PURCHASE: "add_circle",
  SALE_RETURN: "add_circle",
  ADJUSTMENT_IN: "tune",
  OPENING: "flag",
  TRANSFER_IN: "call_received",
  SALE: "shopping_cart",
  ADJUSTMENT_OUT: "remove_circle",
  PURCHASE_RETURN: "keyboard_return",
  TRANSFER_OUT: "call_made",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function InventoryLedgerPage() {
  const [productSearch, setProductSearch] = useState("");
  const debouncedSearch = useDebounce(productSearch, 300);
  const [selectedProduct, setSelectedProduct] = useState<ProductSummary | null>(null);
  const [ledgerPage, setLedgerPage] = useState(0);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [runReport, setRunReport] = useState(false);

  const { data: searchResults } = useQuery({
    queryKey: ["products", "search", debouncedSearch],
    queryFn: () => productsApi.list(debouncedSearch, undefined, 0, 8),
    enabled: debouncedSearch.length > 1 && !selectedProduct,
  });

  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ["inventory-ledger", selectedProduct?.id, ledgerPage],
    queryFn: () => inventoryApi.getLedger(selectedProduct!.id, ledgerPage, 20),
    enabled: !!selectedProduct,
  });

  const { data: reportRows, isLoading: reportLoading } = useQuery({
    queryKey: ["inventory-report", fromDate, toDate],
    queryFn: () => inventoryApi.getReport(`${fromDate}T00:00:00`, `${toDate}T23:59:59`),
    enabled: runReport && !!fromDate && !!toDate,
  });

  const lastEntry = ledger?.content?.[0];

  const ledgerColumns: Column<StockLedgerResponse>[] = useMemo(
    () => [
      { header: "Date", cell: (l) => <span className="font-mono text-numeric-table">{formatDate(l.createdAt)}</span> },
      {
        header: "Type",
        cell: (l) => (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-label-md font-bold ${typeTone[l.transactionType] ?? "bg-slate-100 text-slate-600"}`}>
            <Icon name={typeIcon[l.transactionType] ?? "swap_horiz"} size={14} />
            {l.transactionType}
          </span>
        ),
      },
      {
        header: "Quantity",
        align: "right",
        cell: (l) => {
          const isOut = OUTGOING_TYPES.includes(l.transactionType);
          return (
            <span className={`font-mono font-bold ${isOut ? "text-error" : "text-secondary"}`}>
              {isOut ? "-" : "+"} {Math.abs(l.quantity)}
            </span>
          );
        },
      },
      { header: "Balance After", align: "right", cell: (l) => <span className="font-mono">{l.balanceAfter}</span> },
      { header: "Reference", cell: (l) => <span className="font-medium">{l.referenceNumber || "—"}</span> },
      { header: "Notes", cell: (l) => <span className="text-on-surface-variant italic truncate max-w-xs block">{l.notes || "—"}</span> },
    ],
    []
  );

  const reportColumns: Column<StockLedgerResponse>[] = [
    { header: "Date", cell: (l) => <span className="font-mono text-numeric-table">{formatDate(l.createdAt)}</span> },
    { header: "Product", cell: (l) => <span className="font-medium text-primary">{l.productName}</span> },
    {
      header: "Type",
      cell: (l) => (
        <span className={`px-2 py-1 rounded-full text-label-md font-bold ${typeTone[l.transactionType] ?? "bg-slate-100 text-slate-600"}`}>
          {l.transactionType}
        </span>
      ),
    },
    {
      header: "Qty",
      align: "right",
      cell: (l) => {
        const isOut = OUTGOING_TYPES.includes(l.transactionType);
        return <span className={`font-mono font-bold ${isOut ? "text-error" : "text-secondary"}`}>{isOut ? "-" : "+"} {Math.abs(l.quantity)}</span>;
      },
    },
    { header: "Balance", align: "right", cell: (l) => <span className="font-mono">{l.balanceAfter}</span> },
    { header: "Reference", cell: (l) => l.referenceNumber || "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-headline-lg text-on-surface">Inventory Ledger &amp; Stock Adjustment</h2>
          <p className="text-body-md text-on-surface-variant mt-1">
            Track every unit movement and adjust stock levels with precision.
          </p>
        </div>
        <button
          onClick={() => setAdjustOpen(true)}
          className="bg-primary-container text-on-primary-container font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 hover:shadow-md transition-all active:scale-95"
        >
          <Icon name="tune" />
          Adjust Stock
        </button>
      </div>

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-outline-variant bg-surface-container-low flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="w-full max-w-md relative">
            <label className="block text-label-md text-on-surface-variant mb-1">Select Product to View Ledger</label>
            <div className="relative">
              <Icon name="inventory" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
              <input
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                placeholder="Search and select product..."
                value={productSearch}
                onChange={(e) => { setProductSearch(e.target.value); setSelectedProduct(null); }}
              />
            </div>
            {searchResults && searchResults.content.length > 0 && !selectedProduct && (
              <div className="absolute z-10 mt-1 w-full bg-surface border border-outline-variant rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {searchResults.content.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProduct(p);
                      setProductSearch(`${p.name}${p.sku ? ` (SKU: ${p.sku})` : ""}`);
                      setLedgerPage(0);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-surface-container-low text-body-md"
                  >
                    {p.name} <span className="text-on-surface-variant text-label-md">{p.sku ? `SKU: ${p.sku}` : ""}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedProduct && (
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-label-md text-on-surface-variant">Current Balance</p>
                <p className="text-headline-md font-bold text-primary font-tabular">
                  {lastEntry?.balanceAfter ?? selectedProduct.currentStock} {selectedProduct.unit}
                </p>
              </div>
              <div className="h-10 w-px bg-outline-variant" />
              <div className="text-right">
                <p className="text-label-md text-on-surface-variant">Last Updated</p>
                <p className="text-body-md font-medium">{lastEntry ? formatDate(lastEntry.createdAt) : "—"}</p>
              </div>
            </div>
          )}
        </div>

        {selectedProduct ? (
          <Table
            columns={ledgerColumns}
            rows={ledger?.content ?? []}
            keyOf={(l) => l.id}
            isLoading={ledgerLoading}
            emptyMessage="No stock movements recorded for this product yet."
            page={ledgerPage}
            totalPages={ledger?.totalPages ?? 0}
            totalElements={ledger?.totalElements}
            onPageChange={setLedgerPage}
            entityLabel="entries"
          />
        ) : (
          <div className="p-10 text-center text-on-surface-variant">
            <Icon name="search" size={32} className="mx-auto mb-2 opacity-50" />
            Search and select a product above to view its stock ledger.
          </div>
        )}
      </section>

      <section className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => setReportOpen((v) => !v)}
          className="w-full flex items-center justify-between p-6 hover:bg-surface-container-low transition-colors text-left"
        >
          <div className="flex items-center gap-4">
            <Icon name="calendar_month" className="text-primary" />
            <div>
              <h3 className="text-headline-md font-bold">Date Range Report</h3>
              <p className="text-body-md text-on-surface-variant">
                View all stock movements across the entire inventory for a specific period.
              </p>
            </div>
          </div>
          <Icon name="expand_more" className={`transition-transform ${reportOpen ? "rotate-180" : ""}`} />
        </button>

        {reportOpen && (
          <div className="border-t border-outline-variant">
            <div className="p-6 bg-surface-container-low flex flex-wrap items-end gap-4">
              <div className="flex-grow max-w-xs">
                <label className="block text-label-md text-on-surface-variant mb-1">Start Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => { setFromDate(e.target.value); setRunReport(false); }}
                  className="w-full p-2.5 border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="flex-grow max-w-xs">
                <label className="block text-label-md text-on-surface-variant mb-1">End Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => { setToDate(e.target.value); setRunReport(false); }}
                  className="w-full p-2.5 border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <button
                onClick={() => setRunReport(true)}
                disabled={!fromDate || !toDate}
                className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-xl hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                Run Report
              </button>
            </div>

            {runReport && (
              <Table
                columns={reportColumns}
                rows={reportRows ?? []}
                keyOf={(l) => l.id}
                isLoading={reportLoading}
                emptyMessage="No stock movements in this date range."
              />
            )}
          </div>
        )}
      </section>

      <StockAdjustmentModal isOpen={adjustOpen} onClose={() => setAdjustOpen(false)} presetProduct={selectedProduct} />
    </div>
  );
}