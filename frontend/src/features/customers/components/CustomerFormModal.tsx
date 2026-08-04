import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customersApi, type CustomerResponse, type CustomerSaveRequest } from "../../../api/customers";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { useToast } from "../../../components/ui/Toast";

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerResponse | null; // null = create mode
}

const inputClass =
  "w-full px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-body-md";

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const MOBILE_PATTERN = /^[6-9]\d{9}$/;

export function CustomerFormModal({ isOpen, onClose, customer }: CustomerFormModalProps) {
  const { show } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!customer;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerSaveRequest>();

  useEffect(() => {
    if (isOpen) reset(customer ?? {});
  }, [isOpen, customer, reset]);

  const mutation = useMutation({
    mutationFn: (data: CustomerSaveRequest) =>
      isEdit ? customersApi.update(customer!.id, data) : customersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      show(isEdit ? "Customer updated" : "Customer created", "success");
      onClose();
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Customer" : "New Customer"}
      subtitle={isEdit ? customer?.name : "Add a customer to your directory"}
      icon={isEdit ? "edit" : "person_add"}
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit((data) => mutation.mutate(data))} isLoading={mutation.isPending}>
            {isEdit ? "Save Changes" : "Create Customer"}
          </Button>
        </>
      }
    >
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <section className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface-variant">
              Business / Customer Name <span className="text-error">*</span>
            </label>
            <input
              className={inputClass}
              placeholder="e.g. Acme Corporation"
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
              <input type="email" className={inputClass} placeholder="contact@business.com" {...register("email")} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface-variant">GSTIN (15 characters)</label>
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
          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface-variant">Street Address</label>
            <textarea
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="Suite 402, Business Park..."
              {...register("address")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">City</label>
              <input className={inputClass} placeholder="Mumbai" {...register("city")} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">State</label>
              <input className={inputClass} placeholder="Maharashtra" {...register("state")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">Country</label>
              <input className={inputClass} placeholder="India" {...register("country")} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">Pincode</label>
              <input className={inputClass} maxLength={6} placeholder="400001" {...register("pincode")} />
            </div>
          </div>
        </section>

        <section>
          <h4 className="text-label-md text-primary font-bold uppercase tracking-wider mb-3">
            Financial Profile
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-label-md text-on-surface-variant">Credit Limit (₹)</label>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                placeholder="0.00"
                {...register("creditLimit", { valueAsNumber: true })}
              />
            </div>
            <div className="flex flex-col gap-1">
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
                  Opening balance is locked after creation — it feeds the running current balance.
                </p>
              )}
            </div>
          </div>
        </section>
      </form>
    </Modal>
  );
}