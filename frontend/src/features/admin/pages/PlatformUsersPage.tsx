import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, type PlatformUser } from "../../../api/admin";
import { useAuth } from "../../../context/AuthContext";
import { Icon } from "../../../components/Icon";
import { Badge } from "../../../components/ui/Badge";
import { Table, type Column } from "../../../components/ui/Table";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { useToast } from "../../../components/ui/Toast";

const roleTone = {
  SUPER_ADMIN: "warning",
  ADMIN: "primary",
  MANAGER: "info",
  ACCOUNTANT: "warning",
  STAFF: "neutral",
} as const;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase();
}

export function PlatformUsersPage() {
  const { session } = useAuth();
  const { show } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [promoteTarget, setPromoteTarget] = useState<PlatformUser | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page],
    queryFn: () => adminApi.listUsers(page, 10),
  });

  const promoteMutation = useMutation({
    mutationFn: (userId: string) => adminApi.promoteToSuperAdmin(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      show("User promoted to SUPER_ADMIN", "success");
      setPromoteTarget(null);
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  const columns: Column<PlatformUser>[] = [
    {
      header: "Name",
      cell: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-on-surface-variant text-[10px] font-bold">
            {initialsOf(u.name)}
          </div>
          <div>
            <p className="font-bold text-body-md">{u.name}</p>
            <p className="text-xs text-on-surface-variant">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Company ID",
      cell: (u) => <span className="font-mono text-xs text-on-surface-variant">{u.companyId ?? "— platform"}</span>,
    },
    { header: "Role", cell: (u) => <Badge tone={roleTone[u.role]}>{u.role.replace("_", " ")}</Badge> },
    {
      header: "Status",
      cell: (u) => <Badge tone={u.active ? "success" : "danger"} dot>{u.active ? "Active" : "Inactive"}</Badge>,
    },
    {
      header: "Actions",
      align: "right",
      cell: (u) =>
        u.role === "SUPER_ADMIN" || u.id === session?.userId ? (
          <span className="text-xs text-on-surface-variant">{u.id === session?.userId ? "You" : ""}</span>
        ) : (
          <button
            onClick={() => setPromoteTarget(u)}
            className="p-2 hover:bg-surface-container rounded-lg transition-colors text-on-surface-variant hover:text-primary"
            aria-label={`Promote ${u.name} to SUPER_ADMIN`}
          >
            <Icon name="add_moderator" size={20} />
          </button>
        ),
    },
  ];

  return (
    <div>
      <Table
        columns={columns}
        rows={data?.content ?? []}
        keyOf={(u) => u.id}
        isLoading={isLoading}
        emptyMessage="No users found."
        page={page}
        totalPages={data?.totalPages ?? 0}
        totalElements={data?.totalElements}
        onPageChange={setPage}
        entityLabel="users"
      />

      <ConfirmDialog
        isOpen={!!promoteTarget}
        onClose={() => setPromoteTarget(null)}
        onConfirm={() => promoteTarget && promoteMutation.mutate(promoteTarget.id)}
        title="Promote to SUPER_ADMIN?"
        description={`${promoteTarget?.name} will gain unrestricted, cross-company platform access. This can't be undone from this screen.`}
        confirmLabel="Promote"
        tone="danger"
        isLoading={promoteMutation.isPending}
      />
    </div>
  );
}
