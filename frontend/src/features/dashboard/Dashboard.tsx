import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "../../components/Icon";
import { Badge } from "../../components/ui/Badge";
import { useAuth } from "../../context/AuthContext";
import { invoicesApi, type PaymentStatus } from "../../api/invoices";
import { purchasesApi } from "../../api/purchases";
import { accountsApi } from "../../api/accounts";
import { gstApi } from "../../api/gst";
import { OverdueInvoicesPanel } from "./components/OverdueInvoicesPanel";
import { LowStockPanel } from "./components/LowStockPanel";
import { PaymentBreakdownPanel } from "./components/PaymentBreakdownPanel";

function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase();
}

const statusTone: Record<PaymentStatus, "success" | "warning" | "danger" | "neutral"> = {
  DRAFT: "neutral",
  UNPAID: "warning",
  PARTIAL: "warning",
  PAID: "success",
  CANCELLED: "danger",
};

function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

export function Dashboard() {
  const { session } = useAuth();
  const navigate = useNavigate();
  // profit-loss and gstr1 are ADMIN/ACCOUNTANT only (GstController,
  // AccountsController @PreAuthorize) — invoices/stats and purchases/stats
  // have no role restriction at all. Rather than hardcode 2 of 3 headline
  // cards to endpoints half the roles can't call, fetch role-appropriate
  // ones and swap the card content, so every role sees 3 real numbers
  // instead of 2 real + something broken.
  const canSeeFinancials = session?.role === "ADMIN" || session?.role === "ACCOUNTANT";
  const { from, to } = currentMonthRange();

  const { data: salesStats } = useQuery({ queryKey: ["invoices", "stats"], queryFn: invoicesApi.stats });
  const { data: purchaseStats } = useQuery({ queryKey: ["purchases", "stats"], queryFn: purchasesApi.stats });
  const { data: profitLoss } = useQuery({
    queryKey: ["accounts", "profit-loss", "dashboard"],
    queryFn: () => accountsApi.getProfitLoss(),
    enabled: canSeeFinancials,
  });
  const { data: gstr1 } = useQuery({
    queryKey: ["gst", "gstr1", "dashboard", from, to],
    queryFn: () => gstApi.getGstr1(from, to),
    enabled: canSeeFinancials,
  });
  const { data: recentInvoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["invoices", "list", "recent"],
    queryFn: () => invoicesApi.list({ page: 0, size: 5 }),
  });

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {canSeeFinancials ? (
          <>
            <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
              <div className="p-2 rounded-lg bg-primary/10 text-primary w-fit mb-4">
                <Icon name="payments" filled />
              </div>
              <p className="text-label-md text-on-surface-variant mb-1">Total Net Profit</p>
              <h3 className="text-headline-lg text-primary font-tabular">{formatINR(profitLoss?.netProfit ?? 0)}</h3>
              <p className="text-label-md text-on-surface-variant mt-2">This financial year</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
              <div className="p-2 rounded-lg bg-tertiary/10 text-tertiary w-fit mb-4">
                <Icon name="account_balance_wallet" filled />
              </div>
              <p className="text-label-md text-on-surface-variant mb-1">GST Collected (Output)</p>
              <h3 className="text-headline-lg text-tertiary font-tabular">{formatINR(gstr1?.totalGstCollected ?? 0)}</h3>
              <p className="text-label-md text-on-surface-variant mt-2">Month to date</p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
              <div className="p-2 rounded-lg bg-primary/10 text-primary w-fit mb-4">
                <Icon name="payments" filled />
              </div>
              <p className="text-label-md text-on-surface-variant mb-1">Sales This Month</p>
              <h3 className="text-headline-lg text-primary font-tabular">{formatINR(salesStats?.monthSales ?? 0)}</h3>
              <p className="text-label-md text-on-surface-variant mt-2">{salesStats?.totalInvoices ?? 0} total invoices</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
              <div className="p-2 rounded-lg bg-tertiary/10 text-tertiary w-fit mb-4">
                <Icon name="local_shipping" filled />
              </div>
              <p className="text-label-md text-on-surface-variant mb-1">Total Payable</p>
              <h3 className="text-headline-lg text-tertiary font-tabular">{formatINR(purchaseStats?.totalPayable ?? 0)}</h3>
              <p className="text-label-md text-on-surface-variant mt-2">{purchaseStats?.unpaidCount ?? 0} unpaid purchases</p>
            </div>
          </>
        )}
        <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2 rounded-lg bg-error/10 text-error w-fit mb-4">
            <Icon name="pending_actions" filled />
          </div>
          <p className="text-label-md text-on-surface-variant mb-1">Accounts Receivables</p>
          <h3 className="text-headline-lg text-error font-tabular">{formatINR(salesStats?.totalOutstanding ?? 0)}</h3>
          <p className="text-label-md text-on-surface-variant mt-2">{salesStats?.unpaidCount ?? 0} unpaid invoices</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Real Today/Month/Year figures in place of the mockup's Jan-Jun bar
            chart — SalesStats has no per-month breakdown array, so a 6-bar
            chart would have to invent 5 of its 6 values, and there's no
            second dataset to back a real "Quarterly" toggle either. */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-outline-variant">
          <h4 className="text-headline-md text-on-surface mb-6">Sales Overview</h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-6 bg-surface-container-low rounded-xl">
              <p className="text-label-md text-on-surface-variant uppercase mb-2">Today</p>
              <p className="text-headline-md font-bold text-on-surface font-tabular">{formatINR(salesStats?.todaySales ?? 0)}</p>
            </div>
            <div className="text-center p-6 bg-primary-container/10 rounded-xl border border-primary/10">
              <p className="text-label-md text-primary uppercase mb-2">This Month</p>
              <p className="text-headline-md font-bold text-primary font-tabular">{formatINR(salesStats?.monthSales ?? 0)}</p>
            </div>
            <div className="text-center p-6 bg-surface-container-low rounded-xl">
              <p className="text-label-md text-on-surface-variant uppercase mb-2">This Year</p>
              <p className="text-headline-md font-bold text-on-surface font-tabular">{formatINR(salesStats?.yearSales ?? 0)}</p>
            </div>
          </div>
          {(salesStats?.overdueCount ?? 0) > 0 && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-error/5 border border-error/10 rounded-lg">
              <Icon name="warning" className="text-error" size={20} />
              <span className="text-body-md text-error font-medium">
                {salesStats?.overdueCount} invoice{salesStats?.overdueCount === 1 ? " is" : "s are"} overdue —{" "}
                <Link to="/invoices" className="underline font-bold">review now</Link>
              </span>
            </div>
          )}
        </div>

        {/* Quick Actions — dropped "Upload Expenses" and "GST Portal Sync"
            from the mockup, neither has any backing endpoint anywhere in
            the backend. Replaced with real, working shortcuts instead. */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-outline-variant flex flex-col">
          <h4 className="text-headline-md text-on-surface mb-6">Quick Actions</h4>
          <div className="space-y-4 flex-1">
            <button
              onClick={() => navigate("/customers")}
              className="w-full flex items-center justify-between p-4 border border-outline-variant rounded-xl hover:bg-primary/5 transition-all group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <Icon name="person_add" className="text-primary group-hover:scale-110 transition-transform" />
                <span className="text-body-md font-semibold">Add New Customer</span>
              </div>
              <Icon name="chevron_right" className="text-on-surface-variant" />
            </button>
            <button
              onClick={() => navigate("/purchases/new")}
              className="w-full flex items-center justify-between p-4 border border-outline-variant rounded-xl hover:bg-primary/5 transition-all group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <Icon name="shopping_cart" className="text-primary group-hover:scale-110 transition-transform" />
                <span className="text-body-md font-semibold">Record Purchase</span>
              </div>
              <Icon name="chevron_right" className="text-on-surface-variant" />
            </button>
            <button
              onClick={() => navigate("/gst")}
              className="w-full flex items-center justify-between p-4 border border-outline-variant rounded-xl hover:bg-primary/5 transition-all group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <Icon name="account_balance" className="text-primary group-hover:scale-110 transition-transform" />
                <span className="text-body-md font-semibold">GST Reports</span>
              </div>
              <Icon name="chevron_right" className="text-on-surface-variant" />
            </button>
          </div>
          <button
            onClick={() => navigate("/invoices/new")}
            className="w-full py-3 bg-primary text-on-primary font-bold rounded-lg shadow-sm hover:shadow-md transition-all active:scale-[0.98] mt-4"
          >
            Create New Invoice
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center">
          <h4 className="text-headline-md text-on-surface">Recent Invoices</h4>
          <Link to="/invoices" className="text-primary font-bold text-label-md hover:underline transition-all">
            View All Invoices
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase tracking-wider">Invoice #</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase tracking-wider text-right">Amount</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-label-md text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {invoicesLoading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-on-surface-variant">Loading…</td></tr>
              ) : !recentInvoices || recentInvoices.content.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-on-surface-variant">No invoices yet — create your first one.</td></tr>
              ) : (
                recentInvoices.content.map((inv) => (
                  <tr key={inv.id} onClick={() => navigate(`/invoices/${inv.id}`)} className="hover:bg-surface-container-low transition-colors cursor-pointer group">
                    <td className="px-6 py-4 font-mono text-numeric-table text-primary font-bold">{inv.invoiceNumber}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-secondary-container flex items-center justify-center text-[10px] font-bold text-on-secondary-container">
                          {initialsOf(inv.customerName)}
                        </div>
                        <span className="text-body-md font-medium">{inv.customerName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-body-md text-on-surface-variant">
                      {new Date(inv.invoiceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-6 py-4 font-mono text-numeric-table text-right font-bold">{formatINR(inv.totalAmount)}</td>
                    <td className="px-6 py-4">
                      <Badge tone={statusTone[inv.paymentStatus]}>{inv.paymentStatus}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${inv.id}`); }}
                        className="p-2 text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container rounded-lg transition-colors"
                        aria-label={`View ${inv.invoiceNumber}`}
                      >
                        <Icon name="visibility" size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <OverdueInvoicesPanel />
        <LowStockPanel />
      </div>

      <div className="mt-6">
        <PaymentBreakdownPanel />
      </div>
    </div>
  );
}