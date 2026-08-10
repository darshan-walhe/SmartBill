import { useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "../../../lib/useDebounce";
import { suppliersApi, type SupplierSummary } from "../../../api/suppliers";
import { productsApi, type ProductSummary } from "../../../api/products";
import { purchasesApi, type PurchaseSaveRequest } from "../../../api/purchases";
import { useAuth } from "../../../context/AuthContext";
import { Icon } from "../../../components/Icon";
import { useToast } from "../../../components/ui/Toast";

interface LineItemForm {
    key: string;
    productId: string;
    productLabel: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
}

interface BuilderForm {
    supplierId: string;
    supplierLabel: string;
    supplierInvoiceNumber: string;
    purchaseDate: string;
    dueDate: string;
    currencyCode: string;
    exchangeRate?: number;
    items: LineItemForm[];
    notes: string;
}

const todayISO = new Date().toISOString().slice(0, 10);

function formatINR(n: number): string {
    return `₹ ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function emptyLine(): LineItemForm {
    return { key: crypto.randomUUID(), productId: "", productLabel: "", quantity: 1, unitPrice: 0, taxRate: 0 };
}

export function PurchaseBuilderPage() {
    const { session } = useAuth();
    const { show } = useToast();
    const navigate = useNavigate();

    // Same restriction as invoices — POST /api/purchases is
    // hasAnyRole('ADMIN','MANAGER','STAFF'), ACCOUNTANT can't create these.
    const canCreate = session?.role === "ADMIN" || session?.role === "MANAGER" || session?.role === "STAFF";

    const { control, register, handleSubmit, watch, setValue } = useForm<BuilderForm>({
        defaultValues: {
            purchaseDate: todayISO,
            dueDate: "",
            currencyCode: "INR",
            items: [emptyLine()],
            notes: "",
        },
    });

    const { fields, append, remove, update } = useFieldArray({ control, name: "items" });
    const watchedItems = watch("items");
    const watchedCurrency = watch("currencyCode");

    const [supplierSearch, setSupplierSearch] = useState("");
    const debouncedSupplierSearch = useDebounce(supplierSearch, 300);
    const { data: supplierResults } = useQuery({
        queryKey: ["suppliers", "search", debouncedSupplierSearch],
        queryFn: () => suppliersApi.list(debouncedSupplierSearch, 0, 8),
        enabled: debouncedSupplierSearch.length > 1,
    });

    const [productSearchByRow, setProductSearchByRow] = useState<Record<string, string>>({});

    const totals = useMemo(() => {
        let subtotal = 0;
        let totalTax = 0;
        for (const item of watchedItems ?? []) {
            const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
            subtotal += lineTotal;
            totalTax += lineTotal * ((item.taxRate || 0) / 100);
        }
        return { subtotal, totalTax, grandTotal: subtotal + totalTax };
    }, [watchedItems]);

    function buildRequest(data: BuilderForm, saveAsDraft: boolean): PurchaseSaveRequest {
        return {
            supplierId: data.supplierId,
            supplierInvoiceNumber: data.supplierInvoiceNumber || undefined,
            purchaseDate: data.purchaseDate,
            dueDate: data.dueDate || undefined,
            currencyCode: data.currencyCode,
            exchangeRate: data.currencyCode !== "INR" ? data.exchangeRate : undefined,
            items: data.items
                .filter((i) => i.productId)
                .map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, taxRate: i.taxRate || undefined })),
            notes: data.notes || undefined,
            saveAsDraft,
        };
    }

    const mutation = useMutation({
        mutationFn: (vars: { data: BuilderForm; saveAsDraft: boolean }) =>
            purchasesApi.create(buildRequest(vars.data, vars.saveAsDraft)),
        onSuccess: (purchase) => {
            show(purchase.paymentStatus === "DRAFT" ? "Saved as draft" : "Purchase created and confirmed", "success");
            navigate(`/purchases/${purchase.id}`);
        },
        onError: (err: Error) => show(err.message, "danger"),
    });

    function selectProduct(index: number, product: ProductSummary) {
        update(index, {
            ...fields[index],
            productId: product.id,
            productLabel: `${product.name}${product.sku ? ` (SKU: ${product.sku})` : ""}`,
            unitPrice: product.salePrice, // purchase price isn't in ProductSummary — sale price is a starting point, buyer edits it
            taxRate: product.taxRate ?? 0,
        });
        setProductSearchByRow((prev) => ({ ...prev, [fields[index].key]: "" }));
    }

    if (!canCreate) {
        return (
            <div className="max-w-2xl mx-auto bg-white rounded-xl border border-outline-variant p-10 text-center">
                <Icon name="block" className="text-error mx-auto mb-3" size={32} />
                <h2 className="text-headline-md text-on-surface mb-2">Your role can't record purchases</h2>
                <p className="text-body-md text-on-surface-variant">
                    {session?.role} accounts can view purchases, but only ADMIN, MANAGER, or STAFF can create them.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            <nav className="flex items-center gap-1 text-on-surface-variant text-label-md mb-2">
                <span>Purchases</span>
                <Icon name="chevron_right" size={16} />
                <span className="text-on-surface font-semibold">New Purchase Record</span>
            </nav>
            <h1 className="text-headline-lg text-on-surface mb-6">Record New Purchase</h1>

            <div className="space-y-6">
                {/* Header fields */}
                <section className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-5 space-y-1 relative">
                            <label className="text-label-md text-on-surface-variant">Supplier</label>
                            <div className="relative">
                                <Icon name="business_center" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                                <input
                                    className="w-full pl-10 pr-4 py-3 border border-outline-variant rounded-lg text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                    placeholder="Search or select supplier..."
                                    value={watch("supplierLabel") || supplierSearch}
                                    onChange={(e) => { setSupplierSearch(e.target.value); setValue("supplierLabel", e.target.value); setValue("supplierId", ""); }}
                                />
                            </div>
                            {supplierResults && supplierResults.content.length > 0 && !watch("supplierId") && (
                                <div className="absolute z-10 mt-1 w-full bg-surface border border-outline-variant rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                    {supplierResults.content.map((s: SupplierSummary) => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => { setValue("supplierId", s.id); setValue("supplierLabel", s.name); }}
                                            className="w-full text-left px-4 py-2 hover:bg-surface-container-low text-body-md"
                                        >
                                            {s.name} <span className="text-on-surface-variant text-label-md">{s.gstin || ""}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="md:col-span-3 space-y-1">
                            <label className="text-label-md text-on-surface-variant">Supplier Invoice Number</label>
                            <input className="w-full px-4 py-3 border border-outline-variant rounded-lg text-body-md focus:border-primary focus:ring-1 focus:ring-primary" placeholder="e.g. VEN/2024/001" {...register("supplierInvoiceNumber")} />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-label-md text-on-surface-variant">Purchase Date</label>
                            <input type="date" className="w-full px-4 py-3 border border-outline-variant rounded-lg text-body-md focus:border-primary focus:ring-1 focus:ring-primary" {...register("purchaseDate", { required: true })} />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-label-md text-on-surface-variant">Due Date</label>
                            <input type="date" className="w-full px-4 py-3 border border-outline-variant rounded-lg text-body-md focus:border-primary focus:ring-1 focus:ring-primary" {...register("dueDate")} />
                        </div>
                        <div className="md:col-span-3 space-y-1">
                            <label className="text-label-md text-on-surface-variant">Currency</label>
                            <select className="w-full px-4 py-3 border border-outline-variant rounded-lg text-body-md focus:border-primary focus:ring-1 focus:ring-primary" {...register("currencyCode")}>
                                <option value="INR">INR - Indian Rupee</option>
                                <option value="USD">USD - US Dollar</option>
                                <option value="EUR">EUR - Euro</option>
                                <option value="GBP">GBP - British Pound</option>
                            </select>
                        </div>
                        {watchedCurrency !== "INR" && (
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-label-md text-on-surface-variant">Exchange Rate</label>
                                <input type="number" step="0.01" className="w-full px-4 py-3 border border-outline-variant rounded-lg text-body-md focus:border-primary focus:ring-1 focus:ring-primary" {...register("exchangeRate", { valueAsNumber: true })} />
                            </div>
                        )}
                    </div>
                </section>

                {/* Line items */}
                <section className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
                    <div className="bg-surface-container px-6 py-3 border-b border-outline-variant flex items-center justify-between">
                        <h3 className="text-headline-md text-on-surface">Purchase Items</h3>
                        <span className="text-on-surface-variant text-label-md uppercase tracking-widest">Client-Side Estimate</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-surface-container-low text-left">
                                    <th className="px-6 py-4 text-label-md text-on-surface-variant w-1/3">Product / Service</th>
                                    <th className="px-3 py-4 text-label-md text-on-surface-variant text-right">Qty</th>
                                    <th className="px-3 py-4 text-label-md text-on-surface-variant text-right">Unit Price</th>
                                    <th className="px-3 py-4 text-label-md text-on-surface-variant text-right">GST %</th>
                                    <th className="px-3 py-4 text-label-md text-on-surface-variant text-right">Total</th>
                                    <th className="px-6 py-4 w-12" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant">
                                {fields.map((field, index) => {
                                    const item = watchedItems?.[index];
                                    const lineTotal = (item?.quantity || 0) * (item?.unitPrice || 0);
                                    const rowSearch = productSearchByRow[field.key] ?? "";

                                    return (
                                        <tr key={field.key} className="group hover:bg-surface-container-lowest transition-colors">
                                            <td className="px-6 py-4 relative">
                                                <input
                                                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low focus:bg-white focus:ring-2 focus:ring-primary text-body-md outline-none transition-all"
                                                    placeholder="Search product..."
                                                    value={item?.productLabel && !rowSearch ? item.productLabel : rowSearch}
                                                    onChange={(e) => {
                                                        setProductSearchByRow((prev) => ({ ...prev, [field.key]: e.target.value }));
                                                        update(index, { ...field, ...item, productId: "", productLabel: "" });
                                                    }}
                                                />
                                                <PurchaseProductSuggestions search={rowSearch} onSelect={(p) => selectProduct(index, p)} />
                                            </td>
                                            <td className="px-3 py-4">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    className="w-20 text-right px-3 py-2 rounded-lg bg-surface-container-low focus:bg-white focus:ring-2 focus:ring-primary tabular-nums text-body-md outline-none"
                                                    {...register(`items.${index}.quantity`, { valueAsNumber: true, min: 1 })}
                                                />
                                            </td>
                                            <td className="px-3 py-4">
                                                <div className="flex items-center justify-end">
                                                    <span className="mr-2 text-on-surface-variant">₹</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min={0}
                                                        className="w-32 text-right px-3 py-2 rounded-lg bg-surface-container-low focus:bg-white focus:ring-2 focus:ring-primary tabular-nums text-body-md outline-none"
                                                        {...register(`items.${index}.unitPrice`, { required: true, valueAsNumber: true, min: 0 })}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-3 py-4">
                                                <input
                                                    type="number"
                                                    placeholder="18"
                                                    className="w-20 text-right px-3 py-2 rounded-lg bg-surface-container-low focus:bg-white focus:ring-2 focus:ring-primary tabular-nums text-body-md outline-none"
                                                    {...register(`items.${index}.taxRate`, { valueAsNumber: true })}
                                                />
                                            </td>
                                            <td className="px-3 py-4 text-right font-mono tabular-nums font-bold">
                                                {item?.productId ? formatINR(lineTotal) : <span className="text-on-surface-variant italic font-normal">₹0.00</span>}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => fields.length > 1 && remove(index)}
                                                    className="text-error opacity-40 group-hover:opacity-100 hover:scale-110 transition-all"
                                                    aria-label="Remove line"
                                                >
                                                    <Icon name="delete" size={20} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-6 border-t border-outline-variant">
                        <button
                            type="button"
                            onClick={() => append(emptyLine())}
                            className="flex items-center gap-2 text-primary font-bold hover:underline transition-all"
                        >
                            <Icon name="add_circle" />
                            Add Item
                        </button>
                    </div>
                </section>

                {/* Notes + totals */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-7">
                        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm h-full">
                            <label className="text-label-md text-on-surface-variant mb-2 block">Internal Notes / Comments</label>
                            <textarea
                                rows={6}
                                className="w-full px-4 py-3 border border-outline-variant rounded-lg text-body-md focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                                placeholder="Add any specific details regarding this purchase, delivery instructions, or contract references..."
                                {...register("notes")}
                            />
                        </div>
                    </div>
                    <div className="md:col-span-5">
                        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm space-y-3">
                            <div className="flex justify-between items-center text-on-surface-variant">
                                <span className="text-label-md">Subtotal</span>
                                <span className="font-mono tabular-nums text-body-lg">{formatINR(totals.subtotal)}</span>
                            </div>
                            <div className="flex justify-between items-center text-on-surface-variant">
                                <span className="text-label-md">Estimated Tax</span>
                                <span className="font-mono tabular-nums text-body-lg">{formatINR(totals.totalTax)}</span>
                            </div>
                            <div className="h-px bg-outline-variant" />
                            <div className="flex justify-between items-center bg-primary-container/10 p-3 rounded-lg">
                                <span className="text-headline-md text-primary font-bold">Grand Total</span>
                                <span className="text-headline-md text-primary font-black tabular-nums">{formatINR(totals.grandTotal)}</span>
                            </div>
                            <div className="flex items-start gap-2 bg-surface-container p-2 rounded-lg">
                                <Icon name="info" className="text-primary" size={18} />
                                <p className="text-[11px] text-on-surface-variant leading-tight">
                                    Estimated totals — final GST split (CGST/SGST/IGST) is calculated server-side based on supplier location.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sticky footer actions */}
                <div className="sticky bottom-4 bg-surface-container-lowest/90 backdrop-blur-md p-3 rounded-2xl border border-outline-variant shadow-lg flex justify-end items-center gap-3">
                    <button
                        type="button"
                        onClick={handleSubmit((data) => mutation.mutate({ data, saveAsDraft: true }))}
                        disabled={mutation.isPending}
                        className="px-6 py-3 text-primary font-bold border border-primary/20 rounded-xl hover:bg-primary/5 transition-all active:scale-95 disabled:opacity-50"
                    >
                        Save as Draft
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit((data) => mutation.mutate({ data, saveAsDraft: false }))}
                        disabled={mutation.isPending}
                        className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                    >
                        <Icon name="verified" />
                        Save &amp; Confirm Purchase
                    </button>
                </div>
            </div>
        </div>
    );
}

function PurchaseProductSuggestions({ search, onSelect }: { search: string; onSelect: (p: ProductSummary) => void }) {
    const debounced = useDebounce(search, 300);
    const { data } = useQuery({
        queryKey: ["products", "search", debounced],
        queryFn: () => productsApi.list(debounced, undefined, 0, 6),
        enabled: debounced.length > 1,
    });

    if (!data || data.content.length === 0 || debounced.length <= 1) return null;

    return (
        <div className="absolute z-10 mt-1 w-72 bg-surface border border-outline-variant rounded-xl shadow-lg max-h-48 overflow-y-auto">
            {data.content.map((p) => (
                <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelect(p)}
                    className="w-full text-left px-4 py-2 hover:bg-surface-container-low text-body-md flex justify-between"
                >
                    <span>{p.name}</span>
                    <span className="text-on-surface-variant text-label-md tabular-nums">{p.taxRate ?? 0}% GST</span>
                </button>
            ))}
        </div>
    );
}