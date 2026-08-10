import { useQuery } from "@tanstack/react-query";
import { gstApi } from "../../../api/gst";
import { Icon } from "../../../components/Icon";

function formatINR(n: number): string {
  return `₹ ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function Gstr3bTab({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["gst", "gstr3b", from, to],
    queryFn: () => gstApi.getGstr3b(from, to),
  });

  if (isLoading) return <p className="text-body-md text-on-surface-variant">Loading GSTR-3B…</p>;
  if (!data) return null;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Outward Supplies — the mockup showed "Zero Rated" and "Nil Rated/
            Exempt" lines with no backing field in Gstr3bReport; only the
            CGST/SGST/IGST breakdown of outwardTotalTax is real. */}
        <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-headline-md flex items-center gap-2">
              <Icon name="logout" className="text-primary" /> Outward Supplies
            </h3>
            <span className="text-label-md font-bold text-on-surface-variant">Section 3.1</span>
          </div>
          <div className="space-y-3">
            <Row label="Taxable Outward Supplies" value={formatINR(data.outwardTaxableAmount)} />
            <Row label="CGST" value={formatINR(data.outwardCgst)} />
            <Row label="SGST" value={formatINR(data.outwardSgst)} />
            <Row label="IGST" value={formatINR(data.outwardIgst)} />
            <div className="pt-3 mt-3 bg-surface-container-low p-3 rounded-lg">
              <div className="flex justify-between font-bold text-on-surface">
                <span>Total Tax Liability</span>
                <span className="font-mono text-primary">{formatINR(data.outwardTotalTax)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Input Tax Credit — same story: mockup's "Import of Goods/Services"
            and "All Other ITC" split doesn't exist in Gstr3bReport, only the
            CGST/SGST/IGST breakdown of totalInputTax. */}
        <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-headline-md flex items-center gap-2">
              <Icon name="login" className="text-secondary" /> Input Tax Credit (ITC)
            </h3>
            <span className="text-label-md font-bold text-on-surface-variant">Section 4</span>
          </div>
          <div className="space-y-3">
            <Row label="Input CGST" value={formatINR(data.inputCgst)} />
            <Row label="Input SGST" value={formatINR(data.inputSgst)} />
            <Row label="Input IGST" value={formatINR(data.inputIgst)} />
            <div className="pt-3 mt-3 bg-secondary-container/20 p-3 rounded-lg">
              <div className="flex justify-between font-bold text-on-surface">
                <span>Total Available ITC</span>
                <span className="font-mono text-secondary">{formatINR(data.totalInputTax)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-primary-container border border-primary text-on-primary-container rounded-xl p-8 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h4 className="text-headline-md mb-1">Net Cash Liability</h4>
          <p className="text-body-md opacity-80">Final amount after ITC adjustment for the selected period.</p>
          <div className="mt-3 flex gap-6 text-label-md opacity-90">
            <span>Net CGST: {formatINR(data.netCgstPayable)}</span>
            <span>Net SGST: {formatINR(data.netSgstPayable)}</span>
            <span>Net IGST: {formatINR(data.netIgstPayable)}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-3 justify-end">
            <span className={`px-4 py-1.5 rounded-full font-bold text-label-md ${data.isRefundable ? "bg-secondary-container text-on-secondary-container" : "bg-amber-100 text-amber-700"}`}>
              {data.isRefundable ? "Refundable" : "Payable"}
            </span>
            <span className="text-headline-lg font-bold">{formatINR(Math.abs(data.netTaxPayable))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-100">
      <span className="text-body-md text-on-surface-variant">{label}</span>
      <span className="font-mono text-on-surface">{value}</span>
    </div>
  );
}