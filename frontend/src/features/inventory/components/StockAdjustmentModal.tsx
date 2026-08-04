import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../../../lib/useDebounce";
import { productsApi, type ProductSummary } from "../../../api/products";
import { inventoryApi, type AdjustmentRequest } from "../../../api/inventory";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/Icon";
import { useToast } from "../../../components/ui/Toast";

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetProduct?: ProductSummary | null; // pre-fill when opened from the ledger's product selector
}

const inputClass =
  "w-full p-2.5 border border-outline-variant rounded-xl text-body-md focus:ring-2 focus:ring-primary outline-none transition-all";

export function StockAdjustmentModal({ isOpen, onClose, presetProduct }: StockAdjustmentModalProps) {
  const { show } = useToast();
  const queryClient = useQueryClient();
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductSummary | null>(null);
  const debouncedSearch = useDebounce(productSearch, 300);

  const { data: searchResults } = useQuery({
    queryKey: ["products", "search", debouncedSearch],
    queryFn: () => productsApi.list(debouncedSearch, undefined, 0, 8),
    enabled: debouncedSearch.length > 1 && !selectedProduct,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ type: "ADJUSTMENT_IN" | "ADJUSTMENT_OUT"; quantity: number; notes?: string }>({
    defaultValues: { type: "ADJUSTMENT_IN" },
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedProduct(presetProduct ?? null);
      setProductSearch(presetProduct?.name ?? "");
      reset({ type: "ADJUSTMENT_IN", quantity: undefined, notes: "" });
    }
  }, [isOpen, presetProduct, reset]);

  const mutation = useMutation({
    mutationFn: (body: AdjustmentRequest) => inventoryApi.adjust(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      show("Stock adjusted successfully", "success");
      onClose();
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  function submit(data: { type: "ADJUSTMENT_IN" | "ADJUSTMENT_OUT"; quantity: number; notes?: string }) {
    if (!selectedProduct) {
      show("Select a product first", "danger");
      return;
    }
    mutation.mutate({ productId: selectedProduct.id, ...data });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjust Stock Levels"
      icon="tune"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit(submit)} isLoading={mutation.isPending}>
            Save Adjustment
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block text-label-md font-bold text-on-surface-variant mb-1">Product</label>
          <div className="relative">
            <Icon name="search" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              className={`${inputClass} pl-10`}
              placeholder="Search product by name or SKU..."
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setSelectedProduct(null);
              }}
            />
            {searchResults && searchResults.content.length > 0 && !selectedProduct && (
              <div className="absolute z-10 mt-1 w-full bg-surface border border-outline-variant rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {searchResults.content.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProduct(p);
                      setProductSearch(`${p.name}${p.sku ? ` (SKU: ${p.sku})` : ""}`);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-surface-container-low text-body-md"
                  >
                    {p.name} <span className="text-on-surface-variant text-label-md">{p.sku ? `SKU: ${p.sku}` : ""}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-label-md font-bold text-on-surface-variant mb-1">Adjustment Type</label>
            <select className={inputClass} {...register("type")}>
              <option value="ADJUSTMENT_IN">Adjustment In (+)</option>
              <option value="ADJUSTMENT_OUT">Adjustment Out (-)</option>
            </select>
          </div>
          <div>
            <label className="block text-label-md font-bold text-on-surface-variant mb-1">Quantity</label>
            <input
              type="number"
              min={1}
              className={inputClass}
              placeholder="0"
              {...register("quantity", { required: "Required", valueAsNumber: true, min: { value: 1, message: "Must be at least 1" } })}
            />
            {errors.quantity && <span className="text-[10px] text-error">{errors.quantity.message}</span>}
          </div>
        </div>

        <div>
          <label className="block text-label-md font-bold text-on-surface-variant mb-1">Reason / Notes</label>
          <textarea
            rows={3}
            className={`${inputClass} resize-none`}
            placeholder="e.g. Damage reported in shelf A-4 or annual audit correction..."
            {...register("notes")}
          />
        </div>

        <div className="bg-primary-container/10 p-3 rounded-xl border border-primary/20 flex gap-3 items-start">
          <Icon name="info" className="text-primary mt-0.5" size={20} />
          <p className="text-label-md text-primary font-medium leading-relaxed">
            Adjusting stock manually creates a ledger entry but does not impact Sales or Purchase
            records. Use this for breakage, shrinkage, or audit corrections.
          </p>
        </div>
      </div>
    </Modal>
  );
}