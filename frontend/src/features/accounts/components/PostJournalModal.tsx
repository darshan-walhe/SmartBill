import { useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { accountsApi, type AccountType, type JournalRequest } from "../../../api/accounts";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/Icon";
import { useToast } from "../../../components/ui/Toast";

interface PostJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACCOUNT_TYPES: AccountType[] = [
  "CASH", "BANK", "ACCOUNTS_RECEIVABLE", "ACCOUNTS_PAYABLE", "SALES_REVENUE", "PURCHASE",
  "CGST_PAYABLE", "SGST_PAYABLE", "IGST_PAYABLE", "INPUT_CGST", "INPUT_SGST", "INPUT_IGST",
  "EXPENSE", "INCOME", "DISCOUNT_GIVEN", "DISCOUNT_RECEIVED", "STOCK", "CAPITAL", "DRAWING",
];

const todayISO = new Date().toISOString().slice(0, 10);

function emptyLine() {
  return { accountType: "CASH" as AccountType, accountName: "", debitAmount: 0, creditAmount: 0, narration: "" };
}

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PostJournalModal({ isOpen, onClose }: PostJournalModalProps) {
  const { show } = useToast();
  const queryClient = useQueryClient();

  const { control, register, handleSubmit, watch, reset } = useForm<JournalRequest>({
    defaultValues: { entryDate: todayISO, description: "", lines: [emptyLine(), emptyLine()] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const watchedLines = watch("lines");

  const { totalDebit, totalCredit, isBalanced } = useMemo(() => {
    const debit = (watchedLines ?? []).reduce((sum, l) => sum + (Number(l.debitAmount) || 0), 0);
    const credit = (watchedLines ?? []).reduce((sum, l) => sum + (Number(l.creditAmount) || 0), 0);
    return { totalDebit: debit, totalCredit: credit, isBalanced: debit > 0 && Math.abs(debit - credit) < 0.01 };
  }, [watchedLines]);

  function handleClose() {
    reset({ entryDate: todayISO, description: "", lines: [emptyLine(), emptyLine()] });
    onClose();
  }

  const mutation = useMutation({
    mutationFn: (body: JournalRequest) => accountsApi.postJournal(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      show("Journal entry posted", "success");
      handleClose();
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  function submit(data: JournalRequest) {
    if (!isBalanced) {
      show("Total debits must equal total credits before posting", "danger");
      return;
    }
    mutation.mutate(data);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Post Manual Journal Entry"
      subtitle="Every entry must balance — total debits = total credits"
      icon="book"
      maxWidth="max-w-3xl"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit(submit)} isLoading={mutation.isPending} disabled={!isBalanced}>
            Post Entry
          </Button>
        </>
      }
    >
      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface-variant">Entry Date</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
              {...register("entryDate", { required: true })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface-variant">Description</label>
            <input
              className="w-full px-3 py-2 border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="e.g. Office rent payment — October"
              {...register("description", { required: true })}
            />
          </div>
        </div>

        <div>
          <div className="grid grid-cols-12 gap-2 text-label-md font-bold text-on-surface-variant uppercase tracking-tight mb-2 px-1">
            <div className="col-span-3">Account Type</div>
            <div className="col-span-3">Account Name</div>
            <div className="col-span-2 text-right">Debit</div>
            <div className="col-span-2 text-right">Credit</div>
            <div className="col-span-2">Narration</div>
          </div>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                <select
                  className="col-span-3 px-2 py-2 border border-outline-variant rounded-lg text-label-md focus:ring-2 focus:ring-primary/20"
                  {...register(`lines.${index}.accountType`)}
                >
                  {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                </select>
                <input
                  className="col-span-3 px-2 py-2 border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary/20"
                  placeholder="Account name"
                  {...register(`lines.${index}.accountName`, { required: true })}
                />
                <input
                  type="number"
                  step="0.01"
                  className="col-span-2 px-2 py-2 border border-outline-variant rounded-lg text-right tabular-nums text-body-md focus:ring-2 focus:ring-primary/20"
                  {...register(`lines.${index}.debitAmount`, { valueAsNumber: true })}
                />
                <input
                  type="number"
                  step="0.01"
                  className="col-span-2 px-2 py-2 border border-outline-variant rounded-lg text-right tabular-nums text-body-md focus:ring-2 focus:ring-primary/20"
                  {...register(`lines.${index}.creditAmount`, { valueAsNumber: true })}
                />
                <div className="col-span-2 flex items-center gap-1">
                  <input
                    className="w-full px-2 py-2 border border-outline-variant rounded-lg text-label-md focus:ring-2 focus:ring-primary/20"
                    placeholder="Optional"
                    {...register(`lines.${index}.narration`)}
                  />
                  <button
                    type="button"
                    onClick={() => fields.length > 2 && remove(index)}
                    className="text-error p-1 hover:bg-error-container/20 rounded"
                    aria-label="Remove line"
                  >
                    <Icon name="delete" size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => append(emptyLine())}
            className="mt-3 flex items-center gap-1 text-primary text-label-md font-bold hover:underline"
          >
            <Icon name="add" size={16} /> Add Line
          </button>
        </div>

        <div className={`p-4 rounded-lg flex justify-between items-center ${isBalanced ? "bg-secondary/10" : "bg-error/10"}`}>
          <div className="flex items-center gap-2">
            <Icon name={isBalanced ? "check_circle" : "error"} className={isBalanced ? "text-secondary" : "text-error"} size={20} />
            <span className={`text-body-md font-bold ${isBalanced ? "text-secondary" : "text-error"}`}>
              {isBalanced ? "Balanced" : "Not balanced — debits must equal credits"}
            </span>
          </div>
          <div className="flex gap-6 font-mono text-body-md">
            <span>Dr {formatINR(totalDebit)}</span>
            <span>Cr {formatINR(totalCredit)}</span>
          </div>
        </div>
      </form>
    </Modal>
  );
}