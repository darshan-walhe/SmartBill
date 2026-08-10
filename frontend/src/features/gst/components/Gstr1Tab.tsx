import { useQuery } from "@tanstack/react-query";
import { gstApi } from "../../../api/gst";
import { Icon } from "../../../components/Icon";
import { Badge } from "../../../components/ui/Badge";

function formatINR(n: number): string {
  return `₹ ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function Gstr1Tab({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["gst", "gstr1", from, to],
    queryFn: () => gstApi.getGstr1(from, to),
  });

  if (isLoading) return <p className="text-body-md text-on-surface-variant">Loading GSTR-1…</p>;
  if (!data) return null;

  // Transaction counts computed from the real invoice list — the mockup
  // showed hardcoded counts (124/842/8) with no backing field in
  // Gstr1Report itself, but the underlying `invoices` array does have
  // invoiceType, so these counts are real, just derived client-side.
  const b2bCount = data.invoices.filter((i) => i.invoiceType === "B2B").length;
  const b2cCount = data.invoices.filter((i) => i.invoiceType === "B2C").length;
  const exportCount = data.invoices.filter((i) => i.invoiceType === "EXPORT").length;

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <SummaryCard label="Total Taxable" value={formatINR(data.totalTaxableTurnover)} />
        <SummaryCard label="CGST" value={formatINR(data.totalCgst)} />
        <SummaryCard label="SGST" value={formatINR(data.totalSgst)} />
        <SummaryCard label="IGST" value={formatINR(data.totalIgst)} />
        <SummaryCard label="Total GST" value={formatINR(data.totalGstCollected)} highlight />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <BreakdownCard icon="business" label="B2B Invoices" value={formatINR(data.b2bTaxableAmount)} count={b2bCount} tone="secondary" />
        <BreakdownCard icon="person" label="B2C Invoices" value={formatINR(data.b2cTaxableAmount)} count={b2cCount} tone="tertiary" />
        <BreakdownCard icon="flight_takeoff" label="Exports" value={formatINR(data.exportTaxableAmount)} count={exportCount} tone="primary" />
      </div>

      <section className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm mb-6">
        <div className="p-5 border-b border-outline-variant">
          <h3 className="text-headline-md text-on-surface">HSN Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr className="text-label-md text-on-surface-variant uppercase tracking-wider">
                <th className="px-5 py-3 border-b border-outline-variant">HSN Code</th>
                <th className="px-5 py-3 border-b border-outline-variant">Description</th>
                <th className="px-5 py-3 border-b border-outline-variant text-right">Taxable Value</th>
                <th className="px-5 py-3 border-b border-outline-variant text-right">CGST</th>
                <th className="px-5 py-3 border-b border-outline-variant text-right">SGST</th>
                <th className="px-5 py-3 border-b border-outline-variant text-right">IGST</th>
                <th className="px-5 py-3 border-b border-outline-variant text-right">Total Tax</th>
              </tr>
            </thead>
            <tbody className="text-body-md">
              {data.hsnSummary.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-on-surface-variant">No HSN activity in this period.</td></tr>
              ) : (
                data.hsnSummary.map((row) => (
                  <tr key={row.hsnCode} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-5 py-3 border-b border-outline-variant font-mono">{row.hsnCode}</td>
                    <td className="px-5 py-3 border-b border-outline-variant">{row.productDescription}</td>
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
      </section>

      <section className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-outline-variant">
          <h3 className="text-headline-md text-on-surface">Invoice Detail</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr className="text-label-md text-on-surface-variant uppercase tracking-wider">
                <th className="px-5 py-3 border-b border-outline-variant">Date</th>
                <th className="px-5 py-3 border-b border-outline-variant">Invoice No.</th>
                <th className="px-5 py-3 border-b border-outline-variant">Customer</th>
                <th className="px-5 py-3 border-b border-outline-variant">GSTIN</th>
                <th className="px-5 py-3 border-b border-outline-variant text-right">Taxable</th>
                <th className="px-5 py-3 border-b border-outline-variant text-right">Total Tax</th>
                <th className="px-5 py-3 border-b border-outline-variant">Type</th>
              </tr>
            </thead>
            <tbody className="text-body-md">
              {data.invoices.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-on-surface-variant">No invoices in this period.</td></tr>
              ) : (
                data.invoices.map((inv) => (
                  <tr key={inv.invoiceNumber} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-5 py-3 border-b border-outline-variant font-mono">{new Date(inv.invoiceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td className="px-5 py-3 border-b border-outline-variant font-bold">{inv.invoiceNumber}</td>
                    <td className="px-5 py-3 border-b border-outline-variant">{inv.customerName}</td>
                    <td className="px-5 py-3 border-b border-outline-variant font-mono uppercase">{inv.customerGstin || "—"}</td>
                    <td className="px-5 py-3 border-b border-outline-variant text-right font-mono">{formatINR(inv.taxableAmount)}</td>
                    <td className="px-5 py-3 border-b border-outline-variant text-right font-mono">{formatINR(inv.cgst + inv.sgst + inv.igst)}</td>
                    <td className="px-5 py-3 border-b border-outline-variant">
                      <Badge tone={inv.invoiceType === "B2B" ? "success" : inv.invoiceType === "EXPORT" ? "primary" : "warning"}>{inv.invoiceType}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`border rounded-xl p-5 shadow-sm ${highlight ? "bg-primary-container border-primary-container" : "bg-white border-outline-variant"}`}>
      <p className={`text-label-md mb-1 ${highlight ? "text-on-primary-container" : "text-on-surface-variant"}`}>{label}</p>
      <p className={`text-headline-md font-bold tabular-nums ${highlight ? "text-on-primary-container" : "text-on-surface"}`}>{value}</p>
    </div>
  );
}

function BreakdownCard({ icon, label, value, count, tone }: { icon: string; label: string; value: string; count: number; tone: "secondary" | "tertiary" | "primary" }) {
  const toneClasses = {
    secondary: "bg-secondary-container text-on-secondary-container",
    tertiary: "bg-tertiary-container/20 text-tertiary",
    primary: "bg-primary/10 text-primary",
  };
  const textTone = { secondary: "text-secondary", tertiary: "text-tertiary", primary: "text-primary" };
  return (
    <div className="bg-white border border-outline-variant rounded-xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${toneClasses[tone]}`}>
        <Icon name={icon} />
      </div>
      <div>
        <p className="text-label-md text-on-surface-variant">{label}</p>
        <p className="text-headline-md font-bold tabular-nums">{value}</p>
        <p className={`text-[12px] font-bold ${textTone[tone]}`}>{count} Transaction{count === 1 ? "" : "s"}</p>
      </div>
    </div>
  );
}