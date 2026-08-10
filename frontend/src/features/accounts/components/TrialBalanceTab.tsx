import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { accountsApi } from "../../../api/accounts";
import { Icon } from "../../../components/Icon";

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const typePill: Record<string, string> = {
  CAPITAL: "bg-blue-100 text-blue-700",
  DRAWING: "bg-blue-100 text-blue-700",
  CASH: "bg-emerald-100 text-emerald-700",
  BANK: "bg-emerald-100 text-emerald-700",
  ACCOUNTS_RECEIVABLE: "bg-emerald-100 text-emerald-700",
  STOCK: "bg-emerald-100 text-emerald-700",
  ACCOUNTS_PAYABLE: "bg-rose-100 text-rose-700",
  CGST_PAYABLE: "bg-rose-100 text-rose-700",
  SGST_PAYABLE: "bg-rose-100 text-rose-700",
  IGST_PAYABLE: "bg-rose-100 text-rose-700",
  SALES_REVENUE: "bg-amber-100 text-amber-700",
  INCOME: "bg-amber-100 text-amber-700",
  PURCHASE: "bg-purple-100 text-purple-700",
  EXPENSE: "bg-purple-100 text-purple-700",
  DISCOUNT_GIVEN: "bg-purple-100 text-purple-700",
  DISCOUNT_RECEIVED: "bg-purple-100 text-purple-700",
  INPUT_CGST: "bg-slate-100 text-slate-600",
  INPUT_SGST: "bg-slate-100 text-slate-600",
  INPUT_IGST: "bg-slate-100 text-slate-600",
};

export function TrialBalanceTab() {
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [applied, setApplied] = useState(asOf);

  const { data, isLoading } = useQuery({
    queryKey: ["accounts", "trial-balance", applied],
    queryFn: () => accountsApi.getTrialBalance(applied),
  });

  return (
    <div>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-headline-md font-bold text-on-surface">Trial Balance</h2>
          <p className="text-body-md text-on-surface-variant">
            Unadjusted ledger balances as of{" "}
            <span className="font-bold">{new Date(applied).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="border-outline-variant rounded-lg" />
          <button onClick={() => setApplied(asOf)} className="bg-primary text-white px-6 py-2 rounded-xl font-bold hover:shadow-lg transition-all">
            Generate Report
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-body-md text-on-surface-variant">Loading trial balance…</p>
      ) : data ? (
        <>
          <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden mb-4">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-label-md text-on-surface-variant uppercase font-bold border-b border-outline-variant">
                <tr>
                  <th className="px-8 py-5">Account Name</th>
                  <th className="px-8 py-5">Account Type</th>
                  <th className="px-8 py-5 text-right">Debit (₹)</th>
                  <th className="px-8 py-5 text-right">Credit (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 font-mono">
                {data.lines.length === 0 ? (
                  <tr><td colSpan={4} className="px-8 py-8 text-center text-on-surface-variant font-sans">No ledger activity as of this date.</td></tr>
                ) : (
                  data.lines.map((line, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-8 py-4 font-bold text-primary font-sans">{line.accountName}</td>
                      <td className="px-8 py-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${typePill[line.accountType] ?? "bg-slate-100 text-slate-600"}`}>
                          {line.accountType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">{line.debitTotal > 0 ? formatINR(line.debitTotal) : "—"}</td>
                      <td className="px-8 py-4 text-right">{line.creditTotal > 0 ? formatINR(line.creditTotal) : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-surface-container-low font-bold">
                  <td className="px-8 py-4 font-sans" colSpan={2}>Total</td>
                  <td className="px-8 py-4 text-right font-mono">{formatINR(data.totalDebit)}</td>
                  <td className="px-8 py-4 text-right font-mono">{formatINR(data.totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className={`flex items-center gap-2 p-4 rounded-lg ${data.isBalanced ? "bg-secondary/10 text-secondary" : "bg-error/10 text-error"}`}>
            <Icon name={data.isBalanced ? "check_circle" : "error"} size={20} />
            <span className="font-bold text-body-md">
              {data.isBalanced ? "Books are balanced — total debits equal total credits." : "Books are NOT balanced — this needs investigation."}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}