import { Link } from "react-router-dom";
import { Icon } from "../../components/Icon";
import { Badge } from "../../components/ui/Badge";
import { useAuth } from "../../context/AuthContext";

// Placeholder figures throughout — wired to real /api/invoices/stats,
// /api/purchases/stats, /api/gst/* etc. once those modules land in their
// own phases (P4/P5/P6). Layout matches the bento grid embedded in the
// app_layout_desktop mockup exactly.
const recentInvoices = [
  { id: "INV-2024-001", customer: "Tata Motors Ltd.", date: "Oct 24, 2023", amount: "₹ 1,54,000.00", status: "PAID" as const },
  { id: "INV-2024-002", customer: "Reliance Ind.", date: "Oct 25, 2023", amount: "₹ 82,000.00", status: "PENDING" as const },
  { id: "INV-2024-003", customer: "Infosys Tech.", date: "Oct 26, 2023", amount: "₹ 2,10,450.00", status: "OVERDUE" as const },
];

const statusTone = { PAID: "success", PENDING: "warning", OVERDUE: "danger" } as const;

export function Dashboard() {
  const { session } = useAuth();

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-headline-lg text-on-surface mb-1">Dashboard Overview</h2>
          <p className="text-body-md text-on-surface-variant">
            Welcome back, {session?.name?.split(" ")[0]}. Here's what's happening today.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-outline text-primary font-bold rounded-lg hover:bg-surface-container-low transition-colors">
            <Icon name="download" size={20} />
            <span>Reports</span>
          </button>
          <Link
            to="/invoices"
            className="flex items-center gap-2 px-6 py-2 bg-primary text-on-primary font-bold rounded-lg hover:shadow-lg active:scale-95 transition-all"
          >
            <Icon name="add" size={20} />
            <span>New Invoice</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Stat cards */}
        <div className="md:col-span-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Icon name="trending_up" />
            </div>
            <span className="text-label-md text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">+12%</span>
          </div>
          <p className="text-label-md text-on-surface-variant uppercase tracking-wider">Total Sales</p>
          <h3 className="text-headline-md font-bold text-on-surface mt-1 font-tabular">₹ 0.00</h3>
        </div>

        <div className="md:col-span-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Icon name="payments" />
            </div>
            <span className="text-label-md text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">On track</span>
          </div>
          <p className="text-label-md text-on-surface-variant uppercase tracking-wider">GST Collected</p>
          <h3 className="text-headline-md font-bold text-on-surface mt-1 font-tabular">₹ 0.00</h3>
        </div>

        <div className="md:col-span-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Icon name="hourglass_empty" />
            </div>
            <span className="text-label-md text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">0 Overdue</span>
          </div>
          <p className="text-label-md text-on-surface-variant uppercase tracking-wider">Receivables</p>
          <h3 className="text-headline-md font-bold text-on-surface mt-1 font-tabular">₹ 0.00</h3>
        </div>

        {/* Revenue chart placeholder */}
        <div className="md:col-span-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80 relative overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-body-lg font-bold">Revenue Growth</h4>
            <select className="text-label-md border-slate-200 rounded-lg bg-surface-container-low">
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
          </div>
          <div className="flex-1 flex items-end justify-center text-on-surface-variant text-body-md">
            Chart data arrives once invoices exist (Phase 4+)
          </div>
        </div>

        {/* Quick actions */}
        <div className="md:col-span-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h4 className="text-body-lg font-bold mb-4">Quick Actions</h4>
          <div className="space-y-3">
            <Link
              to="/customers"
              className="w-full flex items-center gap-3 p-3 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary border border-outline-variant shadow-sm group-hover:scale-110 transition-transform">
                <Icon name="person_add" />
              </div>
              <div className="flex flex-col">
                <span className="text-body-md font-bold">Add Customer</span>
                <span className="text-label-md text-on-surface-variant">Create a new ledger</span>
              </div>
            </Link>
            <Link
              to="/gst"
              className="w-full flex items-center gap-3 p-3 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary border border-outline-variant shadow-sm group-hover:scale-110 transition-transform">
                <Icon name="share_windows" />
              </div>
              <div className="flex flex-col">
                <span className="text-body-md font-bold">GST Portal</span>
                <span className="text-label-md text-on-surface-variant">View GST reports</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent invoices table */}
        <div className="md:col-span-12 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h4 className="text-body-lg font-bold">Recent Invoices</h4>
            <Link to="/invoices" className="text-label-md text-primary font-bold hover:underline">
              View all invoices
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-6 py-3 text-left text-label-md font-bold text-outline uppercase tracking-wider">Invoice #</th>
                  <th className="px-6 py-3 text-left text-label-md font-bold text-outline uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-label-md font-bold text-outline uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-label-md font-bold text-outline uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-center text-label-md font-bold text-outline uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-numeric-table text-on-surface">{inv.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-[10px]">
                          {inv.customer.charAt(0)}
                        </div>
                        <span className="text-body-md text-on-surface font-medium">{inv.customer}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-body-md text-on-surface-variant">{inv.date}</td>
                    <td className="px-6 py-4 text-right text-numeric-table font-bold font-tabular">{inv.amount}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge tone={statusTone[inv.status]}>{inv.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
