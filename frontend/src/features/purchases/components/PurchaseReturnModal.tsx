import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { purchasesApi, type PurchaseItemRequest, type PurchaseResponse } from "../../../api/purchases";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/Icon";
import { useToast } from "../../../components/ui/Toast";

interface PurchaseReturnModalProps {
  purchase: PurchaseResponse | null;
  onClose: () => void;
}

export function PurchaseReturnModal({ purchase, onClose }: PurchaseReturnModalProps) {
  const { show } = useToast();
  const queryClient = useQueryClient();
  const [returnQty, setReturnQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(false);

  useEffect(() => {
    if (purchase) {
      setReturnQty(Object.fromEntries(purchase.items.map((i) => [i.id, i.quantity])));
      setReason("");
      setReasonError(false);
    }
  }, [purchase]);

  const mutation = useMutation({
    mutationFn: (body: { purchaseId: string; returnReason: string; items: PurchaseItemRequest[] }) =>
      purchasesApi.createReturn(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      show("Return processed — a debit note has been recorded", "success");
      onClose();
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  function submit() {
    if (!reason.trim()) {
      setReasonError(true);
      return;
    }
    if (!purchase) return;

    const items: PurchaseItemRequest[] = purchase.items
      .filter((line) => (returnQty[line.id] ?? 0) > 0)
      .map((line) => ({
        productId: line.productId,
        quantity: returnQty[line.id],
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
      }));

    if (items.length === 0) {
      show("Select at least one item to return", "danger");
      return;
    }

    mutation.mutate({ purchaseId: purchase.id, returnReason: reason, items });
  }

  return (
    <Modal
      isOpen={!!purchase}
      onClose={onClose}
      title="Create Purchase Return"
      subtitle={purchase ? `Reference: ${purchase.purchaseNumber} • Vendor: ${purchase.supplierName}` : undefined}
      icon="assignment_return"
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} isLoading={mutation.isPending}>
            <Icon name="assignment_return" size={20} />
            Process Return
          </Button>
        </>
      }
    >
      <div className="mb-6 bg-primary-container/10 p-4 rounded-lg border border-primary/10">
        <p className="text-body-md text-primary flex items-center gap-2">
          <Icon name="info" size={20} />
          Select the quantity of each item you wish to return.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center text-label-md font-bold text-outline px-2 uppercase tracking-tight">
          <div className="flex-1">Product Details</div>
          <div className="w-28 text-center">Original Qty</div>
          <div className="w-32 text-right">Return Qty</div>
        </div>
        {purchase?.items.map((line) => (
          <div key={line.id} className="flex items-center p-3 border border-outline-variant rounded-lg bg-surface-container-lowest hover:border-primary/30 transition-colors">
            <div className="flex-1">
              <p className="text-body-md font-semibold text-on-surface">{line.productName}</p>
              {line.hsnCode && <p className="text-label-md text-outline">HSN: {line.hsnCode}</p>}
            </div>
            <div className="w-28 text-center text-body-md font-medium text-on-surface-variant">{line.quantity}</div>
            <div className="w-32 flex justify-end">
              <input
                type="number"
                min={0}
                max={line.quantity}
                value={returnQty[line.id] ?? 0}
                onChange={(e) => {
                  const val = Math.min(line.quantity, Math.max(0, Number(e.target.value) || 0));
                  setReturnQty((prev) => ({ ...prev, [line.id]: val }));
                }}
                className="w-24 text-right px-3 py-2 border border-outline-variant rounded-lg text-body-md focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-mono"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <label className="block text-body-md font-semibold text-on-surface mb-2">
          Return Reason <span className="text-error">*</span>
        </label>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => { setReason(e.target.value); setReasonError(false); }}
          className={`w-full p-3 border rounded-lg text-body-md focus:ring-2 focus:ring-primary/10 transition-all resize-none ${reasonError ? "border-error" : "border-outline-variant focus:border-primary"}`}
          placeholder="Please describe why these items are being returned (e.g., Damaged on arrival, Wrong specification)..."
        />
        <p className="text-[11px] text-outline mt-1.5 flex items-center gap-1">
          <Icon name="lock" size={14} />
          This information will be recorded on the Debit Note.
        </p>
      </div>
    </Modal>
  );
}