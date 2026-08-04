import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { categoriesApi, productsApi, type ProductResponse, type ProductSaveRequest } from "../../../api/products";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { useToast } from "../../../components/ui/Toast";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductResponse | null; // null = create mode
}

const inputClass =
  "w-full px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-low focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-body-md text-on-surface";

const UNITS = ["PCS", "KG", "LTR", "MTR", "BOX", "UNIT"];
const TAX_RATES = [0, 5, 12, 18, 28];

export function ProductFormModal({ isOpen, onClose, product }: ProductFormModalProps) {
  const { show } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!product;

  const { data: categories } = useQuery({
    queryKey: ["product-categories"],
    queryFn: categoriesApi.list,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductSaveRequest>({ defaultValues: { unit: "PCS", taxRate: 18 } });

  useEffect(() => {
    if (isOpen) reset(product ?? { unit: "PCS", taxRate: 18 });
  }, [isOpen, product, reset]);

  const mutation = useMutation({
    mutationFn: (data: ProductSaveRequest) =>
      isEdit ? productsApi.update(product!.id, data) : productsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      show(isEdit ? "Product updated" : "Product created", "success");
      onClose();
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Product" : "New Product"}
      subtitle={isEdit ? product?.name : "Add an item to your catalog"}
      icon={isEdit ? "edit" : "add_box"}
      maxWidth="max-w-3xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit((data) => mutation.mutate(data))} isLoading={mutation.isPending}>
            {isEdit ? "Save Changes" : "Save Product"}
          </Button>
        </>
      }
    >
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-primary rounded-full" />
            <h3 className="text-body-lg font-bold text-on-surface">Identity</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">
                Product Name <span className="text-error">*</span>
              </label>
              <input
                className={inputClass}
                placeholder="e.g. Premium Cotton Fabric"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && <span className="text-[10px] text-error">{errors.name.message}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">SKU</label>
              <input className={inputClass} placeholder="SKU-001" {...register("sku")} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">HSN Code</label>
              <input className={inputClass} placeholder="5208" {...register("hsnCode")} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">Barcode</label>
              <input className={inputClass} placeholder="Scan or type..." {...register("barcode")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-on-surface-variant">Unit</label>
                <select className={inputClass} {...register("unit")}>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-md text-on-surface-variant">Category</label>
                <select className={inputClass} {...register("categoryId")}>
                  <option value="">Uncategorized</option>
                  {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-primary rounded-full" />
            <h3 className="text-body-lg font-bold text-on-surface">Pricing &amp; Tax</h3>
          </div>
          <div className="bg-primary/5 p-6 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 border border-primary/10">
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">
                Purchase Price (₹) <span className="text-error">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                className={`${inputClass} bg-surface-container-lowest text-right`}
                placeholder="0.00"
                {...register("purchasePrice", { required: "Required", valueAsNumber: true, min: 0 })}
              />
              {errors.purchasePrice && <span className="text-[10px] text-error">{errors.purchasePrice.message}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">
                Sale Price (₹) <span className="text-error">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                className={`${inputClass} bg-surface-container-lowest text-right`}
                placeholder="0.00"
                {...register("salePrice", { required: "Required", valueAsNumber: true, min: 0 })}
              />
              {errors.salePrice && <span className="text-[10px] text-error">{errors.salePrice.message}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">Tax Rate (GST)</label>
              <select
                className={`${inputClass} bg-surface-container-lowest`}
                {...register("taxRate", { valueAsNumber: true })}
              >
                {TAX_RATES.map((r) => (
                  <option key={r} value={r}>{r}% {r === 0 ? "(Exempt)" : ""}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-primary rounded-full" />
            <h3 className="text-body-lg font-bold text-on-surface">Inventory Settings</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">Opening Stock</label>
              <input
                type="number"
                className={inputClass}
                placeholder="0"
                disabled={isEdit}
                {...register("openingStock", { valueAsNumber: true, min: 0 })}
              />
              {isEdit && (
                <p className="text-[10px] text-on-surface-variant">
                  Locked after creation — adjust stock via the Inventory ledger instead.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">Low Stock Threshold</label>
              <input
                type="number"
                className={inputClass}
                placeholder="10"
                {...register("lowStockThreshold", { valueAsNumber: true, min: 0 })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">Reorder Quantity</label>
              <input
                type="number"
                className={inputClass}
                placeholder="50"
                {...register("reorderQuantity", { valueAsNumber: true, min: 0 })}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-primary rounded-full" />
            <h3 className="text-body-lg font-bold text-on-surface">Additional Info</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">Image URL</label>
              <input className={inputClass} placeholder="https://..." {...register("imageUrl")} />
            </div>
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">Description</label>
              <textarea
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="Specifications, usage guidelines, or material info..."
                {...register("description")}
              />
            </div>
          </div>
        </section>
      </form>
    </Modal>
  );
}