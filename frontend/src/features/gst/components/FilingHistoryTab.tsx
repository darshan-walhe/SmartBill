import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { gstApi } from "../../../api/gst";
import { Icon } from "../../../components/Icon";

function formatINR(n: number): string {
  return `₹ ${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function currentFY(): string {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1; // April = month index 3
  return `${year}-${String(year + 1).slice(2)}`;
}

function fyOptions(): string[] {
  const [startYear] = currentFY().split("-").map(Number);
  return [0, 1, 2].map((offset) => {
    const y = startYear - offset;
    return `${y}-${String(y + 1).slice(2)}`;
  });
}

export function FilingHistoryTab() {
  const [fy, setFy] = useState(currentFY());

  const { data, isLoading } = useQuery({
    queryKey: ["gst", "filing-status", fy],
    queryFn: () => gstApi.getFilingStatus(fy),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-headline-md text-on-surface">Activity by Month — FY {fy}</h3>
        <select
          value={fy}
          onChange={(e) => setFy(e.target.value)}
          className="border border-outline-variant rounded-lg text-body-md px-3 py-1.5 focus:ring-1 focus:ring-primary"
        >
          {fyOptions().map((opt) => <option key={opt} value={opt}>FY {opt}</option>)}
        </select>
      </div>

      {/* Note: this reflects whether sales/purchase activity happened that
          month (hasSales/hasPurchases), not an actual GSTR filing submitted
          to the government — nothing in this system files returns. The
          mockup's "Filed on 18th" badges implied real filing status that
          doesn't exist on the backend, so I replaced them with an honest
          activity indicator instead. */}
      {isLoading ? (
        <p className="text-body-md text-on-surface-variant">Loading filing history…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(data ?? []).map((m) => (
            <div key={m.month} className="bg-white border border-outline-variant rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-on-surface">{m.month}</h4>
                {m.hasSales || m.hasPurchases ? (
                  <Icon name="check_circle" filled className="text-emerald-500" size={20} />
                ) : (
                  <Icon name="schedule" className="text-outline" size={20} />
                )}
              </div>
              <div className="flex gap-1.5 mb-3">
                <span className={`w-2 h-2 rounded-full ${m.hasSales ? "bg-primary" : "bg-outline-variant"}`} title="Sales activity" />
                <span className={`w-2 h-2 rounded-full ${m.hasPurchases ? "bg-secondary" : "bg-outline-variant"}`} title="Purchase activity" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-on-surface-variant">
                  <span>Total Sales</span>
                  <span className="font-bold">{formatINR(m.totalSales)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-on-surface-variant">
                  <span>Total Purchases</span>
                  <span className="font-bold">{formatINR(m.totalPurchases)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-on-surface-variant">
                  <span>Net Tax</span>
                  <span className="text-primary font-bold">{formatINR(m.netTaxPayable)}</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-50 text-center">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${m.hasSales || m.hasPurchases ? "text-emerald-600" : "text-outline"}`}>
                  {m.hasSales || m.hasPurchases ? "Has Activity" : "No Activity"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}