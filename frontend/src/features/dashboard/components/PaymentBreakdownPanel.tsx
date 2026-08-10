import { useQuery } from "@tanstack/react-query";
import { paymentsApi, type PaymentMethodStat } from "../../../api/payments";
import { Icon } from "../../../components/Icon";

const methodColor: Record<string, string> = {
  CASH: "#10b981",   // emerald
  UPI: "#3525cd",    // primary
  CARD: "#3b82f6",   // blue
  BANK_TRANSFER: "#94a3b8", // slate
  CHEQUE: "#ef4444", // red
  INTERNATIONAL: "#f59e0b", // amber
};

const methodLabel: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  INTERNATIONAL: "International",
};

function buildDonutSegments(stats: PaymentMethodStat[]) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return stats.map((s) => {
    const length = (s.percentage / 100) * circumference;
    const segment = { ...s, dasharray: `${length} ${circumference - length}`, dashoffset: -offset };
    offset += length;
    return segment;
  });
}

export function PaymentBreakdownPanel() {
  const { data, isLoading } = useQuery({ queryKey: ["payments", "breakdown"], queryFn: () => paymentsApi.getBreakdown() });

  const stats = data ?? [];
  const total = stats.reduce((sum, s) => sum + s.percentage, 0);
  const segments = buildDonutSegments(stats);

  return (
    <div className="bg-white rounded-xl border border-outline-variant shadow-sm p-6">
      <h4 className="text-headline-md text-on-surface mb-6">Payment Method Breakdown</h4>
      {isLoading ? (
        <p className="text-body-md text-on-surface-variant">Loading…</p>
      ) : stats.length === 0 ? (
        <div className="text-center py-8">
          <Icon name="donut_small" size={32} className="text-outline mx-auto mb-2" />
          <p className="text-body-md text-on-surface-variant">No payments collected this month yet.</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <div className="relative w-40 h-40 shrink-0">
            <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
              <circle cx="70" cy="70" r="60" fill="none" stroke="#f1f5f9" strokeWidth="16" />
              {segments.map((s) => (
                <circle
                  key={s.method}
                  cx="70" cy="70" r="60" fill="none"
                  stroke={methodColor[s.method] ?? "#94a3b8"}
                  strokeWidth="16"
                  strokeDasharray={s.dasharray}
                  strokeDashoffset={s.dashoffset}
                  strokeLinecap="butt"
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-headline-md font-bold text-on-surface">{Math.round(total)}%</span>
              <span className="text-[11px] text-on-surface-variant">Collections</span>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-2 w-full">
            {stats.map((s) => (
              <div key={s.method} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: methodColor[s.method] ?? "#94a3b8" }} />
                <span className="text-body-md text-on-surface flex-1">{methodLabel[s.method] ?? s.method}</span>
                <span className="text-body-md font-bold">{s.percentage.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}