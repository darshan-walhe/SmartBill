import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { invoicesApi } from "../../../api/invoices";
import { Icon } from "../../../components/Icon";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase();
}

function daysOverdue(dueDate?: string): number {
  if (!dueDate) return 0;
  const diff = Date.now() - new Date(dueDate).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function OverdueInvoicesPanel() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["invoices", "overdue"], queryFn: invoicesApi.overdue });

  const rows = (data ?? []).slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center">
        <h4 className="flex items-center gap-2 text-headline-md text-on-surface">
          <Icon name="notifications_active" className="text-error" />
          Overdue Invoices
        </h4>
        <Link to="/invoices" className="text-primary font-bold text-label-md hover:underline">View all</Link>
      </div>
      {isLoading ? (
        <p className="px-6 py-8 text-body-md text-on-surface-variant">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="px-6 py-8 text-body-md text-on-surface-variant">Nothing overdue — nice work.</p>
      ) : (
        <table className="w-full text-left">
          <thead className="bg-surface-container-low text-label-md text-on-surface-variant uppercase">
            <tr>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3 text-right">Amount</th>
              <th className="px-6 py-3 text-right">Delay</th>
              <th className="px-6 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {rows.map((inv) => (
              <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)} className="hover:bg-surface-container-low transition-colors cursor-pointer">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-container/20 text-primary flex items-center justify-center text-[10px] font-bold">
                      {initialsOf(inv.customerName)}
                    </div>
                    <span className="text-body-md font-medium">{inv.customerName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold">{formatINR(inv.balanceDue)}</td>
                <td className="px-6 py-4 text-right">
                  <span className="text-error font-bold text-body-md">{daysOverdue(inv.dueDate)} Days</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Icon name="chevron_right" className="text-on-surface-variant" size={18} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}