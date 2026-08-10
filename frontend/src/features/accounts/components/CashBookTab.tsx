import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { accountsApi } from "../../../api/accounts";

function formatINR(n: number): string {
  return `₹ ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function startOfMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export function CashBookTab() {
  const [from, setFrom] = useState(startOfMonthISO());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [applied, setApplied] = useState({ from, to });

  const { data, isLoading } = useQuery({
    queryKey: ["accounts", "cash-book", applied.from, applied.to],
    queryFn: () => accountsApi.getCashBook(applied.from, applied.to),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-outline-variant shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <label className="text-label-md text-on-surface-variant uppercase font-bold">Date Range</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border-outline-variant rounded-lg text-body-md" />
              <span className="text-on-surface-variant">to</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border-outline-variant rounded-lg text-body-md" />
            </div>
          </div>
          <button
            onClick={() => setApplied({ from, to })}
            className="bg-surface-container-high px-4 py-2 rounded-lg font-bold text-primary hover:bg-primary/10 transition-colors mt-5"
          >
            Apply
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-body-md text-on-surface-variant">Loading cash book…</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm">
              <p className="text-label-md text-on-surface-variant uppercase font-bold">Opening Balance</p>
              <h3 className="text-headline-md font-mono font-bold text-on-surface mt-2">{formatINR(data.openingBalance)}</h3>
            </div>
            <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm">
              <p className="text-label-md text-on-surface-variant uppercase font-bold">Total Debit</p>
              <h3 className="text-headline-md font-mono font-bold text-secondary mt-2">{formatINR(data.totalDebit)}</h3>
            </div>
            <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm">
              <p className="text-label-md text-on-surface-variant uppercase font-bold">Total Credit</p>
              <h3 className="text-headline-md font-mono font-bold text-error mt-2">{formatINR(data.totalCredit)}</h3>
            </div>
            <div className="bg-primary p-6 rounded-xl border border-primary shadow-lg">
              <p className="text-label-md text-on-primary uppercase font-bold opacity-80">Closing Balance</p>
              <h3 className="text-headline-md font-mono font-bold text-white mt-2">{formatINR(data.closingBalance)}</h3>
            </div>
          </div>

          <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-surface-container text-label-md text-on-surface-variant uppercase font-bold border-b border-outline-variant">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Particulars</th>
                  <th className="px-6 py-4">Voucher</th>
                  <th className="px-6 py-4 text-right">Debit (₹)</th>
                  <th className="px-6 py-4 text-right">Credit (₹)</th>
                  <th className="px-6 py-4 text-right bg-primary-container/5">Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 font-mono">
                <tr>
                  <td className="px-6 py-4">{new Date(data.from).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                  <td className="px-6 py-4 text-on-surface">Opening Balance b/f</td>
                  <td className="px-6 py-4">--</td>
                  <td className="px-6 py-4 text-right">--</td>
                  <td className="px-6 py-4 text-right">--</td>
                  <td className="px-6 py-4 text-right font-bold bg-primary-container/5">{data.openingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
                {data.entries.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant font-sans">No cash/bank movement in this period.</td></tr>
                ) : (
                  data.entries.map((e, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4">{new Date(e.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}</td>
                      <td className="px-6 py-4 text-on-surface font-sans">{e.particulars}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{e.voucherNumber || e.voucherType || "--"}</td>
                      <td className="px-6 py-4 text-right text-secondary font-bold">{e.debit > 0 ? e.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}</td>
                      <td className="px-6 py-4 text-right text-error font-bold">{e.credit > 0 ? e.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}</td>
                      <td className="px-6 py-4 text-right bg-primary-container/5">{e.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}