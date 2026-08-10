import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { notificationsApi, type NotificationResponse, type NotificationType } from "../../../api/notifications";
import { useAuth } from "../../../context/AuthContext";
import { Icon } from "../../../components/Icon";
import { useToast } from "../../../components/ui/Toast";
import { BroadcastModal } from "../components/BroadcastModal";

const typeConfig: Record<NotificationType, { icon: string; iconTone: string; badge: string; label: string }> = {
  LOW_STOCK: { icon: "inventory_2", iconTone: "text-tertiary", badge: "bg-tertiary/10 text-tertiary", label: "Inventory" },
  OUT_OF_STOCK: { icon: "error", iconTone: "text-error", badge: "bg-error/10 text-error", label: "Inventory" },
  PAYMENT_RECEIVED: { icon: "payments", iconTone: "text-secondary", badge: "bg-secondary/10 text-secondary", label: "Payment" },
  PAYMENT_MADE: { icon: "payments", iconTone: "text-primary", badge: "bg-primary/10 text-primary", label: "Payment" },
  INVOICE_OVERDUE: { icon: "schedule", iconTone: "text-error", badge: "bg-error/10 text-error", label: "Urgent" },
  INVOICE_CANCELLED: { icon: "cancel", iconTone: "text-error", badge: "bg-error/10 text-error", label: "Invoice" },
  PURCHASE_RECEIVED: { icon: "shopping_cart", iconTone: "text-secondary", badge: "bg-secondary/10 text-secondary", label: "Purchase" },
  USER_INVITED: { icon: "person_add", iconTone: "text-primary", badge: "bg-primary/10 text-primary", label: "Team" },
  GENERAL: { icon: "campaign", iconTone: "text-tertiary", badge: "bg-tertiary/10 text-tertiary", label: "Admin" },
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function NotificationsPage() {
  const { session } = useAuth();
  const { show } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "list", page],
    queryFn: () => notificationsApi.list(page, 20),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      show("All notifications marked as read", "success");
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  function handleClick(n: NotificationResponse) {
    if (!n.read) markReadMutation.mutate(n.id);
    if (n.referenceType === "INVOICE" && n.referenceId) navigate(`/invoices/${n.referenceId}`);
    else if (n.referenceType === "PURCHASE" && n.referenceId) navigate(`/purchases/${n.referenceId}`);
    // Other reference types (PRODUCT, USER, etc.) don't have a dedicated
    // detail route yet, so clicking those just marks the notification read.
  }

  const notifications = data?.content ?? [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-headline-lg text-on-surface">Notifications</h1>
          <p className="text-on-surface-variant text-body-md mt-1">Stay updated with your latest business activities.</p>
        </div>
        <div className="flex items-center gap-2">
          {session?.role === "ADMIN" && (
            <button
              onClick={() => setBroadcastOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-surface border border-outline-variant text-primary font-semibold rounded-lg hover:bg-surface-container-high transition-all active:scale-[0.98]"
            >
              <Icon name="campaign" size={20} />
              Broadcast Announcement
            </button>
          )}
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="px-4 py-2 bg-primary text-on-primary font-semibold rounded-lg hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
          >
            Mark all as Read
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-body-md text-on-surface-variant">Loading notifications…</p>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20">
          <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center mx-auto mb-6">
            <Icon name="notifications_off" className="text-outline" size={48} />
          </div>
          <h2 className="text-headline-md text-on-surface">No notifications yet</h2>
          <p className="text-on-surface-variant text-body-md mt-2 max-w-sm">
            We'll let you know when something important happens with your invoices, inventory, or account.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const cfg = typeConfig[n.type] ?? typeConfig.GENERAL;
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`group relative border border-outline-variant rounded-xl p-4 transition-all duration-200 cursor-pointer flex gap-4 items-start shadow-sm hover:shadow-md ${
                  n.read ? "bg-surface-container-lowest" : "bg-surface hover:bg-surface-container-low"
                }`}
              >
                {!n.read && <div className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full" />}
                <div className="w-12 h-12 flex-shrink-0 rounded-lg bg-surface-container-high flex items-center justify-center">
                  <Icon name={cfg.icon} className={cfg.iconTone} size={26} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <span className={`text-body-lg text-on-surface ${n.read ? "" : "font-bold"}`}>{n.title}</span>
                    <span className="text-on-surface-variant text-label-md tabular-nums whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="text-on-surface-variant mt-1 text-body-md leading-relaxed">{n.message}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`px-2 py-0.5 font-bold rounded text-[10px] uppercase ${cfg.badge}`}>{cfg.label}</span>
                    {n.read && <span className="text-on-surface-variant text-[11px] font-medium italic">Read</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between border-t border-outline-variant pt-6">
          <span className="text-on-surface-variant text-label-md">
            Page {page + 1} of {data.totalPages} · {data.totalElements} notifications
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-all"
            >
              <Icon name="chevron_left" />
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= data.totalPages}
              className="p-2 border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-all"
            >
              <Icon name="chevron_right" />
            </button>
          </div>
        </div>
      )}

      <BroadcastModal isOpen={broadcastOpen} onClose={() => setBroadcastOpen(false)} />
    </div>
  );
}