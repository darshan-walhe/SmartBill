import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { invoicesApi, type InvoiceSummary } from "../../../api/invoices";
import { companyApi } from "../../../api/company";
import { auditLogApi } from "../../../api/auditLogs";
import { useAuth } from "../../../context/AuthContext";
import { Icon } from "../../../components/Icon";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { useToast } from "../../../components/ui/Toast";
import { RecordPaymentModal } from "../components/RecordPaymentModal";

const statusPill: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  UNPAID: "bg-tertiary/10 text-tertiary",
  PARTIAL: "bg-tertiary/10 text-tertiary",
  PAID: "bg-secondary/10 text-secondary",
  CANCELLED: "bg-error/10 text-error",
};

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatMoney(n: number, currency = "INR"): string {
  const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency + " ";
  return `${symbol}${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const { show } = useToast();
  const queryClient = useQueryClient();
  const canMutate = session?.role === "ADMIN" || session?.role === "MANAGER" || session?.role === "STAFF";
  const canCancel = session?.role === "ADMIN" || session?.role === "MANAGER";
  const canSeeAudit = session?.role === "ADMIN" || session?.role === "MANAGER";

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoices", "detail", id],
    queryFn: () => invoicesApi.getById(id!),
    enabled: !!id,
  });

  const { data: company } = useQuery({ queryKey: ["company"], queryFn: companyApi.get });

  const { data: auditEntries } = useQuery({
    queryKey: ["audit-logs", "entity", "INVOICE", id],
    queryFn: () => auditLogApi.list(0, 20), // filtered client-side below — see note
    enabled: canSeeAudit && !!id,
  });

  const confirmMutation = useMutation({
    mutationFn: () => invoicesApi.confirmDraft(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      show("Invoice confirmed", "success");
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  const cancelMutation = useMutation({
    mutationFn: () => invoicesApi.cancel(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      show("Invoice cancelled", "success");
      setCancelOpen(false);
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  if (isLoading || !invoice) {
    return <p className="text-body-md text-on-surface-variant">Loading invoice…</p>;
  }

  // AuditController's /entity endpoint requires entityType+entityId as exact
  // query params server-side, but there's no dedicated hook for that combo
  // wired up here yet — filtering the general company feed client-side is a
  // reasonable stopgap for one invoice's handful of events, not for a
  // high-volume company. Upgrade to auditLogApi's /entity endpoint directly
  // if this page needs to scale.
  const relevantAudit = (auditEntries?.content ?? []).filter(
    (e) => e.entityType === "INVOICE" && e.entityId === id
  );

  const invoiceForPaymentModal: InvoiceSummary = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerName: invoice.customerName,
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    currencyCode: invoice.currencyCode,
    totalAmount: invoice.totalAmount,
    balanceDue: invoice.balanceDue,
    paymentStatus: invoice.paymentStatus,
    invoiceType: invoice.invoiceType,
  };

  return (
    <div>
      <nav className="flex items-center gap-1 text-on-surface-variant text-label-md mb-6 print:hidden">
        <Link to="/invoices" className="hover:text-primary transition-colors">Invoices</Link>
        <Icon name="chevron_right" size={16} />
        <span className="text-on-surface font-semibold">{invoice.invoiceNumber}</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 print:hidden">
        <div>
          <h2 className="text-headline-lg text-on-surface">Invoice Detail</h2>
          <p className="text-on-surface-variant text-body-md mt-1">
            Manage and review transaction details for {invoice.invoiceNumber}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="p-2.5 bg-surface-container-high hover:bg-surface-variant border border-outline-variant rounded-lg text-on-surface-variant transition-all active:scale-95"
            title="Print Invoice"
          >
            <Icon name="print" />
          </button>
          {invoice.paymentStatus !== "CANCELLED" && canCancel && (
            <button
              onClick={() => setCancelOpen(true)}
              className="px-4 py-2 bg-error/10 hover:bg-error/20 text-error font-semibold rounded-lg transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Icon name="cancel" size={20} /> Cancel Invoice
            </button>
          )}
          {(invoice.paymentStatus === "UNPAID" || invoice.paymentStatus === "PARTIAL") && canMutate && (
            <button
              onClick={() => setPaymentOpen(true)}
              className="px-4 py-2 bg-surface-container-lowest border border-outline-variant hover:border-primary text-primary font-semibold rounded-lg transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Icon name="payments" size={20} /> Record Payment
            </button>
          )}
          {invoice.paymentStatus === "DRAFT" && canMutate && (
            <button
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
              className="px-4 py-2 bg-primary hover:brightness-110 text-on-primary font-semibold rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Icon name={confirmMutation.isPending ? "sync" : "check_circle"} size={20} className={confirmMutation.isPending ? "animate-spin" : ""} />
              {confirmMutation.isPending ? "Processing…" : "Confirm Draft"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column — the invoice document */}
        <div className="lg:col-span-8 space-y-6">
          <article className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                  <Icon name="account_balance_wallet" filled className="text-on-primary" size={28} />
                </div>
                <div>
                  <h3 className="text-headline-md font-extrabold tracking-tight text-on-surface">{company?.name ?? "—"}</h3>
                  {company?.gstNumber && <p className="text-on-surface-variant text-label-md">GSTIN: {company.gstNumber}</p>}
                </div>
              </div>
              <div className="text-right">
                <h4 className="text-headline-md text-on-surface font-mono">{invoice.invoiceNumber}</h4>
                <div className="flex items-center justify-end gap-2 mt-1">
                  <span className={`px-2 py-0.5 font-bold text-label-md rounded uppercase tracking-wider ${statusPill[invoice.paymentStatus]}`}>
                    {invoice.paymentStatus}
                  </span>
                  <p className="text-on-surface-variant text-label-md italic">Issued: {formatDate(invoice.invoiceDate)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-label-md uppercase text-on-surface-variant font-bold tracking-widest mb-2 opacity-60">Bill To</p>
                <h5 className="text-body-lg font-bold text-on-surface">{invoice.customerName}</h5>
                {invoice.customerGstin && <p className="text-primary font-semibold text-body-md my-0.5">GSTIN: {invoice.customerGstin}</p>}
                {invoice.billingAddress && (
                  <address className="not-italic text-on-surface-variant text-body-md leading-relaxed">{invoice.billingAddress}</address>
                )}
              </div>
              <div className="md:text-right">
                <p className="text-label-md uppercase text-on-surface-variant font-bold tracking-widest mb-2 opacity-60">Company Details</p>
                <p className="text-on-surface font-semibold text-body-md">{company?.name}</p>
                {company?.gstNumber && <p className="text-on-surface-variant text-body-md">GSTIN: {company.gstNumber}</p>}
                {company?.email && <p className="text-on-surface-variant text-body-md">{company.email}</p>}
              </div>
            </div>

            <div className="overflow-x-auto mb-6">
              <table className="w-full text-left">
                <thead className="bg-surface-container-high">
                  <tr>
                    <th className="px-3 py-2 font-bold text-label-md text-on-surface-variant uppercase">Product</th>
                    <th className="px-3 py-2 font-bold text-label-md text-on-surface-variant uppercase text-right">HSN</th>
                    <th className="px-3 py-2 font-bold text-label-md text-on-surface-variant uppercase text-right">Qty</th>
                    <th className="px-3 py-2 font-bold text-label-md text-on-surface-variant uppercase text-right">Price</th>
                    <th className="px-3 py-2 font-bold text-label-md text-on-surface-variant uppercase text-right">CGST</th>
                    <th className="px-3 py-2 font-bold text-label-md text-on-surface-variant uppercase text-right">SGST</th>
                    <th className="px-3 py-2 font-bold text-label-md text-on-surface-variant uppercase text-right">IGST</th>
                    <th className="px-3 py-2 font-bold text-label-md text-on-surface-variant uppercase text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-4">
                        <p className="font-bold text-on-surface">{item.productName}</p>
                        {item.discountPercent > 0 && (
                          <p className="text-on-surface-variant text-label-md">{item.discountPercent}% discount applied</p>
                        )}
                      </td>
                      <td className="px-3 py-4 text-right font-mono text-numeric-table text-on-surface-variant">{item.hsnCode || "—"}</td>
                      <td className="px-3 py-4 text-right font-mono text-numeric-table text-on-surface-variant">{item.quantity} {item.unit}</td>
                      <td className="px-3 py-4 text-right font-mono text-numeric-table text-on-surface-variant">{formatMoney(item.unitPrice, invoice.currencyCode)}</td>
                      <td className="px-3 py-4 text-right font-mono text-numeric-table text-on-surface-variant">{formatMoney(item.cgst, invoice.currencyCode)}</td>
                      <td className="px-3 py-4 text-right font-mono text-numeric-table text-on-surface-variant">{formatMoney(item.sgst, invoice.currencyCode)}</td>
                      <td className="px-3 py-4 text-right font-mono text-numeric-table text-on-surface-variant">{formatMoney(item.igst, invoice.currencyCode)}</td>
                      <td className="px-3 py-4 text-right font-mono text-numeric-table text-on-surface font-bold">{formatMoney(item.lineTotal, invoice.currencyCode)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-end gap-1 border-t border-slate-100 pt-6">
              <div className="grid grid-cols-2 gap-6 w-full max-w-xs text-right">
                <span className="text-on-surface-variant">Subtotal:</span>
                <span className="font-mono text-numeric-table text-on-surface">{formatMoney(invoice.subtotal, invoice.currencyCode)}</span>
                <span className="text-on-surface-variant">Discount:</span>
                <span className="font-mono text-numeric-table text-error">- {formatMoney(invoice.totalDiscount, invoice.currencyCode)}</span>
                <span className="text-on-surface-variant">Taxable Value:</span>
                <span className="font-mono text-numeric-table text-on-surface">{formatMoney(invoice.taxableAmount, invoice.currencyCode)}</span>
                <span className="text-on-surface-variant">CGST:</span>
                <span className="font-mono text-numeric-table text-on-surface">{formatMoney(invoice.totalCgst, invoice.currencyCode)}</span>
                <span className="text-on-surface-variant">SGST:</span>
                <span className="font-mono text-numeric-table text-on-surface">{formatMoney(invoice.totalSgst, invoice.currencyCode)}</span>
                {invoice.totalIgst > 0 && (
                  <>
                    <span className="text-on-surface-variant">IGST:</span>
                    <span className="font-mono text-numeric-table text-on-surface">{formatMoney(invoice.totalIgst, invoice.currencyCode)}</span>
                  </>
                )}
                <span className="text-on-surface-variant">Shipping:</span>
                <span className="font-mono text-numeric-table text-on-surface">{formatMoney(invoice.shippingCharges, invoice.currencyCode)}</span>
                {invoice.roundOff !== 0 && (
                  <>
                    <span className="text-on-surface-variant">Round Off:</span>
                    <span className="font-mono text-numeric-table text-on-surface">{formatMoney(invoice.roundOff, invoice.currencyCode)}</span>
                  </>
                )}
                <div className="col-span-2 my-2 border-t border-dashed border-outline-variant" />
                <span className="text-on-surface font-bold text-headline-md">Grand Total:</span>
                <span className="font-mono text-headline-md text-primary font-black">{formatMoney(invoice.totalAmount, invoice.currencyCode)}</span>
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-6 pt-4 border-t border-slate-100 text-on-surface-variant text-label-md italic">
                Notes: {invoice.notes}
              </div>
            )}
          </article>
        </div>

        {/* Right column — payment overview + activity */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6">
            <h4 className="text-body-lg font-bold text-on-surface mb-4">Payment Overview</h4>
            <div className="flex flex-col gap-4">
              <div
                className={`p-4 rounded-lg flex justify-between items-center border ${
                  invoice.balanceDue > 0 ? "bg-error/5 border-error/10" : "bg-secondary/5 border-secondary/10"
                }`}
              >
                <div>
                  <p className={`text-label-md font-semibold uppercase ${invoice.balanceDue > 0 ? "text-error/80" : "text-secondary"}`}>
                    {invoice.balanceDue > 0 ? "Balance Due" : "Fully Paid"}
                  </p>
                  <p className={`text-headline-md font-black ${invoice.balanceDue > 0 ? "text-error" : "text-secondary"}`}>
                    {formatMoney(invoice.balanceDue, invoice.currencyCode)}
                  </p>
                </div>
                <Icon
                  name={invoice.balanceDue > 0 ? "pending_actions" : "task_alt"}
                  size={32}
                  className={invoice.balanceDue > 0 ? "text-error opacity-20" : "text-secondary opacity-20"}
                />
              </div>

              <div className="space-y-2">
                <p className="text-on-surface-variant text-label-md font-bold uppercase tracking-wide">History</p>
                {invoice.payments.length === 0 ? (
                  <div className="py-6 flex flex-col items-center justify-center text-center opacity-60">
                    <Icon name="receipt_long" size={36} className="text-outline mb-2" />
                    <p className="text-body-md">No payments recorded yet.</p>
                    {canMutate && invoice.paymentStatus !== "CANCELLED" && invoice.paymentStatus !== "DRAFT" && (
                      <button onClick={() => setPaymentOpen(true)} className="mt-2 text-primary font-semibold text-label-md hover:underline">
                        Record first payment
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {invoice.payments.map((p) => (
                      <div key={p.id} className="flex justify-between items-center text-body-md py-1.5 border-b border-outline-variant/30 last:border-0">
                        <div>
                          <p className="font-medium text-on-surface">{formatMoney(p.amount, p.currencyCode)}</p>
                          <p className="text-label-md text-on-surface-variant">{p.paymentMethod.replace("_", " ")} · {formatDate(p.paymentDate)}</p>
                        </div>
                        {p.transactionReference && <span className="text-label-md font-mono text-on-surface-variant">{p.transactionReference}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {canSeeAudit && (
            <div className="bg-surface-container rounded-xl p-6">
              <h4 className="text-body-lg font-bold text-on-surface mb-4">Activity Log</h4>
              {relevantAudit.length === 0 ? (
                <p className="text-body-md text-on-surface-variant">
                  No logged activity yet — only cancellation is currently audit-logged for invoices.
                </p>
              ) : (
                <div className="space-y-3">
                  {relevantAudit.map((entry, i) => (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        {i < relevantAudit.length - 1 && <div className="w-px flex-1 bg-outline-variant/30 my-1" />}
                      </div>
                      <div>
                        <p className="text-body-md font-semibold text-on-surface">{entry.description}</p>
                        <p className="text-label-md text-on-surface-variant">{formatDateTime(entry.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <RecordPaymentModal invoice={paymentOpen ? invoiceForPaymentModal : null} onClose={() => setPaymentOpen(false)} />
      <ConfirmDialog
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => cancelMutation.mutate()}
        title="Cancel this invoice?"
        description={`${invoice.invoiceNumber} will be cancelled — stock and the customer's balance will be reversed. This can't be undone.`}
        confirmLabel="Cancel Invoice"
        tone="danger"
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}