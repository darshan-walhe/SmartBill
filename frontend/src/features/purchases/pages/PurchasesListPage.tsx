import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "../../../lib/useDebounce";
import { purchasesApi, type PurchasePaymentStatus, type PurchaseSummary } from "../../../api/purchases";
import { suppliersApi } from "../../../api/suppliers";
import { useAuth } from "../../../context/AuthContext";
import { Icon } from "../../../components/Icon";
import { Table, type Column } from "../../../components/ui/Table";
import { useToast } from "../../../components/ui/Toast";
import { RecordSupplierPaymentModal } from "../components/RecordSupplierPaymentModal";
import { ActionMenu } from "../../../components/ui/ActionMenu";

const statusPill: Record<PurchasePaymentStatus, string> = {
    DRAFT: "bg-surface-variant text-on-surface-variant",
    UNPAID: "bg-error-container/20 text-error",
    PARTIAL: "bg-tertiary-container/10 text-tertiary",
    PAID: "bg-secondary-container/20 text-secondary",
};

function formatDate(iso?: string): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatINR(amount: number): string {
    return `₹ ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PurchasesListPage() {
    const { session } = useAuth();
    const { show } = useToast();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const canMutate = session?.role === "ADMIN" || session?.role === "MANAGER" || session?.role === "STAFF";

    const [page, setPage] = useState(0);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 400);
    const [status, setStatus] = useState<PurchasePaymentStatus | "">("");
    const [supplierId, setSupplierId] = useState("");
    const [paymentTarget, setPaymentTarget] = useState<PurchaseSummary | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const { data: stats } = useQuery({ queryKey: ["purchases", "stats"], queryFn: purchasesApi.stats });
    const { data: suppliers } = useQuery({ queryKey: ["suppliers", "all"], queryFn: () => suppliersApi.list(undefined, 0, 100) });

    const { data, isLoading } = useQuery({
        queryKey: ["purchases", "list", debouncedSearch, status, supplierId, page],
        queryFn: () => purchasesApi.list({ keyword: debouncedSearch, status: status || undefined, supplierId: supplierId || undefined, page, size: 10 }),
    });

    const confirmMutation = useMutation({
        mutationFn: (id: string) => purchasesApi.confirmDraft(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchases"] });
            show("Purchase confirmed — stock has been added", "success");
        },
        onError: (err: Error) => show(err.message, "danger"),
    });

    function resetFilters() {
        setSearch("");
        setStatus("");
        setSupplierId("");
        setPage(0);
    }

    const columns: Column<PurchaseSummary>[] = [
        {
            header: "Purchase #",
            cell: (p) => (
                <div className="flex items-center gap-2">
                    <span className="text-body-md font-semibold text-primary">{p.purchaseNumber}</span>
                    {p.isReturn && (
                        <span className="flex items-center gap-1 bg-tertiary/10 text-tertiary px-1.5 py-0.5 rounded text-[10px] font-bold">
                            <Icon name="keyboard_return" size={12} /> RETURN
                        </span>
                    )}
                </div>
            ),
        },
        { header: "Supplier", cell: (p) => <span className="font-medium">{p.supplierName}</span> },
        { header: "Date", cell: (p) => <span className="font-mono text-numeric-table text-on-surface-variant">{formatDate(p.purchaseDate)}</span> },
        { header: "Due Date", cell: (p) => <span className="font-mono text-numeric-table text-on-surface-variant">{formatDate(p.dueDate)}</span> },
        { header: "Amount", align: "right", cell: (p) => <span className="font-mono font-bold">{formatINR(p.totalAmount)}</span> },
        {
            header: "Balance Due",
            align: "right",
            cell: (p) => (
                <span className={`font-mono font-bold ${p.balanceDue > 0 ? "text-error" : "text-on-surface-variant"}`}>{formatINR(p.balanceDue)}</span>
            ),
        },
        {
            header: "Status",
            cell: (p) => <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusPill[p.paymentStatus]}`}>{p.paymentStatus}</span>,
        },
        {
            header: "",
            align: "right",
            cell: (p) => (
                <ActionMenu
                    isOpen={openMenuId === p.id}
                    onClose={() => setOpenMenuId(openMenuId === p.id ? null : p.id)}
                    trigger={({ onClick }) => (
                        <button
                            onClick={onClick}
                            className="p-1 hover:bg-surface-container rounded transition-colors text-on-surface-variant"
                            aria-label={`Actions for ${p.purchaseNumber}`}
                        >
                            <Icon name="more_vert" size={20} />
                        </button>
                    )}
                >
                    <button
                        onClick={() => { navigate(`/purchases/${p.id}`); setOpenMenuId(null); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-body-md hover:bg-surface-container-low"
                    >
                        <Icon name="visibility" size={18} /> View
                    </button>
                    {p.paymentStatus === "DRAFT" && canMutate && (
                        <button
                            onClick={() => { confirmMutation.mutate(p.id); setOpenMenuId(null); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-body-md text-secondary hover:bg-surface-container-low"
                        >
                            <Icon name="check_circle" size={18} /> Confirm Draft
                        </button>
                    )}
                    {(p.paymentStatus === "UNPAID" || p.paymentStatus === "PARTIAL") &&
                        (session?.role === "ADMIN" || session?.role === "MANAGER" || session?.role === "ACCOUNTANT") && (
                            <button
                                onClick={() => { setPaymentTarget(p); setOpenMenuId(null); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-body-md hover:bg-surface-container-low"
                            >
                                <Icon name="payments" size={18} /> Record Payment
                            </button>
                        )}
                </ActionMenu>
            ),
        },
    ];

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-headline-lg text-on-surface">Purchases Registry</h2>
                    <p className="text-body-md text-on-surface-variant">Track vendor invoices, track payables, and manage purchase returns.</p>
                </div>
                <button
                    onClick={() => navigate("/purchases/new")}
                    className="bg-primary text-on-primary px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold shadow-sm hover:opacity-90 active:scale-95 transition-all"
                >
                    <Icon name="add_shopping_cart" />
                    New Purchase
                </button>
            </div>

            {/* Real numbers only — the mockup's "12% from yesterday" trend,
          "Overdue: ₹45,000" sub-line, and "8 processed today" have no
          backing field in PurchaseStats, which only returns
          todayPurchases/monthPurchases/totalPayable/unpaidCount. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-surface border border-outline-variant p-5 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-label-md text-on-surface-variant">Today's Purchases</span>
                        <div className="w-8 h-8 rounded-lg bg-primary-container/10 flex items-center justify-center text-primary">
                            <Icon name="calendar_today" size={16} />
                        </div>
                    </div>
                    <p className="text-headline-md font-mono text-on-surface">{formatINR(stats?.todayPurchases ?? 0)}</p>
                </div>
                <div className="bg-surface border border-outline-variant p-5 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-label-md text-on-surface-variant">Monthly Purchases</span>
                        <div className="w-8 h-8 rounded-lg bg-tertiary-container/10 flex items-center justify-center text-tertiary">
                            <Icon name="analytics" size={16} />
                        </div>
                    </div>
                    <p className="text-headline-md font-mono text-on-surface">{formatINR(stats?.monthPurchases ?? 0)}</p>
                </div>
                <div className="bg-surface border border-outline-variant p-5 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-label-md text-on-surface-variant">Total Payable</span>
                        <div className="w-8 h-8 rounded-lg bg-error-container/20 flex items-center justify-center text-error">
                            <Icon name="account_balance_wallet" size={16} />
                        </div>
                    </div>
                    <p className="text-headline-md font-mono text-on-surface">{formatINR(stats?.totalPayable ?? 0)}</p>
                </div>
                <div className="bg-surface border border-outline-variant p-5 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-label-md text-on-surface-variant">Unpaid Count</span>
                        <div className="w-8 h-8 rounded-lg bg-secondary-container/20 flex items-center justify-center text-secondary">
                            <Icon name="pending_actions" size={16} />
                        </div>
                    </div>
                    <p className="text-headline-md font-mono text-on-surface">{stats?.unpaidCount ?? 0} Pending</p>
                </div>
            </div>

            <div className="bg-surface border border-outline-variant p-4 rounded-xl shadow-sm mb-6 flex flex-col lg:flex-row items-center gap-4">
                <div className="relative w-full lg:flex-1">
                    <Icon name="search" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                        className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary/10 focus:border-primary"
                        placeholder="Search by Purchase # or Keyword..."
                    />
                </div>
                <select
                    value={status}
                    onChange={(e) => { setStatus(e.target.value as PurchasePaymentStatus | ""); setPage(0); }}
                    className="w-full lg:w-48 border border-outline-variant rounded-lg text-body-md py-2 px-3 focus:ring-2 focus:ring-primary/10"
                >
                    <option value="">All Statuses</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="UNPAID">UNPAID</option>
                    <option value="PARTIAL">PARTIAL</option>
                    <option value="PAID">PAID</option>
                </select>
                <select
                    value={supplierId}
                    onChange={(e) => { setSupplierId(e.target.value); setPage(0); }}
                    className="w-full lg:w-64 border border-outline-variant rounded-lg text-body-md py-2 px-3 focus:ring-2 focus:ring-primary/10"
                >
                    <option value="">All Suppliers</option>
                    {suppliers?.content.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button
                    onClick={resetFilters}
                    className="w-full lg:w-auto px-6 py-2 border border-outline-variant text-primary font-semibold rounded-lg hover:bg-surface-container-low transition-colors"
                >
                    Reset
                </button>
            </div>

            <Table
                columns={columns}
                rows={data?.content ?? []}
                keyOf={(p) => p.id}
                isLoading={isLoading}
                emptyMessage="No purchases found."
                page={page}
                totalPages={data?.totalPages ?? 0}
                totalElements={data?.totalElements}
                onPageChange={setPage}
                entityLabel="entries"
            />

            <RecordSupplierPaymentModal purchase={paymentTarget} onClose={() => setPaymentTarget(null)} />
        </div>
    );
}