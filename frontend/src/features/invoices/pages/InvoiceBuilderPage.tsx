import { useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "../../../lib/useDebounce";
import { customersApi, type CustomerSummary } from "../../../api/customers";
import { productsApi, type ProductSummary } from "../../../api/products";
import { invoicesApi, type InvoiceSaveRequest, type InvoiceType } from "../../../api/invoices";
import { useAuth } from "../../../context/AuthContext";
import { Icon } from "../../../components/Icon";
import { useToast } from "../../../components/ui/Toast";

interface LineItemForm {
  key: string;
  productId: string;
  productLabel: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxRate: number; // client-side only, for the estimate — not submitted
}

interface BuilderForm {
  customerId: string;
  customerLabel: string;
  invoiceType: InvoiceType;
  invoiceDate: string;
  dueDate: string;
  currencyCode: string;
  exchangeRate?: number;
  placeOfSupply: string;
  items: LineItemForm[];
  shippingCharges: number;
  notes: string;
  termsAndConditions: string;
}

const todayISO = new Date().toISOString().slice(0, 10);
const inThirtyDaysISO = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

function formatINR(n: number): string {
  return `₹ ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function emptyLine(): LineItemForm {
  return { key: crypto.randomUUID(), productId: "", productLabel: "", quantity: 1, unitPrice: 0, discountPercent: 0, taxRate: 0 };
}

export function InvoiceBuilderPage() {
  const { session } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();

  // Backend's @PreAuthorize on POST /api/invoices is hasAnyRole('ADMIN','MANAGER','STAFF')
  // — ACCOUNTANT can view invoices but genuinely cannot create them.
  const canCreate = session?.role === "ADMIN" || session?.role === "MANAGER" || session?.role === "STAFF";
  // Only ADMIN/MANAGER-submitted unitPrice/discountPercent overrides are
  // honored server-side (InvoiceService.buildLineItems()) — a STAFF token's
  // values are silently ignored and the product's real sale price is used
  // instead. Disabling these fields for STAFF avoids a misleading "editable
  // but actually ignored" UI.
  const canOverridePricing = session?.role === "ADMIN" || session?.role === "MANAGER";

  const { control, register, handleSubmit, watch, setValue } = useForm<BuilderForm>({
    defaultValues: {
      invoiceType: "TAX_INVOICE",
      invoiceDate: todayISO,
      dueDate: inThirtyDaysISO,
      currencyCode: "INR",
      placeOfSupply: "",
      items: [emptyLine()],
      shippingCharges: 0,
      notes: "",
      termsAndConditions: "",
    },
  });

  const { fields, append, remove, update } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const watchedShipping = watch("shippingCharges") || 0;
  const watchedCurrency = watch("currencyCode");

  const [customerSearch, setCustomerSearch] = useState("");
  const debouncedCustomerSearch = useDebounce(customerSearch, 300);
  const { data: customerResults } = useQuery({
    queryKey: ["customers", "search", debouncedCustomerSearch],
    queryFn: () => customersApi.list(debouncedCustomerSearch, 0, 8),
    enabled: debouncedCustomerSearch.length > 1,
  });

  const [productSearchByRow, setProductSearchByRow] = useState<Record<string, string>>({});

  const totals = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    for (const item of watchedItems ?? []) {
      const gross = (item.quantity || 0) * (item.unitPrice || 0);
      const discount = gross * ((item.discountPercent || 0) / 100);
      const taxable = gross - discount;
      const tax = taxable * ((item.taxRate || 0) / 100);
      subtotal += gross;
      totalDiscount += discount;
      totalTax += tax;
    }
    const taxableAmount = subtotal - totalDiscount;
    const grandTotal = taxableAmount + totalTax + Number(watchedShipping || 0);
    return { subtotal, totalDiscount, taxableAmount, cgstEstimate: totalTax / 2, sgstEstimate: totalTax / 2, totalTax, grandTotal };
  }, [watchedItems, watchedShipping]);

  function buildRequest(data: BuilderForm, saveAsDraft: boolean): InvoiceSaveRequest {
    return {
      customerId: data.customerId,
      invoiceType: data.invoiceType,
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate || undefined,
      currencyCode: data.currencyCode,
      exchangeRate: data.currencyCode !== "INR" ? data.exchangeRate : undefined,
      placeOfSupply: data.placeOfSupply || undefined,
      items: data.items
        .filter((i) => i.productId)
        .map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: canOverridePricing ? i.unitPrice : undefined,
          discountPercent: canOverridePricing ? i.discountPercent : undefined,
        })),
      shippingCharges: data.shippingCharges || undefined,
      notes: data.notes || undefined,
      termsAndConditions: data.termsAndConditions || undefined,
      saveAsDraft,
    };
  }

  const mutation = useMutation({
    mutationFn: (vars: { data: BuilderForm; saveAsDraft: boolean }) =>
      invoicesApi.create(buildRequest(vars.data, vars.saveAsDraft)),
    onSuccess: (invoice) => {
      show(invoice.paymentStatus === "DRAFT" ? "Saved as draft" : "Invoice created and confirmed", "success");
      navigate(`/invoices/${invoice.id}`);
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  function selectProduct(index: number, product: ProductSummary) {
    update(index, {
      ...fields[index],
      productId: product.id,
      productLabel: `${product.name}${product.sku ? ` (SKU: ${product.sku})` : ""}`,
      unitPrice: product.salePrice,
      taxRate: product.taxRate ?? 0,
    });
    setProductSearchByRow((prev) => ({ ...prev, [fields[index].key]: "" }));
  }

  if (!canCreate) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-xl border border-outline-variant p-10 text-center">
        <Icon name="block" className="text-error mx-auto mb-3" size={32} />
        <h2 className="text-headline-md text-on-surface mb-2">Your role can't create invoices</h2>
        <p className="text-body-md text-on-surface-variant">
          {session?.role} accounts can view invoices, but only ADMIN, MANAGER, or STAFF can create them.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-headline-lg text-on-surface">Create New Invoice</h2>
          <p className="text-on-surface-variant text-body-md">Generate a GST compliant invoice for your customer.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSubmit((data) => mutation.mutate({ data, saveAsDraft: true }))}
            disabled={mutation.isPending}
            className="px-6 py-2.5 border border-outline-variant text-primary rounded-xl font-bold hover:bg-surface-container-low active:scale-[0.98] transition-all disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            onClick={handleSubmit((data) => mutation.mutate({ data, saveAsDraft: false }))}
            disabled={mutation.isPending}
            className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold shadow-sm hover:shadow-md active:scale-[0.98] transition-all disabled:opacity-50"
          >
            Save &amp; Confirm
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        {/* Header fields */}
        <section className="p-6 border-b border-outline-variant bg-surface-bright">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-1 relative">
              <label className="block text-label-md text-on-surface-variant">Customer</label>
              <div className="relative">
                <Icon name="person_search" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                <input
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-outline-variant rounded-lg text-body-md focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  placeholder="Search customer..."
                  value={watch("customerLabel") || customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); setValue("customerLabel", e.target.value); setValue("customerId", ""); }}
                />
              </div>
              {customerResults && customerResults.content.length > 0 && !watch("customerId") && (
                <div className="absolute z-10 mt-1 w-full bg-surface border border-outline-variant rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {customerResults.content.map((c: CustomerSummary) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setValue("customerId", c.id); setValue("customerLabel", c.name); }}
                      className="w-full text-left px-4 py-2 hover:bg-surface-container-low text-body-md"
                    >
                      {c.name} <span className="text-on-surface-variant text-label-md">{c.city || ""}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-label-md text-on-surface-variant">Invoice Type</label>
              <select className="w-full px-4 py-2.5 bg-white border border-outline-variant rounded-lg text-body-md focus:border-primary focus:ring-1 focus:ring-primary" {...register("invoiceType")}>
                <option value="TAX_INVOICE">Tax Invoice</option>
                <option value="PROFORMA">Proforma Invoice</option>
                <option value="QUOTATION">Quotation</option>
                <option value="EXPORT_INVOICE">Export Invoice</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-label-md text-on-surface-variant">Invoice Date</label>
              <input type="date" className="w-full px-4 py-2.5 bg-white border border-outline-variant rounded-lg text-body-md focus:border-primary focus:ring-1 focus:ring-primary" {...register("invoiceDate", { required: true })} />
            </div>
            <div className="space-y-1">
              <label className="block text-label-md text-on-surface-variant">Due Date</label>
              <input type="date" className="w-full px-4 py-2.5 bg-white border border-outline-variant rounded-lg text-body-md focus:border-primary focus:ring-1 focus:ring-primary" {...register("dueDate")} />
            </div>
            <div className="space-y-1">
              <label className="block text-label-md text-on-surface-variant">Currency</label>
              <select className="w-full px-4 py-2.5 bg-white border border-outline-variant rounded-lg text-body-md focus:border-primary focus:ring-1 focus:ring-primary" {...register("currencyCode")}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>

            {watchedCurrency !== "INR" && (
              <div className="space-y-1">
                <label className="block text-label-md text-on-surface-variant">Exchange Rate (to INR)</label>
                <input
                  type="number"
                  step="0.0001"
                  className="w-full px-4 py-2.5 bg-white border border-outline-variant rounded-lg text-body-md focus:border-primary focus:ring-1 focus:ring-primary"
                  {...register("exchangeRate", { required: "Required for non-INR currency", valueAsNumber: true })}
                />
              </div>
            )}

            <div className="md:col-span-3 space-y-1">
              <label className="block text-label-md text-on-surface-variant">Place of Supply</label>
              <input
                className="w-full px-4 py-2.5 bg-white border border-outline-variant rounded-lg text-body-md focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="e.g. Maharashtra"
                {...register("placeOfSupply")}
              />
            </div>
          </div>
        </section>

        {/* Line items */}
        <section className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-headline-md text-on-surface">Line Items</h3>
            <span className="bg-primary-container/10 text-primary px-2 py-1 rounded text-label-md font-bold">
              {canOverridePricing ? `${session?.role} — CAN OVERRIDE PRICE` : `${session?.role} — CATALOG PRICE ONLY`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-label-md text-on-surface-variant border-b border-outline-variant">
                  <th className="pb-2 font-bold">Product</th>
                  <th className="pb-2 font-bold w-24">Quantity</th>
                  <th className="pb-2 font-bold w-32">Unit Price</th>
                  <th className="pb-2 font-bold w-24">Discount %</th>
                  <th className="pb-2 font-bold w-40 text-right">Line Total</th>
                  <th className="pb-2 w-12" />
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const item = watchedItems?.[index];
                  const gross = (item?.quantity || 0) * (item?.unitPrice || 0);
                  const discount = gross * ((item?.discountPercent || 0) / 100);
                  const taxable = gross - discount;
                  const tax = taxable * ((item?.taxRate || 0) / 100);
                  const lineTotal = taxable + tax;
                  const rowSearch = productSearchByRow[field.key] ?? "";

                  return (
                    <RowSearchContext key={field.key}>
                      <tr className="group border-b border-surface-container-high transition-colors hover:bg-surface-container-lowest">
                        <td className="py-3 pr-3 relative">
                          <input
                            className="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg text-body-md focus:border-primary focus:ring-1 focus:ring-primary"
                            placeholder="Search or add product..."
                            value={item?.productLabel && !rowSearch ? item.productLabel : rowSearch}
                            onChange={(e) => {
                              setProductSearchByRow((prev) => ({ ...prev, [field.key]: e.target.value }));
                              update(index, { ...field, ...item, productId: "", productLabel: "" });
                            }}
                          />
                          <ProductSuggestions
                            search={rowSearch}
                            onSelect={(p) => selectProduct(index, p)}
                          />
                        </td>
                        <td className="py-3 pr-3">
                          <input
                            type="number"
                            min={1}
                            className="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg tabular-nums text-body-md focus:border-primary focus:ring-1 focus:ring-primary text-center"
                            {...register(`items.${index}.quantity`, { valueAsNumber: true, min: 1 })}
                          />
                        </td>
                        <td className="py-3 pr-3">
                          <input
                            type="number"
                            step="0.01"
                            disabled={!canOverridePricing}
                            className="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg tabular-nums text-body-md focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-surface-container-low disabled:text-on-surface-variant"
                            {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                          />
                        </td>
                        <td className="py-3 pr-3">
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            max={100}
                            disabled={!canOverridePricing}
                            className="w-full px-3 py-2 bg-white border border-outline-variant rounded-lg tabular-nums text-body-md focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-surface-container-low disabled:text-on-surface-variant"
                            {...register(`items.${index}.discountPercent`, { valueAsNumber: true })}
                          />
                        </td>
                        <td className="py-3 text-right tabular-nums font-bold text-on-surface">
                          {item?.productId ? formatINR(lineTotal) : <span className="text-on-surface-variant italic font-normal">₹ 0.00</span>}
                        </td>
                        <td className="py-3 text-center">
                          <button
                            type="button"
                            onClick={() => fields.length > 1 && remove(index)}
                            className="p-2 text-error hover:bg-error-container/20 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                            aria-label="Remove line"
                          >
                            <Icon name="delete" size={20} />
                          </button>
                        </td>
                      </tr>
                    </RowSearchContext>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => append(emptyLine())}
            className="mt-4 flex items-center gap-2 text-primary font-bold hover:underline py-2 px-3 rounded-lg hover:bg-primary/5 transition-all"
          >
            <Icon name="add_circle" />
            Add Item
          </button>
        </section>

        {/* Totals + notes */}
        <section className="p-6 bg-surface-container-low">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="space-y-1">
                <label className="block text-label-md text-on-surface-variant">Notes</label>
                <textarea rows={3} className="w-full px-4 py-2.5 bg-white border border-outline-variant rounded-lg text-body-md focus:border-primary focus:ring-1 focus:ring-primary resize-none" placeholder="Additional info for the customer..." {...register("notes")} />
              </div>
              <div className="space-y-1">
                <label className="block text-label-md text-on-surface-variant">Terms &amp; Conditions</label>
                <textarea rows={3} className="w-full px-4 py-2.5 bg-white border border-outline-variant rounded-lg text-body-md focus:border-primary focus:ring-1 focus:ring-primary resize-none" placeholder="Standard payment terms, returns policy, etc." {...register("termsAndConditions")} />
              </div>
            </div>

            <div className="w-full md:w-96">
              <div className="bg-white p-6 rounded-xl border border-outline-variant space-y-3">
                <div className="flex justify-between items-center text-body-md text-on-surface-variant">
                  <span>Subtotal</span>
                  <span className="tabular-nums font-medium">{formatINR(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-body-md text-error">
                  <span>Total Discount</span>
                  <span className="tabular-nums font-medium">- {formatINR(totals.totalDiscount)}</span>
                </div>
                <div className="flex justify-between items-center text-body-md font-bold border-t border-outline-variant pt-3">
                  <span>Taxable Amount</span>
                  <span className="tabular-nums">{formatINR(totals.taxableAmount)}</span>
                </div>
                <div className="space-y-1 pb-2">
                  <div className="flex justify-between items-center text-label-md text-on-surface-variant">
                    <span>CGST (est.)</span>
                    <span className="tabular-nums">{formatINR(totals.cgstEstimate)}</span>
                  </div>
                  <div className="flex justify-between items-center text-label-md text-on-surface-variant">
                    <span>SGST (est.)</span>
                    <span className="tabular-nums">{formatINR(totals.sgstEstimate)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-body-md text-on-surface-variant gap-3">
                  <span>Shipping</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-24 px-2 py-1 bg-surface-container-low border border-outline-variant rounded text-right tabular-nums text-body-md"
                    {...register("shippingCharges", { valueAsNumber: true })}
                  />
                </div>
                <div className="bg-primary-container/10 p-3 rounded-lg flex justify-between items-center">
                  <span className="font-bold text-primary">Grand Total</span>
                  <span className="font-bold text-primary tabular-nums text-headline-md">{formatINR(totals.grandTotal)}</span>
                </div>
                <p className="text-[10px] text-on-surface-variant italic text-right leading-tight">
                  Estimated totals — final GST split (CGST/SGST vs IGST) and rounding is calculated
                  server-side based on place of supply.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// Wraps each line-item row so ProductSuggestions can be positioned relative
// to its own cell rather than the whole table.
function RowSearchContext({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function ProductSuggestions({ search, onSelect }: { search: string; onSelect: (p: ProductSummary) => void }) {
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
          <span className="text-on-surface-variant text-label-md tabular-nums">{formatINR(p.salePrice)}</span>
        </button>
      ))}
    </div>
  );
}