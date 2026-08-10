import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { accountsApi } from "../../../api/accounts";
import { Icon } from "../../../components/Icon";

function formatINR(n: number): string {
  return `₹ ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function currentFYStartISO(): string {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-04-01`;
}

export function ProfitLossTab() {
  const [from, setFrom] = useState(currentFYStartISO());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [applied, setApplied] = useState({ from, to });

  const { data, isLoading } = useQuery({
    queryKey: ["accounts", "profit-loss", applied.from, applied.to],
    queryFn: () => accountsApi.getProfitLoss(applied.from, applied.to),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-headline-md font-bold text-on-surface">Profit &amp; Loss Account</h2>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border-outline-variant rounded-lg text-body-md" />
          <span className="text-on-surface-variant">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border-outline-variant rounded-lg text-body-md" />
          <button onClick={() => setApplied({ from, to })} className="bg-primary text-white px-4 py-2 rounded-lg font-bold text-label-md hover:shadow-md transition-all">
            Apply
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-body-md text-on-surface-variant">Loading P&amp;L…</p>
      ) : data ? (
        <>
          {/* Only the 3 real income lines and 2 real expense lines from
              ProfitLossReport — the mockup broke these into more granular
              categories ("Commission Received", "Administrative Salaries",
              "Rent & Utilities", "COGS") that don't exist as separate
              fields on the backend; it only tracks aggregate sales/other-
              income and aggregate purchases/expenses. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              <div className="bg-secondary/10 px-6 py-4 border-b border-outline-variant flex justify-between items-center">
                <span className="font-bold text-secondary">A. INCOME</span>
                <span className="font-mono font-bold">{formatINR(data.grossIncome)}</span>
              </div>
              <div className="p-6 space-y-4">
                <Row label="Sales Revenue" value={formatINR(data.totalSales)} />
                <Row label="Other Income" value={formatINR(data.totalOtherIncome)} />
                <div className="pt-4 flex justify-between items-center font-bold">
                  <span>GROSS INCOME</span>
                  <span className="font-mono text-lg">{formatINR(data.grossIncome)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm">
              <div className="bg-error/10 px-6 py-4 border-b border-outline-variant flex justify-between items-center">
                <span className="font-bold text-error">B. EXPENSES</span>
                <span className="font-mono font-bold">{formatINR(data.grossExpenses)}</span>
              </div>
              <div className="p-6 space-y-4">
                <Row label="Purchases" value={formatINR(data.totalPurchases)} />
                <Row label="Other Expenses" value={formatINR(data.totalExpenses)} />
                <div className="pt-4 flex justify-between items-center font-bold text-error">
                  <span>GROSS EXPENSES</span>
                  <span className="font-mono text-lg">{formatINR(data.grossExpenses)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={`mt-8 p-8 rounded-2xl shadow-xl flex items-center justify-between text-white ${data.isProfit ? "bg-secondary" : "bg-error"}`}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Icon name={data.isProfit ? "trending_up" : "trending_down"} filled size={36} />
              </div>
              <div>
                <p className="text-sm font-bold opacity-80 uppercase tracking-widest">
                  Net {data.isProfit ? "Profit" : "Loss"} for Period
                </p>
                <h2 className="text-4xl font-black font-mono">{formatINR(Math.abs(data.netProfit))}</h2>
              </div>
            </div>
            <span className="bg-white/20 px-4 py-1.5 rounded-full text-label-md font-bold uppercase tracking-wider">
              Status: {data.isProfit ? "Healthy" : "Loss-making"}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-outline-variant/30 pb-2">
      <span className="text-on-surface">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}