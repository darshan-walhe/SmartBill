import { useEffect } from "react";
import { useForm, type UseFormRegister, type FieldErrors, type Path } from "react-hook-form";
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

const errorInputClass =
  "w-full px-4 py-2 border border-error rounded-lg focus:ring-2 focus:ring-error/20 focus:border-error outline-none transition-all text-body-md";

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const MOBILE_PATTERN = /^[6-9]\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldProps = {
  label: string;
  name: Path<CustomerSaveRequest>;
  register: UseFormRegister<CustomerSaveRequest>;
  errors: FieldErrors<CustomerSaveRequest>;
  required?: string;
  pattern?: { value: RegExp; message: string };
  type?: string;
  placeholder?: string;
  maxLength?: number;
  step?: string;
  uppercase?: boolean;
  mono?: boolean;
  disabled?: boolean;
  valueAsNumber?: boolean;
  hint?: string;
};

function Field({
  label,
  name,
  register,
  errors,
  required,
  pattern,
  type = "text",
  placeholder,
  maxLength,
  step,
  uppercase,
  mono,
  disabled,
  valueAsNumber,
  hint,
}: FieldProps) {
  const id = `field-${name}`;
  const error = errors[name];
  const { onChange, ...rest } = register(name, {
    required,
    pattern,
    valueAsNumber,
    // Force GSTIN (or any `uppercase` field) to uppercase as the user types,
    // rather than only styling it visually — the raw value must match the regex.
    ...(uppercase
      ? {
          onChange: (e) => {
            e.target.value = e.target.value.toUpperCase();
          },
        }
      : {}),
  });

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-label-md text-on-surface-variant">
        {label} {required && <span className="text-error">*</span>}
      </label>
      <input
        id={id}
        type={type}
        step={step}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${error ? errorInputClass : inputClass} ${uppercase ? "uppercase" : ""} ${mono ? "font-mono" : ""}`}
        onChange={onChange}
        {...rest}
      />
      {hint && !error && <p className="text-[10px] text-on-surface-variant">{hint}</p>}
      {error && (
        <span id={`${id}-error`} className="text-[10px] text-error">
          {error.message as string}
        </span>
      )}
    </div>
  );
}

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
          <Field
            label="Business / Customer Name"
            name="name"
            register={register}
            errors={errors}
            required="Name is required"
            placeholder="e.g. Acme Corporation"
          />

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Mobile Number"
              name="mobile"
              type="tel"
              register={register}
              errors={errors}
              placeholder="10-digit number"
              pattern={{ value: MOBILE_PATTERN, message: "Enter a valid 10-digit mobile number" }}
            />
            <Field
              label="Email Address"
              name="email"
              type="email"
              register={register}
              errors={errors}
              placeholder="contact@business.com"
              pattern={{ value: EMAIL_PATTERN, message: "Enter a valid email address" }}
            />
          </div>

          <Field
            label="GSTIN (15 characters)"
            name="gstin"
            register={register}
            errors={errors}
            maxLength={15}
            placeholder="27XXXXX0000X0Z0"
            uppercase
            pattern={{ value: GSTIN_PATTERN, message: "Enter a valid 15-character GSTIN" }}
          />
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="field-address" className="text-label-md text-on-surface-variant">
              Street Address
            </label>
            <textarea
              id="field-address"
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="Suite 402, Business Park..."
              {...register("address")}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="City" name="city" register={register} errors={errors} placeholder="Mumbai" />
            <Field label="State" name="state" register={register} errors={errors} placeholder="Maharashtra" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Country" name="country" register={register} errors={errors} placeholder="India" />
            <Field label="Pincode" name="pincode" register={register} errors={errors} maxLength={6} placeholder="400001" mono />
          </div>
        </section>

        <section>
          <h4 className="text-label-md text-primary font-bold uppercase tracking-wider mb-3">
            Financial Profile
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Credit Limit (₹)"
              name="creditLimit"
              type="number"
              step="0.01"
              register={register}
              errors={errors}
              placeholder="0.00"
              valueAsNumber
            />
            <Field
              label="Opening Balance (₹)"
              name="openingBalance"
              type="number"
              step="0.01"
              register={register}
              errors={errors}
              placeholder="0.00"
              disabled={isEdit}
              valueAsNumber
              hint={isEdit ? "Opening balance is locked after creation — it feeds the running current balance." : undefined}
            />
          </div>
        </section>
      </form>
    </Modal>
  );
}