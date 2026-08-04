import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi, type TeamMember } from "../../../api/users";
import { useAuth } from "../../../context/AuthContext";
import { Icon } from "../../../components/Icon";
import { Badge } from "../../../components/ui/Badge";
import { Table, type Column } from "../../../components/ui/Table";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { useToast } from "../../../components/ui/Toast";
import { InviteUserModal } from "../components/InviteUserModal";
import { RoleChangeModal } from "../components/RoleChangeModal";

const roleTone = {
  ADMIN: "primary",
  MANAGER: "info",
  ACCOUNTANT: "warning",
  STAFF: "neutral",
} as const;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase();
}

export function TeamPage() {
  const { session } = useAuth();
  const { show } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = session?.role === "ADMIN";

  const [page, setPage] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<TeamMember | null>(null);
  const [statusTarget, setStatusTarget] = useState<TeamMember | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["team", page],
    queryFn: () => usersApi.list(page, 10),
  });

  const statusMutation = useMutation({
    mutationFn: (member: TeamMember) =>
      member.active ? usersApi.deactivate(member.id) : usersApi.reactivate(member.id),
    onSuccess: (_, member) => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      show(member.active ? "Teammate deactivated" : "Teammate reactivated", "success");
      setStatusTarget(null);
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  const columns: Column<TeamMember>[] = [
    {
      header: "Name",
      cell: (m) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-label-md">
            {initialsOf(m.name)}
          </div>
          <div>
            <p className="text-body-md font-bold text-on-surface">{m.name}</p>
            <p className="text-[11px] text-on-surface-variant">
              Joined {new Date(m.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
      ),
    },
    { header: "Email", cell: (m) => <span className="text-body-md">{m.email}</span> },
    { header: "Mobile", cell: (m) => <span className="font-mono text-numeric-table">{m.mobile}</span> },
    { header: "Role", cell: (m) => <Badge tone={roleTone[m.role as keyof typeof roleTone] ?? "neutral"}>{m.role}</Badge> },
    {
      header: "Status",
      cell: (m) => (
        <Badge tone={m.active ? "success" : "danger"} dot>
          {m.active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      align: "right",
      cell: (m) =>
        !isAdmin || m.id === session?.userId ? (
          <span className="text-[11px] text-on-surface-variant">{m.id === session?.userId ? "You" : ""}</span>
        ) : (
          <div className="relative inline-block">
            <button
              onClick={() => setOpenMenuId(openMenuId === m.id ? null : m.id)}
              className="p-2 hover:bg-surface-container-high rounded-lg transition-colors"
              aria-label={`Actions for ${m.name}`}
            >
              <Icon name="more_vert" size={20} />
            </button>
            {openMenuId === m.id && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-outline-variant bg-surface py-1 shadow-lg text-left">
                  <button
                    onClick={() => { setRoleTarget(m); setOpenMenuId(null); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-body-md text-on-surface hover:bg-surface-container-low"
                  >
                    <Icon name="edit" size={18} />
                    Change role
                  </button>
                  <button
                    onClick={() => { setStatusTarget(m); setOpenMenuId(null); }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-body-md hover:bg-surface-container-low ${
                      m.active ? "text-error" : "text-secondary"
                    }`}
                  >
                    <Icon name={m.active ? "person_off" : "person_check"} size={18} />
                    {m.active ? "Deactivate" : "Reactivate"}
                  </button>
                </div>
              </>
            )}
          </div>
        ),
    },
  ];

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-headline-lg text-on-surface">Team Members</h1>
          <p className="text-body-md text-on-surface-variant">
            Manage your organization's members and their access roles.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setInviteOpen(true)}
            className="bg-primary text-on-primary px-5 py-2.5 rounded-xl text-body-md font-bold flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95 transition-all"
          >
            <Icon name="person_add" size={20} />
            Invite Team Member
          </button>
        )}
      </div>

      <Table
        columns={columns}
        rows={data?.content ?? []}
        keyOf={(m) => m.id}
        isLoading={isLoading}
        emptyMessage="No teammates yet."
        page={page}
        totalPages={data?.totalPages ?? 0}
        totalElements={data?.totalElements}
        onPageChange={setPage}
        entityLabel="members"
      />

      {!isAdmin && (
        <div className="mt-4 flex items-center gap-3 p-4 bg-secondary/5 border border-secondary/20 rounded-xl">
          <Icon name="visibility" className="text-secondary" />
          <p className="text-body-md text-on-surface">
            <span className="font-bold">Manager view:</span> you can see the team, but only an
            admin can invite, change roles, or deactivate members.
          </p>
        </div>
      )}

      <InviteUserModal isOpen={inviteOpen} onClose={() => setInviteOpen(false)} />
      <RoleChangeModal member={roleTarget} onClose={() => setRoleTarget(null)} />
      <ConfirmDialog
        isOpen={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => statusTarget && statusMutation.mutate(statusTarget)}
        title={statusTarget?.active ? "Deactivate teammate?" : "Reactivate teammate?"}
        description={
          statusTarget?.active
            ? `${statusTarget?.name} will immediately lose access to SmartBill.`
            : `${statusTarget?.name} will regain access to SmartBill.`
        }
        confirmLabel={statusTarget?.active ? "Deactivate" : "Reactivate"}
        tone={statusTarget?.active ? "danger" : "primary"}
        isLoading={statusMutation.isPending}
      />
    </div>
  );
}
