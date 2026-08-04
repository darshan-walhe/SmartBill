import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { suppliersApi, type SupplierResponse, type SupplierSaveRequest } from "../../../api/suppliers";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { useToast } from "../../../components/ui/Toast";

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierResponse | null; // null = create mode
}

const inputClass =
  "w-full px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-body-md";

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const MOBILE_PATTERN = /^[6-9]\d{9}$/;

export function SupplierFormModal({ isOpen, onClose, supplier }: SupplierFormModalProps) {
  const { show } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!supplier;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierSaveRequest>();

  useEffect(() => {
    if (isOpen) reset(supplier ?? {});
  }, [isOpen, supplier, reset]);

  const mutation = useMutation({
    mutationFn: (data: SupplierSaveRequest) =>
      isEdit ? suppliersApi.update(supplier!.id, data) : suppliersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      show(isEdit ? "Supplier updated" : "Supplier created", "success");
      onClose();
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Supplier" : "New Supplier"}
      subtitle={isEdit ? supplier?.name : "Add a vendor to your directory"}
      icon={isEdit ? "edit" : "local_shipping"}
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit((data) => mutation.mutate(data))} isLoading={mutation.isPending}>
            {isEdit ? "Save Changes" : "Create Supplier"}
          </Button>
        </>
      }
    >
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <section className="space-y-4">
          <h4 className="text-label-md text-primary font-bold uppercase tracking-wider">Identity Details</h4>
          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface-variant">
              Supplier Name <span className="text-error">*</span>
            </label>
            <input
              className={inputClass}
              placeholder="e.g. Sharma Wholesale Traders"
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && <span className="text-[10px] text-error">{errors.name.message}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">Mobile Number</label>
              <input
                type="tel"
                className={inputClass}
                placeholder="10-digit number"
                {...register("mobile", {
                  pattern: { value: MOBILE_PATTERN, message: "Enter a valid 10-digit mobile number" },
                })}
              />
              {errors.mobile && <span className="text-[10px] text-error">{errors.mobile.message}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">Email Address</label>
              <input type="email" className={inputClass} placeholder="billing@vendor.com" {...register("email")} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface-variant">GSTIN (Optional)</label>
            <input
              className={`${inputClass} uppercase`}
              maxLength={15}
              placeholder="27XXXXX0000X0Z0"
              {...register("gstin", {
                pattern: { value: GSTIN_PATTERN, message: "Enter a valid 15-character GSTIN" },
              })}
            />
            {errors.gstin && <span className="text-[10px] text-error">{errors.gstin.message}</span>}
          </div>
        </section>

        <section className="space-y-4">
          <h4 className="text-label-md text-primary font-bold uppercase tracking-wider">Address &amp; Location</h4>
          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface-variant">Street Address</label>
            <textarea rows={2} className={`${inputClass} resize-none`} {...register("address")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">City</label>
              <input className={inputClass} {...register("city")} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">State</label>
              <input className={inputClass} {...register("state")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">Country</label>
              <input className={inputClass} {...register("country")} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">Pincode</label>
              <input className={inputClass} maxLength={6} {...register("pincode")} />
            </div>
          </div>
        </section>

        <section>
          <h4 className="text-label-md text-primary font-bold uppercase tracking-wider mb-3">Financial Profile</h4>
          <div className="flex flex-col gap-1 max-w-xs">
            <label className="text-label-md text-on-surface-variant">Opening Balance (₹)</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              placeholder="0.00"
              disabled={isEdit}
              {...register("openingBalance", { valueAsNumber: true })}
            />
            {isEdit && (
              <p className="text-[10px] text-on-surface-variant">
                Locked after creation — feeds the running outstanding amount.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h4 className="text-label-md text-primary font-bold uppercase tracking-wider">Bank Details</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">Bank Name</label>
              <input className={inputClass} {...register("bankName")} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">Account Number</label>
              <input className={`${inputClass} font-mono`} {...register("accountNumber")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">IFSC Code</label>
              <input className={`${inputClass} uppercase font-mono`} {...register("ifscCode")} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">Account Holder Name</label>
              <input className={inputClass} {...register("accountHolderName")} />
            </div>
          </div>
        </section>
      </form>
    </Modal>
  );
}