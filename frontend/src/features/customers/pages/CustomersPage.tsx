import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../../../lib/useDebounce";
import { customersApi, type CustomerResponse, type CustomerSummary } from "../../../api/customers";
import { Icon } from "../../../components/Icon";
import { Table, type Column } from "../../../components/ui/Table";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { useToast } from "../../../components/ui/Toast";
import { CustomerFormModal } from "../components/CustomerFormModal";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatINR(amount: number): string {
  return `₹ ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function CustomersPage() {
  const { show } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomerResponse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerSummary | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["customers", debouncedSearch, page],
    queryFn: () => customersApi.list(debouncedSearch, page, 10),
  });

  const { data: stats } = useQuery({
    queryKey: ["customers", "stats"],
    queryFn: customersApi.stats,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      show("Customer deleted", "success");
      setDeleteTarget(null);
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  async function openEdit(summary: CustomerSummary) {
    const full = await customersApi.getById(summary.id);
    setEditTarget(full);
    setFormOpen(true);
  }

  function openCreate() {
    setEditTarget(null);
    setFormOpen(true);
  }

  const columns: Column<CustomerSummary>[] = [
    {
      header: "Name",
      cell: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container/20 flex items-center justify-center text-primary font-bold">
            {initialsOf(c.name)}
          </div>
          <p className="text-body-md font-bold text-on-surface">{c.name}</p>
        </div>
      ),
    },
    {
      header: "Mobile / Email",
      cell: (c) => (
        <div>
          <p className="text-body-md text-on-surface">{c.mobile || "—"}</p>
          <p className="text-label-md text-on-surface-variant">{c.email || "—"}</p>
        </div>
      ),
    },
    { header: "GSTIN", cell: (c) => <span className="font-mono text-numeric-table">{c.gstin || "—"}</span> },
    {
      header: "City/State",
      cell: (c) => (
        <div>
          <p className="text-body-md text-on-surface">{c.city || "—"}</p>
          <p className="text-label-md text-on-surface-variant">{c.state || ""}</p>
        </div>
      ),
    },
    {
      header: "Balance",
      align: "right",
      cell: (c) => (
        <span
          className={`px-3 py-1 rounded-full font-mono text-numeric-table ${
            c.currentBalance > 0 ? "bg-amber-500/10 text-amber-700" : "bg-on-surface-variant/5 text-on-surface-variant"
          }`}
        >
          {formatINR(c.currentBalance)}
        </span>
      ),
    },
    {
      header: "Actions",
      align: "right",
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => openEdit(c)}
            className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
            aria-label={`Edit ${c.name}`}
          >
            <Icon name="edit" size={20} />
          </button>
          <button
            onClick={() => setDeleteTarget(c)}
            className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
            aria-label={`Delete ${c.name}`}
          >
            <Icon name="delete" size={20} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-headline-lg text-on-surface mb-1">Customers</h2>
          <p className="text-body-lg text-on-surface-variant">Manage your client base and track receivables.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-6 py-3 bg-primary-container text-on-primary font-bold rounded-xl shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Icon name="person_add" />
          <span>Add Customer</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Icon name="groups" filled size={30} />
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant uppercase tracking-widest">Total Customers</p>
            <h3 className="text-headline-lg text-on-surface font-tabular">{stats?.totalCustomers ?? 0}</h3>
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
            <Icon name="account_balance" filled size={30} />
          </div>
          <div>
            <p className="text-label-md text-on-surface-variant uppercase tracking-widest">Total Receivable</p>
            <h3 className="text-headline-lg text-on-surface font-tabular">
              {formatINR(stats?.totalReceivable ?? 0)}
            </h3>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden mb-4">
        <div className="p-4 border-b border-outline-variant flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full bg-surface-container text-body-md pl-10 pr-4 py-2 rounded-full border-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Search customers..."
            />
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        rows={data?.content ?? []}
        keyOf={(c) => c.id}
        isLoading={isLoading}
        emptyMessage={debouncedSearch ? "No customers match your search." : "No customers yet — add your first one."}
        page={page}
        totalPages={data?.totalPages ?? 0}
        totalElements={data?.totalElements}
        onPageChange={setPage}
        entityLabel="customers"
      />

      <CustomerFormModal isOpen={formOpen} onClose={() => setFormOpen(false)} customer={editTarget} />
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete this customer?"
        description={`${deleteTarget?.name} will be permanently removed. This can't be undone.`}
        confirmLabel="Delete"
        tone="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}