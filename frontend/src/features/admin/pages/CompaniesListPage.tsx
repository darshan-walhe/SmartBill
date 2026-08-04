import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, type CompanyAdminSummary } from "../../../api/admin";
import { Icon } from "../../../components/Icon";
import { Table, type Column } from "../../../components/ui/Table";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { useToast } from "../../../components/ui/Toast";
import { SubscriptionPlanModal } from "../components/SubscriptionPlanModal";

const planPillClass: Record<string, string> = {
  ENTERPRISE: "bg-primary/10 text-primary border-primary/20",
  PRO: "bg-tertiary/10 text-tertiary border-tertiary/20",
  BASIC: "bg-on-surface-variant/10 text-on-surface-variant border-on-surface-variant/20",
  FREE: "bg-secondary/10 text-secondary border-secondary/20",
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase();
}

export function CompaniesListPage() {
  const { show } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");
  const [planFilter, setPlanFilter] = useState<"ALL" | "FREE" | "BASIC" | "PRO" | "ENTERPRISE">("ALL");
  const [planTarget, setPlanTarget] = useState<CompanyAdminSummary | null>(null);
  const [statusTarget, setStatusTarget] = useState<CompanyAdminSummary | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "companies", page],
    queryFn: () => adminApi.listCompanies(page, 10),
  });

  // Client-side only — GET /api/admin/companies doesn't accept status/plan
  // query params yet, so this filters within the currently loaded page
  // rather than the full backend dataset. Good enough for now; upgrade to
  // server-side filtering if the backend grows those params.
  const filteredRows = useMemo(() => {
    return (data?.content ?? []).filter((c) => {
      if (statusFilter === "ACTIVE" && !c.active) return false;
      if (statusFilter === "SUSPENDED" && c.active) return false;
      if (planFilter !== "ALL" && c.subscriptionPlan !== planFilter) return false;
      return true;
    });
  }, [data, statusFilter, planFilter]);

  const statusMutation = useMutation({
    mutationFn: (company: CompanyAdminSummary) =>
      company.active ? adminApi.deactivateCompany(company.id) : adminApi.reactivateCompany(company.id),
    onSuccess: (_, company) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "companies"] });
      show(company.active ? "Company deactivated" : "Company reactivated", "success");
      setStatusTarget(null);
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  const columns: Column<CompanyAdminSummary>[] = [
    {
      header: "Company Name",
      cell: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary-container/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
            {initialsOf(c.name)}
          </div>
          <span className={`font-bold text-body-md ${!c.active ? "text-on-surface/60" : ""}`}>{c.name}</span>
        </div>
      ),
    },
    { header: "GSTIN", cell: (c) => <span className="font-mono text-numeric-table">{c.gstNumber || "—"}</span> },
    {
      header: "Contact Detail",
      cell: (c) => (
        <div className={!c.active ? "opacity-60" : ""}>
          <p className="text-body-md">{c.email || "—"}</p>
          <p className="text-label-md text-on-surface-variant font-mono">{c.mobile || "—"}</p>
        </div>
      ),
    },
    {
      header: "Subscription",
      cell: (c) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${planPillClass[c.subscriptionPlan]}`}>
          {c.subscriptionPlan}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (c) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            c.active
              ? "bg-secondary/10 text-secondary border-secondary/20"
              : "bg-error/10 text-error border-error/20"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${c.active ? "bg-secondary" : "bg-error"}`} />
          {c.active ? "Active" : "Deactivated"}
        </span>
      ),
    },
    {
      header: "Date Created",
      cell: (c) => (
        <span className="font-mono text-numeric-table text-on-surface-variant">
          {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      header: "Actions",
      align: "right",
      cell: (c) => (
        <div className="relative inline-block">
          <button
            onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}
            className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant"
            aria-label={`Actions for ${c.name}`}
          >
            <Icon name="more_vert" size={20} />
          </button>
          {openMenuId === c.id && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
              <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-outline-variant bg-surface py-1 shadow-lg text-left">
                <button
                  onClick={() => { setPlanTarget(c); setOpenMenuId(null); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-body-md hover:bg-surface-container-low"
                >
                  <Icon name="workspace_premium" size={18} />
                  Change plan
                </button>
                <button
                  onClick={() => { setStatusTarget(c); setOpenMenuId(null); }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-body-md hover:bg-surface-container-low ${c.active ? "text-error" : "text-secondary"}`}
                >
                  <Icon name={c.active ? "block" : "check_circle"} size={18} />
                  {c.active ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-surface-container-lowest border border-outline-variant px-3 py-2 rounded-lg gap-2">
            <span className="text-label-md text-on-surface-variant uppercase tracking-tight">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="bg-transparent border-none text-body-md focus:ring-0 py-0 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Deactivated</option>
            </select>
          </div>
          <div className="flex items-center bg-surface-container-lowest border border-outline-variant px-3 py-2 rounded-lg gap-2">
            <span className="text-label-md text-on-surface-variant uppercase tracking-tight">Plan:</span>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value as typeof planFilter)}
              className="bg-transparent border-none text-body-md focus:ring-0 py-0 cursor-pointer"
            >
              <option value="ALL">All Plans</option>
              <option value="FREE">Free</option>
              <option value="BASIC">Basic</option>
              <option value="PRO">Pro</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>
        </div>
        <div className="text-right">
          <p className="text-label-md text-on-surface-variant">Total Companies</p>
          <p className="text-headline-md font-black tabular-nums">{data?.totalElements ?? 0}</p>
        </div>
      </section>

      <Table
        columns={columns}
        rows={filteredRows}
        keyOf={(c) => c.id}
        isLoading={isLoading}
        emptyMessage="No companies match these filters."
        page={page}
        totalPages={data?.totalPages ?? 0}
        totalElements={data?.totalElements}
        onPageChange={setPage}
        entityLabel="companies"
      />

      <SubscriptionPlanModal company={planTarget} onClose={() => setPlanTarget(null)} />
      <ConfirmDialog
        isOpen={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => statusTarget && statusMutation.mutate(statusTarget)}
        title={statusTarget?.active ? "Deactivate this company?" : "Reactivate this company?"}
        description={
          statusTarget?.active
            ? `Every user at ${statusTarget?.name} will immediately lose access, on their next request — not just at their next login.`
            : `Every user at ${statusTarget?.name} will regain access immediately.`
        }
        confirmLabel={statusTarget?.active ? "Deactivate" : "Reactivate"}
        tone={statusTarget?.active ? "danger" : "primary"}
        isLoading={statusMutation.isPending}
      />
    </div>
  );
}
