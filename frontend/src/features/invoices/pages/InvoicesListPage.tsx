import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "../../../lib/useDebounce";
import { invoicesApi, type InvoiceSummary, type PaymentStatus } from "../../../api/invoices";
import { useAuth } from "../../../context/AuthContext";
import { Icon } from "../../../components/Icon";
import { Table, type Column } from "../../../components/ui/Table";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { useToast } from "../../../components/ui/Toast";
import { RecordPaymentModal } from "../components/RecordPaymentModal";

type TabKey = "ALL" | "PAID" | "PENDING" | "OVERDUE";

const statusPill: Record<PaymentStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  UNPAID: "bg-tertiary-container/10 text-tertiary",
  PARTIAL: "bg-tertiary-container/10 text-tertiary",
  PAID: "bg-secondary/10 text-secondary",
  CANCELLED: "bg-error/10 text-error",
};

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatINR(amount: number): string {
  return `₹ ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InvoicesListPage() {
  const { session } = useAuth();
  const { show } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const canMutate = session?.role === "ADMIN" || session?.role === "MANAGER" || session?.role === "STAFF";
  const canCancel = session?.role === "ADMIN" || session?.role === "MANAGER";

  const [tab, setTab] = useState<TabKey>("ALL");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [paymentTarget, setPaymentTarget] = useState<InvoiceSummary | null>(null);
  const [cancelTarget, setCancelTarget] = useState<InvoiceSummary | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { data: stats } = useQuery({ queryKey: ["invoices", "stats"], queryFn: invoicesApi.stats });

  const statusParam = tab === "PAID" ? "PAID" : tab === "PENDING" ? "UNPAID" : undefined;

  const { data: pagedData, isLoading: pagedLoading } = useQuery({
    queryKey: ["invoices", "list", debouncedSearch, statusParam, page],
    queryFn: () => invoicesApi.list({ keyword: debouncedSearch, status: statusParam, page, size: 10 }),
    enabled: tab !== "OVERDUE",
  });

  const { data: overdueRows, isLoading: overdueLoading } = useQuery({
    queryKey: ["invoices", "overdue"],
    queryFn: invoicesApi.overdue,
    enabled: tab === "OVERDUE",
  });

  const rows = tab === "OVERDUE" ? overdueRows ?? [] : pagedData?.content ?? [];
  const isLoading = tab === "OVERDUE" ? overdueLoading : pagedLoading;

  const confirmMutation = useMutation({
    mutationFn: (id: string) => invoicesApi.confirmDraft(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      show("Invoice confirmed", "success");
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => invoicesApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      show("Invoice cancelled", "success");
      setCancelTarget(null);
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  const columns: Column<InvoiceSummary>[] = [
    { header: "Invoice #", cell: (i) => <span className="font-mono font-bold text-primary">{i.invoiceNumber}</span> },
    { header: "Client Name", cell: (i) => i.customerName },
    { header: "Date", cell: (i) => <span className="tabular-nums text-on-surface-variant">{formatDate(i.invoiceDate)}</span> },
    {
      header: "Due Date",
      cell: (i) => {
        const overdue = i.dueDate && new Date(i.dueDate) < new Date() && i.balanceDue > 0;
        return <span className={`tabular-nums ${overdue ? "text-error font-medium" : "text-on-surface-variant"}`}>{formatDate(i.dueDate)}</span>;
      },
    },
    { header: "Amount", align: "right", cell: (i) => <span className="font-mono font-semibold">{formatINR(i.totalAmount)}</span> },
    {
      header: "Status",
      cell: (i) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusPill[i.paymentStatus]}`}>
          {i.paymentStatus === "UNPAID" || i.paymentStatus === "PARTIAL" ? "Pending" : i.paymentStatus.charAt(0) + i.paymentStatus.slice(1).toLowerCase()}
        </span>
      ),
    },
    {
      header: "",
      align: "right",
      cell: (i) => (
        <div className="relative inline-block">
          <button
            onClick={() => setOpenMenuId(openMenuId === i.id ? null : i.id)}
            className="p-1.5 text-on-surface-variant hover:text-primary transition-all rounded-lg hover:bg-primary/10"
            aria-label={`Actions for ${i.invoiceNumber}`}
          >
            <Icon name="more_vert" size={20} />
          </button>
          {openMenuId === i.id && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
              <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-outline-variant bg-surface py-1 shadow-lg text-left">
                <button
                  onClick={() => { navigate(`/invoices/${i.id}`); setOpenMenuId(null); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-body-md hover:bg-surface-container-low"
                >
                  <Icon name="visibility" size={18} /> View
                </button>
                {i.paymentStatus === "DRAFT" && canMutate && (
                  <button
                    onClick={() => { confirmMutation.mutate(i.id); setOpenMenuId(null); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-body-md text-secondary hover:bg-surface-container-low"
                  >
                    <Icon name="check_circle" size={18} /> Confirm Draft
                  </button>
                )}
                {(i.paymentStatus === "UNPAID" || i.paymentStatus === "PARTIAL") && canMutate && (
                  <button
                    onClick={() => { setPaymentTarget(i); setOpenMenuId(null); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-body-md hover:bg-surface-container-low"
                  >
                    <Icon name="payments" size={18} /> Record Payment
                  </button>
                )}
                {i.paymentStatus !== "CANCELLED" && canCancel && (
                  <button
                    onClick={() => { setCancelTarget(i); setOpenMenuId(null); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-body-md text-error hover:bg-surface-container-low"
                  >
                    <Icon name="cancel" size={18} /> Cancel Invoice
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-headline-lg text-on-surface mb-1">Invoices</h1>
          <p className="text-body-md text-on-surface-variant">Manage your business billing and GST compliance tracking.</p>
        </div>
        <button
          onClick={() => navigate("/invoices/new")}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
        >
          <Icon name="add" />
          Create New Invoice
        </button>
      </div>

      {/* Real numbers only — the mockup's "+12.5% from last month" trend and
          "Tax Liability" card have no backing field in SalesStats, so I
          swapped the second metric on each card for ones that do:
          totalInvoices and unpaidCount/totalOutstanding respectively. */}
      <div className="grid grid-cols-12 gap-6 mb-8">
        <div className="col-span-12 lg:col-span-8 bg-white border border-outline-variant rounded-xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-label-md text-on-surface-variant uppercase tracking-wider mb-2">Monthly Collections</p>
            <h3 className="text-headline-lg text-primary tabular-nums">{formatINR(stats?.monthSales ?? 0)}</h3>
          </div>
          <div className="text-right">
            <p className="text-label-md text-on-surface-variant">Total Invoices</p>
            <p className="text-headline-md text-on-surface tabular-nums">{stats?.totalInvoices ?? 0}</p>
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4 bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
          <p className="text-label-md text-on-surface-variant uppercase tracking-wider mb-2">Outstanding</p>
          <h3 className="text-headline-lg text-error tabular-nums">{formatINR(stats?.totalOutstanding ?? 0)}</h3>
          <p className="text-body-md text-on-surface-variant mt-2">{stats?.unpaidCount ?? 0} invoices awaiting payment</p>
        </div>
      </div>

      <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low/30">
          <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg">
            {(["ALL", "PAID", "PENDING", "OVERDUE"] as TabKey[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setPage(0); }}
                className={`px-4 py-2 rounded-md text-label-md transition-all ${
                  tab === t ? "text-on-primary-container bg-primary-container shadow-sm font-bold" : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-80">
            <Icon name="search" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full h-10 pl-10 pr-4 bg-surface-container-low border border-outline-variant/50 rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="Search invoices, clients..."
            />
          </div>
        </div>

        <Table
          columns={columns}
          rows={rows}
          keyOf={(i) => i.id}
          isLoading={isLoading}
          emptyMessage="No invoices found."
          page={tab === "OVERDUE" ? undefined : page}
          totalPages={tab === "OVERDUE" ? undefined : pagedData?.totalPages ?? 0}
          totalElements={tab === "OVERDUE" ? undefined : pagedData?.totalElements}
          onPageChange={tab === "OVERDUE" ? undefined : setPage}
          entityLabel="invoices"
        />
      </div>

      <RecordPaymentModal invoice={paymentTarget} onClose={() => setPaymentTarget(null)} />
      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
        title="Cancel this invoice?"
        description={`${cancelTarget?.invoiceNumber} will be cancelled — stock and the customer's balance will be reversed. This can't be undone.`}
        confirmLabel="Cancel Invoice"
        tone="danger"
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}