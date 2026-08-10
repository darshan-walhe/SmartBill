import { useQuery } from "@tanstack/react-query";
import { gstApi } from "../../../api/gst";

function formatINR(n: number): string {
  return `₹ ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function HsnSummaryTab({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["gst", "hsn-summary", from, to],
    queryFn: () => gstApi.getHsnSummary(from, to),
  });

  if (isLoading) return <p className="text-body-md text-on-surface-variant">Loading HSN summary…</p>;

  const rows = data ?? [];
  const totals = rows.reduce(
    (acc, r) => ({
      taxableValue: acc.taxableValue + r.taxableValue,
      totalTax: acc.totalTax + r.totalTax,
    }),
    { taxableValue: 0, totalTax: 0 }
  );

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm">
          <p className="text-label-md text-on-surface-variant mb-1">HSN Codes</p>
          <p className="text-headline-md font-bold tabular-nums">{rows.length}</p>
        </div>
        <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-sm">
          <p className="text-label-md text-on-surface-variant mb-1">Total Taxable Value</p>
          <p className="text-headline-md font-bold tabular-nums">{formatINR(totals.taxableValue)}</p>
        </div>
        <div className="bg-primary-container border border-primary-container rounded-xl p-5 shadow-sm">
          <p className="text-label-md text-on-primary-container mb-1">Total Tax</p>
          <p className="text-headline-md font-bold tabular-nums text-on-primary-container">{formatINR(totals.totalTax)}</p>
        </div>
      </div>

      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr className="text-label-md text-on-surface-variant uppercase tracking-wider">
                <th className="px-5 py-3 border-b border-outline-variant">HSN Code</th>
                <th className="px-5 py-3 border-b border-outline-variant">Description</th>
                <th className="px-5 py-3 border-b border-outline-variant text-right">Qty</th>
                <th className="px-5 py-3 border-b border-outline-variant text-right">Tax Rate</th>
                <th className="px-5 py-3 border-b border-outline-variant text-right">Taxable Value</th>
                <th className="px-5 py-3 border-b border-outline-variant text-right">CGST</th>
                <th className="px-5 py-3 border-b border-outline-variant text-right">SGST</th>
                <th className="px-5 py-3 border-b border-outline-variant text-right">IGST</th>
                <th className="px-5 py-3 border-b border-outline-variant text-right">Total Tax</th>
              </tr>
            </thead>
            <tbody className="text-body-md">
              {rows.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-on-surface-variant">No HSN activity in this period.</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.hsnCode} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-5 py-3 border-b border-outline-variant font-mono">{row.hsnCode}</td>
                    <td className="px-5 py-3 border-b border-outline-variant">{row.productDescription}</td>
                    <td className="px-5 py-3 border-b border-outline-variant text-right font-mono">{row.totalQuantity} {row.uqc || ""}</td>
                    <td className="px-5 py-3 border-b border-outline-variant text-right font-mono">{row.taxRate}%</td>
                    <td className="px-5 py-3 border-b border-outline-variant text-right font-mono">{formatINR(row.taxableValue)}</td>
                    <td className="px-5 py-3 border-b border-outline-variant text-right font-mono">{formatINR(row.cgst)}</td>
                    <td className="px-5 py-3 border-b border-outline-variant text-right font-mono">{formatINR(row.sgst)}</td>
                    <td className="px-5 py-3 border-b border-outline-variant text-right font-mono">{formatINR(row.igst)}</td>
                    <td className="px-5 py-3 border-b border-outline-variant text-right font-mono font-bold">{formatINR(row.totalTax)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}