import { useQuery } from "@tanstack/react-query";
import { gstApi } from "../../../api/gst";
import { Table, type Column } from "../../../components/ui/Table";
import type { TaxSlabBreakdown } from "../../../api/gst";

function formatINR(n: number): string {
  return `₹ ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const slabColor: Record<number, string> = {
  0: "bg-slate-400",
  5: "bg-blue-400",
  12: "bg-emerald-400",
  18: "bg-amber-400",
  28: "bg-rose-400",
};

export function TaxSlabTab({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["gst", "tax-slab", from, to],
    queryFn: () => gstApi.getTaxSlabBreakdown(from, to),
  });

  const rows = data ?? [];
  const totalTaxable = rows.reduce((sum, r) => sum + r.taxableAmount, 0);

  const columns: Column<TaxSlabBreakdown>[] = [
    {
      header: "Tax Rate",
      cell: (r) => (
        <span className="inline-flex items-center gap-2 font-bold">
          <span className={`w-2.5 h-2.5 rounded-full ${slabColor[r.taxRate] ?? "bg-slate-400"}`} />
          {r.taxRate}%
        </span>
      ),
    },
    { header: "Invoices", align: "right", cell: (r) => r.invoiceCount },
    { header: "Taxable Amount", align: "right", cell: (r) => <span className="font-mono">{formatINR(r.taxableAmount)}</span> },
    { header: "CGST", align: "right", cell: (r) => <span className="font-mono">{formatINR(r.cgst)}</span> },
    { header: "SGST", align: "right", cell: (r) => <span className="font-mono">{formatINR(r.sgst)}</span> },
    { header: "IGST", align: "right", cell: (r) => <span className="font-mono">{formatINR(r.igst)}</span> },
    { header: "Total Tax", align: "right", cell: (r) => <span className="font-mono font-bold">{formatINR(r.totalTax)}</span> },
    {
      header: "Share",
      align: "right",
      cell: (r) => (
        <span className="text-on-surface-variant">
          {totalTaxable > 0 ? ((r.taxableAmount / totalTaxable) * 100).toFixed(1) : "0.0"}%
        </span>
      ),
    },
  ];

  if (isLoading) return <p className="text-body-md text-on-surface-variant">Loading tax slab breakdown…</p>;

  return (
    <div>
      {/* Simple proportional bar in place of a real pie chart — keeps the
          "visual breakdown" intent from the mockup without pulling in a
          charting library for one screen. */}
      {rows.length > 0 && (
        <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm mb-6">
          <p className="text-label-md text-on-surface-variant uppercase tracking-wider mb-3">Taxable Amount by Slab</p>
          <div className="flex h-4 rounded-full overflow-hidden">
            {rows.map((r) => (
              <div
                key={r.taxRate}
                className={slabColor[r.taxRate] ?? "bg-slate-400"}
                style={{ width: `${totalTaxable > 0 ? (r.taxableAmount / totalTaxable) * 100 : 0}%` }}
                title={`${r.taxRate}% — ${formatINR(r.taxableAmount)}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            {rows.map((r) => (
              <span key={r.taxRate} className="flex items-center gap-1.5 text-label-md text-on-surface-variant">
                <span className={`w-2.5 h-2.5 rounded-full ${slabColor[r.taxRate] ?? "bg-slate-400"}`} />
                {r.taxRate}% GST
              </span>
            ))}
          </div>
        </div>
      )}

      <Table
        columns={columns}
        rows={rows}
        keyOf={(r) => String(r.taxRate)}
        emptyMessage="No taxed transactions in this period."
      />
    </div>
  );
}