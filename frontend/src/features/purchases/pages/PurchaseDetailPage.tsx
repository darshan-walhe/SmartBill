import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { purchasesApi, type PurchaseSummary } from "../../../api/purchases";
import { suppliersApi } from "../../../api/suppliers";
import { companyApi } from "../../../api/company";
import { useAuth } from "../../../context/AuthContext";
import { Icon } from "../../../components/Icon";
import { useToast } from "../../../components/ui/Toast";
import { RecordSupplierPaymentModal } from "../components/RecordSupplierPaymentModal";
import { PurchaseReturnModal } from "../components/PurchaseReturnModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";



const statusPill: Record<string, string> = {
    DRAFT: "bg-surface-variant text-on-surface-variant",
    UNPAID: "bg-error/10 text-error",
    PARTIAL: "bg-tertiary/10 text-tertiary",
    PAID: "bg-secondary/10 text-secondary",
};

function formatDate(iso?: string): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function formatMoney(n: number, currency = "INR"): string {
    const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency + " ";
    return `${symbol}${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}




export function PurchaseDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { session } = useAuth();
    const { show } = useToast();
    const queryClient = useQueryClient();
    const canMutate = session?.role === "ADMIN" || session?.role === "MANAGER" || session?.role === "STAFF";
    const canPay = session?.role === "ADMIN" || session?.role === "MANAGER" || session?.role === "ACCOUNTANT";
    const canReturn = session?.role === "ADMIN" || session?.role === "MANAGER";

    const [paymentOpen, setPaymentOpen] = useState(false);
    const [returnOpen, setReturnOpen] = useState(false);

    const invoiceRef = useRef<HTMLDivElement>(null);
    const [downloading, setDownloading] = useState(false);

    function formatMoneyPdf(n: number, currency = "INR"): string {
        const prefix = currency === "INR" ? "Rs. " : currency === "USD" ? "$ " : currency === "EUR" ? "EUR " : currency + " ";
        return `${prefix}${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    async function handleDownload() {
        if (!purchase) return;
        setDownloading(true);
        try {
            const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 40;
            let y = 50;

            // Header — company (billing entity)
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text(company?.name ?? "Company", margin, y);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            if (company?.gstNumber) {
                y += 16;
                doc.text(`GSTIN: ${company.gstNumber}`, margin, y);
            }

            // Purchase # + status, right aligned
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text(purchase.purchaseNumber, pageWidth - margin, 50, { align: "right" });
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text(purchase.paymentStatus, pageWidth - margin, 68, { align: "right" });
            doc.text(`Issued: ${formatDate(purchase.purchaseDate)}`, pageWidth - margin, 84, { align: "right" });
            if (purchase.dueDate) {
                doc.text(`Due: ${formatDate(purchase.dueDate)}`, pageWidth - margin, 100, { align: "right" });
            }

            y += 40;
            doc.setDrawColor(220);
            doc.line(margin, y, pageWidth - margin, y);
            y += 24;

            // Supplier details block
            doc.setFontSize(9);
            doc.setTextColor(120);
            doc.text("SUPPLIER DETAILS", margin, y);
            doc.setTextColor(0);
            y += 16;

            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text(purchase.supplierName, margin, y);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            y += 16;

            if (purchase.supplierGstin) {
                doc.text(`GSTIN: ${purchase.supplierGstin}`, margin, y);
                y += 14;
            }
            if (supplier?.address) {
                doc.text(supplier.address, margin, y);
                y += 14;
            }
            const cityState = [supplier?.city, supplier?.state].filter(Boolean).join(", ");
            if (cityState) {
                doc.text(cityState, margin, y);
                y += 14;
            }
            if (supplier?.email) {
                doc.text(supplier.email, margin, y);
                y += 14;
            }
            if (supplier?.mobile) {
                doc.text(supplier.mobile, margin, y);
                y += 14;
            }

            if (purchase.isReturn) {
                y += 10;
                doc.setFillColor(255, 247, 230);
                doc.rect(margin, y - 12, pageWidth - margin * 2, 34, "F");
                doc.setFontSize(9);
                doc.text(
                    `Return against #${originalPurchase?.purchaseNumber ?? purchase.returnOfPurchaseId}`,
                    margin + 8,
                    y
                );
                if (purchase.returnReason) {
                    y += 14;
                    doc.text(`Reason: ${purchase.returnReason}`, margin + 8, y);
                }
                y += 24;
            }

            y += 16;

            // Line items table
            autoTable(doc, {
                startY: y,
                margin: { left: margin, right: margin },
                head: [["Product / Service", "Qty", "Unit Price", "Tax", "Line Total"]],
                body: purchase.items.map((item) => [
                    item.productName,
                    `${item.quantity} ${item.unit ?? ""}`.trim(),
                    formatMoneyPdf(item.unitPrice, purchase.currencyCode),
                    `${item.taxRate}%`,
                    formatMoneyPdf(item.lineTotal, purchase.currencyCode),
                ]),
                styles: { fontSize: 9, cellPadding: 6, valign: "middle" },
                headStyles: { fillColor: [240, 240, 240], textColor: 40, fontStyle: "bold", halign: "left" },
                columnStyles: {
                    0: { cellWidth: 200, halign: "left" },
                    1: { cellWidth: 60, halign: "center" },
                    2: { cellWidth: 90, halign: "right" },
                    3: { cellWidth: 50, halign: "center" },
                    4: { cellWidth: 95, halign: "right" },
                },
                didDrawCell: (data) => {
                    // Draw HSN code as a smaller gray line beneath the product name,
                    // instead of cramming it into the same text block at the same size.
                    if (data.column.index === 0 && data.section === "body") {
                        const item = purchase.items[data.row.index];
                        if (item.hsnCode) {
                            doc.setFontSize(7.5);
                            doc.setTextColor(140);
                            doc.text(`HSN: ${item.hsnCode}`, data.cell.x + 6, data.cell.y + data.cell.height - 5);
                            doc.setFontSize(9);
                            doc.setTextColor(0);
                        }
                    }
                },
            });

            // @ts-expect-error — lastAutoTable is attached by the plugin at runtime
            y = doc.lastAutoTable.finalY + 30;

            // Check for page overflow before totals block
            const pageHeight = doc.internal.pageSize.getHeight();
            if (y > pageHeight - 160) {
                doc.addPage();
                y = 50;
            }

            // Notes (left) + totals (right)
            const notesWidth = 220;
            doc.setFontSize(9);
            doc.setTextColor(120);
            doc.text("NOTES", margin, y);
            doc.setTextColor(0);
            doc.setFontSize(9);
            const notesText = purchase.notes || "No internal notes recorded for this purchase.";
            const wrappedNotes = doc.splitTextToSize(notesText, notesWidth);
            doc.text(wrappedNotes, margin, y + 14);

            const totalsX = pageWidth - margin - 220;
            let ty = y;

            function totalRow(label: string, value: string, bold = false) {
                doc.setFont("helvetica", bold ? "bold" : "normal");
                doc.setFontSize(bold ? 11 : 10);
                doc.text(label, totalsX, ty);
                doc.text(value, pageWidth - margin, ty, { align: "right" });
                ty += bold ? 18 : 16;
            }

            totalRow("Subtotal", formatMoney(purchase.subtotal, purchase.currencyCode));
            totalRow("CGST", formatMoney(purchase.totalCgst, purchase.currencyCode));
            totalRow("SGST", formatMoney(purchase.totalSgst, purchase.currencyCode));
            if (purchase.totalIgst > 0) {
                totalRow("IGST", formatMoney(purchase.totalIgst, purchase.currencyCode));
            }
            ty += 4;
            doc.setDrawColor(220);
            doc.line(totalsX, ty - 10, pageWidth - margin, ty - 10);
            totalRow("Grand Total", formatMoney(purchase.totalAmount, purchase.currencyCode), true);
            totalRow("Amount Paid", formatMoney(purchase.totalPaid, purchase.currencyCode));
            totalRow("Balance Due", formatMoney(purchase.balanceDue, purchase.currencyCode));

            doc.save(`${purchase.purchaseNumber}.pdf`);
        } catch (err) {
            console.error("Failed to generate PDF", err);
            show("Failed to generate PDF. Please try again.", "danger");
        } finally {
            setDownloading(false);
        }
    }



    const { data: purchase, isLoading } = useQuery({
        queryKey: ["purchases", "detail", id],
        queryFn: () => purchasesApi.getById(id!),
        enabled: !!id,
    });

    const { data: supplier } = useQuery({
        queryKey: ["suppliers", "detail", purchase?.supplierId],
        queryFn: () => suppliersApi.getById(purchase!.supplierId),
        enabled: !!purchase?.supplierId,
    });

    const { data: originalPurchase } = useQuery({
        queryKey: ["purchases", "detail", purchase?.returnOfPurchaseId],
        queryFn: () => purchasesApi.getById(purchase!.returnOfPurchaseId!),
        enabled: !!purchase?.returnOfPurchaseId,
    });

    const { data: company } = useQuery({ queryKey: ["company"], queryFn: companyApi.get });

    const confirmMutation = useMutation({
        mutationFn: () => purchasesApi.confirmDraft(id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["purchases"] });
            show("Purchase confirmed — stock has been added", "success");
        },
        onError: (err: Error) => show(err.message, "danger"),
    });

    if (isLoading || !purchase) {
        return <p className="text-body-md text-on-surface-variant">Loading purchase…</p>;
    }

    const purchaseForPaymentModal: PurchaseSummary = {
        id: purchase.id,
        purchaseNumber: purchase.purchaseNumber,
        supplierName: purchase.supplierName,
        purchaseDate: purchase.purchaseDate,
        dueDate: purchase.dueDate,
        totalAmount: purchase.totalAmount,
        balanceDue: purchase.balanceDue,
        paymentStatus: purchase.paymentStatus,
        isReturn: purchase.isReturn,
    };

    // Input Tax Credit — the GST you paid on this purchase, which is a real,
    // literal figure (totalTax), not a fabricated metric. "% of monthly
    // budget" from the mockup was dropped — nothing tracks a purchasing
    // budget anywhere in this system, so there'd be no honest way to compute it.
    const itc = purchase.totalTax;

    return (
        <div>
            <nav className="flex items-center gap-1 text-outline text-label-md mb-6 print:hidden">
                <Link to="/purchases" className="hover:text-primary transition-colors">Purchases</Link>
                <Icon name="chevron_right" size={14} />
                <span className="text-on-surface-variant font-medium">{purchase.purchaseNumber}</span>
            </nav>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 print:hidden">
                <div>
                    <div className="flex items-center gap-4">
                        <h2 className="text-headline-lg text-on-surface">{purchase.purchaseNumber}</h2>
                        <span className={`px-3 py-1 rounded-full text-label-md font-bold uppercase tracking-wider ${statusPill[purchase.paymentStatus]}`}>
                            {purchase.paymentStatus}
                        </span>
                    </div>
                    <p className="text-body-md text-outline mt-1">
                        Issued on {formatDate(purchase.purchaseDate)}
                        {purchase.dueDate && ` • Due ${formatDate(purchase.dueDate)}`}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg text-body-md font-medium hover:bg-surface-container-high transition-all active:scale-95 disabled:opacity-50"
                    >
                        <Icon name={downloading ? "sync" : "download"} size={20} className={downloading ? "animate-spin" : ""} />
                        {downloading ? "Preparing…" : "Download"}
                    </button>
                    {!purchase.isReturn && canReturn && purchase.paymentStatus !== "DRAFT" && (
                        <button
                            onClick={() => setReturnOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg text-body-md font-medium hover:bg-surface-container-high transition-all active:scale-95"
                        >
                            <Icon name="assignment_return" size={20} /> Create Return
                        </button>
                    )}
                    {purchase.paymentStatus === "DRAFT" && canMutate && (
                        <button
                            onClick={() => confirmMutation.mutate()}
                            disabled={confirmMutation.isPending}
                            className="bg-primary text-on-primary px-6 py-2 rounded-lg text-body-md font-semibold hover:shadow-md transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                        >
                            <Icon name={confirmMutation.isPending ? "sync" : "check_circle"} size={20} className={confirmMutation.isPending ? "animate-spin" : ""} />
                            {confirmMutation.isPending ? "Processing…" : "Confirm Draft"}
                        </button>
                    )}
                    {purchase.balanceDue > 0 && purchase.paymentStatus !== "DRAFT" && canPay && (
                        <button
                            onClick={() => setPaymentOpen(true)}
                            className="bg-primary text-on-primary px-6 py-2 rounded-lg text-body-md font-semibold hover:shadow-md transition-all active:scale-95"
                        >
                            Record Payment
                        </button>
                    )}
                </div>
            </div>

            {purchase.isReturn && (
                <div className="mb-8 p-4 bg-tertiary/10 text-on-surface border border-tertiary/20 rounded-xl flex items-start gap-4">
                    <Icon name="info" className="text-tertiary" />
                    <div>
                        <p className="font-semibold text-body-lg">
                            This is a return against purchase #{originalPurchase?.purchaseNumber ?? purchase.returnOfPurchaseId}
                        </p>
                        {purchase.returnReason && <p className="text-body-md opacity-80">Reason: {purchase.returnReason}</p>}
                    </div>
                </div>
            )}

            <div ref={invoiceRef} className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12 border-b border-outline-variant/50">
                    <div>
                        <p className="text-label-md font-bold text-outline uppercase tracking-widest mb-4">Supplier Details</p>
                        <h3 className="text-headline-md text-on-surface mb-2">{purchase.supplierName}</h3>
                        <div className="space-y-1 text-body-md text-on-surface-variant">
                            {purchase.supplierGstin && (
                                <div className="flex items-center gap-2">
                                    <span className="text-outline font-medium">GSTIN:</span>
                                    <span className="font-mono font-semibold text-on-surface">{purchase.supplierGstin}</span>
                                </div>
                            )}
                            {supplier?.address && <p>{supplier.address}</p>}
                            {(supplier?.city || supplier?.state) && <p>{[supplier?.city, supplier?.state].filter(Boolean).join(", ")}</p>}
                            {supplier?.email && (
                                <p className="pt-2 flex items-center gap-2"><Icon name="mail" size={18} /> {supplier.email}</p>
                            )}
                            {supplier?.mobile && (
                                <p className="flex items-center gap-2"><Icon name="call" size={18} /> {supplier.mobile}</p>
                            )}
                        </div>
                    </div>
                    <div className="md:text-right flex flex-col md:items-end justify-between">
                        <div className="mt-4">
                            <p className="text-label-md font-bold text-outline uppercase tracking-widest mb-1">Billing Entity</p>
                            <p className="font-bold text-primary">{company?.name}</p>
                            {company?.gstNumber && <p className="text-body-md text-on-surface-variant">GSTIN: {company.gstNumber}</p>}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-container-low text-on-surface-variant border-b border-outline-variant">
                                <th className="px-8 py-4 text-label-md font-bold uppercase tracking-wider">Product / Service</th>
                                <th className="px-4 py-4 text-label-md font-bold uppercase tracking-wider text-center">Qty</th>
                                <th className="px-4 py-4 text-label-md font-bold uppercase tracking-wider text-right">Unit Price</th>
                                <th className="px-4 py-4 text-label-md font-bold uppercase tracking-wider text-center">Tax Rate</th>
                                <th className="px-8 py-4 text-label-md font-bold uppercase tracking-wider text-right">Line Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/30">
                            {purchase.items.map((item) => (
                                <tr key={item.id} className="hover:bg-surface-bright transition-colors">
                                    <td className="px-8 py-5">
                                        <p className="text-body-md font-semibold text-on-surface">{item.productName}</p>
                                        {item.hsnCode && <p className="text-label-md text-outline">HSN: {item.hsnCode}</p>}
                                    </td>
                                    <td className="px-4 py-5 text-center font-mono text-numeric-table text-on-surface-variant">{item.quantity} {item.unit}</td>
                                    <td className="px-4 py-5 text-right font-mono text-numeric-table text-on-surface-variant">{formatMoney(item.unitPrice, purchase.currencyCode)}</td>
                                    <td className="px-4 py-5 text-center">
                                        <span className="px-2 py-0.5 bg-surface-container-highest text-on-surface-variant rounded text-[11px] font-bold">{item.taxRate}% GST</span>
                                    </td>
                                    <td className="px-8 py-5 text-right font-mono text-numeric-table font-semibold text-on-surface">{formatMoney(item.lineTotal, purchase.currencyCode)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-8 flex flex-col md:flex-row justify-between gap-8 bg-surface-bright/50">
                    <div className="max-w-md">
                        <p className="text-label-md font-bold text-outline uppercase tracking-widest mb-2">Notes</p>
                        <p className="text-body-md text-on-surface-variant leading-relaxed">
                            {purchase.notes || "No internal notes recorded for this purchase."}
                        </p>
                    </div>
                    <div className="flex-1 max-w-sm ml-auto space-y-3">
                        <div className="flex justify-between items-center text-body-md text-on-surface-variant">
                            <span>Subtotal</span>
                            <span className="font-mono">{formatMoney(purchase.subtotal, purchase.currencyCode)}</span>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Tax Breakdown</p>
                            <div className="flex justify-between items-center text-label-md text-on-surface-variant italic">
                                <span>CGST</span>
                                <span className="font-mono">{formatMoney(purchase.totalCgst, purchase.currencyCode)}</span>
                            </div>
                            <div className="flex justify-between items-center text-label-md text-on-surface-variant italic">
                                <span>SGST</span>
                                <span className="font-mono">{formatMoney(purchase.totalSgst, purchase.currencyCode)}</span>
                            </div>
                            {purchase.totalIgst > 0 && (
                                <div className="flex justify-between items-center text-label-md text-on-surface-variant italic">
                                    <span>IGST</span>
                                    <span className="font-mono">{formatMoney(purchase.totalIgst, purchase.currencyCode)}</span>
                                </div>
                            )}
                        </div>
                        <div className="h-px bg-outline-variant/30 my-4" />
                        <div className="p-4 bg-primary-container/10 border border-primary-container/20 rounded-lg">
                            <div className="flex justify-between items-center">
                                <span className="text-body-lg font-bold text-primary">Grand Total</span>
                                <span className="text-headline-md font-bold text-primary font-mono">{formatMoney(purchase.totalAmount, purchase.currencyCode)}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center px-4 text-label-md text-secondary font-bold uppercase tracking-wider">
                            <span>Amount Paid</span>
                            <span className="font-mono">{formatMoney(purchase.totalPaid, purchase.currencyCode)}</span>
                        </div>
                        <div className="flex justify-between items-center px-4 text-label-md text-outline">
                            <span>Balance Due</span>
                            <span className="font-mono">{formatMoney(purchase.balanceDue, purchase.currencyCode)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6 print:hidden">
                <div className="lg:col-span-2 bg-white rounded-xl border border-outline-variant p-6">
                    <h4 className="text-body-lg font-bold text-on-surface mb-4 flex items-center gap-2">
                        <Icon name="history" className="text-primary" />
                        Purchase Activity Log
                    </h4>
                    <p className="text-body-md text-on-surface-variant">
                        Purchase actions aren't currently audit-logged on the backend — this timeline isn't
                        available yet for purchases the way it partially is for invoice cancellations.
                    </p>
                </div>
                <div className="bg-primary text-on-primary rounded-xl p-6 shadow-md flex flex-col justify-between relative overflow-hidden">
                    <div>
                        <h4 className="text-body-lg font-bold mb-2">Quick Summary</h4>
                    </div>
                    <div className="mt-8 space-y-4">
                        <div className="flex items-end justify-between border-b border-on-primary/10 pb-2">
                            <span className="text-label-md opacity-70">Inventory Value {purchase.isReturn ? "Decrease" : "Increase"}</span>
                            <span className="text-headline-md font-bold">{purchase.isReturn ? "-" : "+"}{formatMoney(purchase.subtotal, purchase.currencyCode)}</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <span className="text-label-md opacity-70">Tax Credit (ITC)</span>
                            <span className="text-headline-md font-bold">{formatMoney(itc, purchase.currencyCode)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <RecordSupplierPaymentModal purchase={paymentOpen ? purchaseForPaymentModal : null} onClose={() => setPaymentOpen(false)} />
            <PurchaseReturnModal purchase={returnOpen ? purchase : null} onClose={() => setReturnOpen(false)} />
        </div>
    );
}