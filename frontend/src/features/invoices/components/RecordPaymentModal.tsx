import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invoicesApi, type InvoicePaymentRequest, type InvoiceSummary } from "../../../api/invoices";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { useToast } from "../../../components/ui/Toast";

interface RecordPaymentModalProps {
  invoice: InvoiceSummary | null;
  onClose: () => void;
}

const inputClass =
  "w-full px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-body-md";

export function RecordPaymentModal({ invoice, onClose }: RecordPaymentModalProps) {
  const { show } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InvoicePaymentRequest>({
    values: invoice ? { amount: invoice.balanceDue, paymentMethod: "UPI" } : undefined,
  });

  function handleClose() {
    reset();
    onClose();
  }

  const mutation = useMutation({
    mutationFn: (body: InvoicePaymentRequest) => invoicesApi.recordPayment(invoice!.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      show("Payment recorded", "success");
      handleClose();
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  return (
    <Modal
      isOpen={!!invoice}
      onClose={handleClose}
      title="Record Payment"
      subtitle={invoice ? `${invoice.invoiceNumber} — Balance due ₹${invoice.balanceDue.toLocaleString("en-IN")}` : undefined}
      icon="payments"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit((data) => mutation.mutate(data))} isLoading={mutation.isPending}>
            Record Payment
          </Button>
        </>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-1">
          <label className="text-label-md text-on-surface-variant">Amount (₹)</label>
          <input
            type="number"
            step="0.01"
            className={inputClass}
            {...register("amount", { required: "Required", valueAsNumber: true, min: { value: 0.01, message: "Must be greater than 0" } })}
          />
          {errors.amount && <span className="text-[10px] text-error">{errors.amount.message}</span>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-label-md text-on-surface-variant">Payment Method</label>
          <select className={inputClass} {...register("paymentMethod", { required: true })}>
            <option value="UPI">UPI</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CHEQUE">Cheque</option>
            <option value="INTERNATIONAL">International</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-label-md text-on-surface-variant">Transaction Reference</label>
          <input className={inputClass} placeholder="UTR / cheque no. / txn id" {...register("transactionReference")} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-label-md text-on-surface-variant">Payment Date</label>
          <input type="date" className={inputClass} {...register("paymentDate")} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-label-md text-on-surface-variant">Notes</label>
          <textarea rows={2} className={`${inputClass} resize-none`} {...register("notes")} />
        </div>
      </form>
    </Modal>
  );
}