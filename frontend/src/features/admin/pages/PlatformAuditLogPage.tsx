import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { auditLogApi, type AuditLogEntry, type AuditAction } from "../../../api/auditLogs";
import { Icon } from "../../../components/Icon";
import { Table, type Column } from "../../../components/ui/Table";

const actionLabel: Record<AuditAction, string> = {
  CREATE: "Created record",
  UPDATE: "Updated record",
  DELETE: "Deleted record",
  CANCEL: "Cancelled invoice",
  CONFIRM: "Confirmed record",
  LOGIN: "Logged in",
  ROLE_CHANGE: "Changed role",
  DEACTIVATE: "Deactivated",
  REACTIVATE: "Reactivated",
  PAYMENT: "Recorded payment",
  INVITE: "Invited teammate",
};

function initialsOf(userId: string | null): string {
  return userId ? userId.slice(0, 2).toUpperCase() : "SY";
}

export function PlatformAuditLogPage() {
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit-log", page],
    queryFn: () => auditLogApi.listAll(page, 15),
  });

  const columns: Column<AuditLogEntry>[] = [
    {
      header: "Timestamp",
      cell: (l) => (
        <span className="font-mono text-numeric-table text-on-surface-variant whitespace-nowrap">
          {new Date(l.createdAt).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      header: "User",
      cell: (l) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-on-surface-variant text-[10px] font-bold">
            {initialsOf(l.userId)}
          </div>
          <p className="text-[11px] font-mono text-on-surface-variant">{l.userId ?? "system"}</p>
        </div>
      ),
    },
    { header: "Action", cell: (l) => <span className="text-body-md text-on-surface">{actionLabel[l.action]}</span> },
    {
      header: "Target Entity",
      cell: (l) => (
        <code className="text-xs bg-surface-container px-2 py-1 rounded text-primary">
          {l.entityType}_{l.entityId.slice(-6)}
        </code>
      ),
    },
    {
      header: "Company",
      cell: (l) =>
        l.companyId ? (
          <span className="font-mono text-xs text-on-surface-variant">{l.companyId.slice(-8)}</span>
        ) : (
          <span className="px-2 py-1 rounded bg-secondary-container/20 text-secondary font-bold text-xs uppercase tracking-tight">
            Platform
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Icon name="info" className="text-primary" />
        <p className="text-body-md text-on-surface-variant">
          Search/date filters aren't wired up yet — <code className="text-xs">GET /api/admin/audit-logs</code>{" "}
          only accepts <code className="text-xs">page</code>/<code className="text-xs">size</code> today.
        </p>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="text-headline-md text-on-surface">Recent System Activity</h3>
        </div>
        <Table
          columns={columns}
          rows={data?.content ?? []}
          keyOf={(l) => l.id}
          isLoading={isLoading}
          emptyMessage="No audit activity recorded yet."
          page={page}
          totalPages={data?.totalPages ?? 0}
          totalElements={data?.totalElements}
          onPageChange={setPage}
          entityLabel="records"
        />
      </section>
    </div>
  );
}
