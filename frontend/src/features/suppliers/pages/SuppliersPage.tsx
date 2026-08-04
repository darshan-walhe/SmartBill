import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../../../lib/useDebounce";
import { suppliersApi, type SupplierResponse, type SupplierSummary } from "../../../api/suppliers";
import { Icon } from "../../../components/Icon";
import { Table, type Column } from "../../../components/ui/Table";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { useToast } from "../../../components/ui/Toast";
import { SupplierFormModal } from "../components/SupplierFormModal";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatINR(amount: number): string {
  return `₹ ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SuppliersPage() {
  const { show } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SupplierResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupplierSummary | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["suppliers", debouncedSearch, page],
    queryFn: () => suppliersApi.list(debouncedSearch, page, 10),
  });

  const { data: stats } = useQuery({
    queryKey: ["suppliers", "stats"],
    queryFn: suppliersApi.stats,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => suppliersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      show("Supplier deleted", "success");
      setDeleteTarget(null);
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  async function openEdit(summary: SupplierSummary) {
    const full = await suppliersApi.getById(summary.id);
    setEditTarget(full);
    setFormOpen(true);
  }

  function openCreate() {
    setEditTarget(null);
    setFormOpen(true);
  }

  const columns: Column<SupplierSummary>[] = [
    {
      header: "Name",
      cell: (s) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary font-bold">
            {initialsOf(s.name)}
          </div>
          <p className="text-body-md font-bold text-on-surface">{s.name}</p>
        </div>
      ),
    },
    {
      header: "Mobile / Email",
      cell: (s) => (
        <div>
          <p className="text-body-md text-on-surface">{s.mobile || "—"}</p>
          <p className="text-label-md text-on-surface-variant">{s.email || "—"}</p>
        </div>
      ),
    },
    { header: "GSTIN", cell: (s) => <span className="font-mono text-numeric-table">{s.gstin || "—"}</span> },
    {
      header: "City/State",
      cell: (s) => (
        <div>
          <p className="text-body-md text-on-surface">{s.city || "—"}</p>
          <p className="text-label-md text-on-surface-variant">{s.state || ""}</p>
        </div>
      ),
    },
    {
      header: "Balance",
      align: "right",
      cell: (s) => (
        <span
          className={`px-3 py-1 rounded font-mono text-numeric-table font-bold ${
            s.outstandingAmount > 0 ? "bg-error-container/20 text-error" : "bg-surface-variant/50 text-on-surface-variant"
          }`}
        >
          {formatINR(s.outstandingAmount)}
        </span>
      ),
    },
    {
      header: "Actions",
      align: "center",
      cell: (s) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => openEdit(s)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-outline hover:bg-primary/10 hover:text-primary transition-all"
            aria-label={`Edit ${s.name}`}
          >
            <Icon name="edit" size={20} />
          </button>
          <button
            onClick={() => setDeleteTarget(s)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-outline hover:bg-error/10 hover:text-error transition-all"
            aria-label={`Delete ${s.name}`}
          >
            <Icon name="delete" size={20} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-headline-lg text-on-surface">Suppliers</h2>
          <p className="text-body-lg text-on-surface-variant mt-1">Manage your vendor base and track payables.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-xl font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all"
        >
          <Icon name="add" />
          Add Supplier
        </button>
      </div>

      {/* Only one stat card — the mockup shows 2 more ("Active Suppliers",
          "Overdue Bills") but the backend's SupplierStatsResponse only
          returns totalPayable; the other two aren't real numbers here. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm flex items-center gap-6">
          <div className="w-14 h-14 rounded-full bg-primary-container/10 flex items-center justify-center text-primary">
            <Icon name="account_balance_wallet" size={32} />
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant uppercase tracking-wider">Total Payable</p>
            <p className="text-headline-lg text-on-surface font-tabular">{formatINR(stats?.totalPayable ?? 0)}</p>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden mb-4">
        <div className="p-4 border-b border-outline-variant flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low rounded-lg border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary transition-all text-body-md outline-none"
              placeholder="Search by name, GSTIN or city..."
            />
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        rows={data?.content ?? []}
        keyOf={(s) => s.id}
        isLoading={isLoading}
        emptyMessage={debouncedSearch ? "No suppliers match your search." : "No suppliers yet — add your first one."}
        page={page}
        totalPages={data?.totalPages ?? 0}
        totalElements={data?.totalElements}
        onPageChange={setPage}
        entityLabel="suppliers"
      />

      <SupplierFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} supplier={editTarget} />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete this supplier?"
        description={`${deleteTarget?.name} will be permanently removed. This can't be undone.`}
        confirmLabel="Delete"
        tone="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}