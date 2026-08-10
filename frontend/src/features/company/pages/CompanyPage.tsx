import { useEffect, useState } from "react";
import { useForm, type UseFormRegister, type FieldErrors } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { companyApi, type CompanyUpdateRequest } from "../../../api/company";
import { useAuth } from "../../../context/AuthContext";
import { Icon } from "../../../components/Icon";
import { useToast } from "../../../components/ui/Toast";

const tabs = ["General Details", "Taxes & GST", "Billing & Plan", "Integrations"] as const;
type Tab = (typeof tabs)[number];

const inputClass =
  "w-full border border-outline-variant rounded-lg px-4 py-2.5 text-body-md focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none disabled:bg-slate-50 disabled:text-on-surface-variant disabled:cursor-not-allowed";

const errorInputClass =
  "w-full border border-danger rounded-lg px-4 py-2.5 text-body-md focus:border-danger focus:ring-2 focus:ring-danger/10 transition-all outline-none disabled:bg-slate-50 disabled:text-on-surface-variant disabled:cursor-not-allowed";

const planLabel: Record<string, string> = {
  FREE: "Free",
  BASIC: "Basic",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

type FieldProps = {
  label: string;
  name: keyof CompanyUpdateRequest;
  register: UseFormRegister<CompanyUpdateRequest>;
  errors: FieldErrors<CompanyUpdateRequest>;
  disabled?: boolean;
  type?: string;
  mono?: boolean;
  required?: boolean;
  valueAsNumber?: boolean;
  min?: number;
  max?: number;
  hint?: string;
};

function Field({
  label,
  name,
  register,
  errors,
  disabled,
  type = "text",
  mono,
  required,
  valueAsNumber,
  min,
  max,
  hint,
}: FieldProps) {
  const id = `field-${name}`;
  const error = errors[name];

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-label-md text-on-surface-variant">
        {label}
      </label>
      <input
        id={id}
        type={type}
        min={min}
        max={max}
        className={`${error ? errorInputClass : inputClass} ${mono ? "font-mono tabular-nums" : ""}`}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...register(name, { required, valueAsNumber })}
      />
      {hint && !error && <p className="text-[10px] text-on-surface-variant italic mt-1">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-label-sm text-danger mt-1">
          {label} is required
        </p>
      )}
    </div>
  );
}

function TextAreaField({
  label,
  name,
  register,
  disabled,
}: {
  label: string;
  name: keyof CompanyUpdateRequest;
  register: UseFormRegister<CompanyUpdateRequest>;
  disabled?: boolean;
}) {
  const id = `field-${name}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-label-md text-on-surface-variant">
        {label}
      </label>
      <textarea
        id={id}
        rows={2}
        className={`${inputClass} resize-none`}
        disabled={disabled}
        {...register(name)}
      />
    </div>
  );
}

export function CompanyPage() {
  const { session } = useAuth();
  const { show } = useToast();
  const queryClient = useQueryClient();
  const canEdit = session?.role === "ADMIN";
  const [tab, setTab] = useState<Tab>("General Details");

  const { data: company, isLoading } = useQuery({
    queryKey: ["company"],
    queryFn: companyApi.get,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, errors },
  } = useForm<CompanyUpdateRequest>();

  useEffect(() => {
    if (company) reset(company);
  }, [company, reset]);

  const mutation = useMutation({
    mutationFn: companyApi.update,
    onSuccess: (updated) => {
      // setQueryData drives the useEffect above, which calls reset(updated) for us.
      queryClient.setQueryData(["company"], updated);
      show("Company profile updated", "success");
    },
    onError: (err: Error) => show(err.message, "danger"),
  });

  if (isLoading) {
    return <p className="text-body-md text-on-surface-variant">Loading company profile…</p>;
  }

  return (
    <form
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
      className="space-y-8 pb-24"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-headline-lg text-on-surface">Company Settings</h1>
          <span className="px-2 py-0.5 bg-slate-100 text-on-surface-variant text-[10px] font-bold rounded border border-outline-variant tracking-wider uppercase">
            {session?.role.replace(/_/g, " ")}
          </span>
        </div>
        <nav className="flex gap-6 border-b border-outline-variant/30 w-full md:w-auto overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`whitespace-nowrap text-body-md pb-2 transition-colors cursor-pointer  ${
                tab === t
                  ? "text-primary font-bold border-b-2 border-primary"
                  : "text-on-surface-variant hover:text-primary"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {tab !== "General Details" ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <Icon name="construction" className="text-on-surface-variant mx-auto mb-3" size={32} />
          <p className="text-body-md text-on-surface-variant">{tab} isn't wired up in this phase yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Business Details */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
              <Icon name="domain" className="text-primary" />
              <h2 className="text-lg font-semibold text-on-surface">Business Details</h2>
            </div>
            <div className="space-y-5">
              <Field
                label="Business Name"
                name="name"
                register={register}
                errors={errors}
                disabled={!canEdit}
                required
              />
              <div className="grid grid-cols-2 gap-5">
                <Field label="GST Number" name="gstNumber" register={register} errors={errors} disabled={!canEdit} mono />
                <Field label="PAN Number" name="panNumber" register={register} errors={errors} disabled={!canEdit} mono />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <Field label="Contact Email" name="email" type="email" register={register} errors={errors} disabled={!canEdit} />
                <Field label="Mobile Number" name="mobile" register={register} errors={errors} disabled={!canEdit} mono />
              </div>
            </div>
          </div>

          {/* Registered Address */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
              <Icon name="location_on" className="text-primary" />
              <h2 className="text-lg font-semibold text-on-surface">Registered Address</h2>
            </div>
            <div className="space-y-5">
              <TextAreaField label="Full Address" name="address" register={register} disabled={!canEdit} />
              <div className="grid grid-cols-2 gap-5">
                <Field label="City" name="city" register={register} errors={errors} disabled={!canEdit} />
                <Field label="State" name="state" register={register} errors={errors} disabled={!canEdit} />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <Field label="Pincode" name="pincode" register={register} errors={errors} disabled={!canEdit} mono />
                <Field label="Country" name="country" register={register} errors={errors} disabled={!canEdit} />
              </div>
            </div>
          </div>

          {/* Invoicing Preferences */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
              <Icon name="receipt" className="text-primary" />
              <h2 className="text-lg font-semibold text-on-surface">Invoicing Preferences</h2>
            </div>
            <div className="space-y-5">
              <Field
                label="Invoice Prefix"
                name="invoicePrefix"
                register={register}
                errors={errors}
                disabled={!canEdit}
                mono
                hint={`Example: ${company?.invoicePrefix ?? "INV-"}${String(company?.invoiceSequence ?? 1).padStart(4, "0")}`}
              />
              <div className="grid grid-cols-2 gap-5">
                <Field
                  label="Financial Year Start Month"
                  name="financialYearStartMonth"
                  type="number"
                  min={1}
                  max={12}
                  register={register}
                  errors={errors}
                  disabled={!canEdit}
                  valueAsNumber
                />
                <Field label="Default Currency" name="defaultCurrency" register={register} errors={errors} disabled={!canEdit} />
              </div>
            </div>
          </div>

          {/* Current Plan */}
          <div className="bg-surface-container p-6 rounded-xl border border-primary/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-6 border-b border-primary/10 pb-4">
                <Icon name="auto_awesome" className="text-primary" />
                <h2 className="text-lg font-semibold text-primary">Current Plan</h2>
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-primary-container/20 rounded-xl flex items-center justify-center text-primary">
                  <Icon name="workspace_premium" filled size={32} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-headline-md text-on-surface">
                      {planLabel[company?.subscriptionPlan ?? "FREE"]}
                    </span>
                    <span className="px-2 py-0.5 bg-primary-container text-white text-[10px] font-bold rounded-full tracking-wide">
                      {company?.subscriptionPlan}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white/50 rounded-lg border border-primary/5">
              <div className="flex items-start gap-3">
                <Icon name="info" className="text-primary" size={20} />
                <p className="text-body-md text-on-surface-variant italic">
                  Your plan is managed by SmartBill's platform team. Contact support to upgrade.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {canEdit && tab === "General Details" && isDirty && (
        <div className="fixed bottom-0 right-0 left-0 md:left-64 bg-white/80 backdrop-blur-md border-t border-slate-100 p-4 flex justify-end items-center gap-4 z-30">
          <button
            type="button"
            onClick={() => company && reset(company)}
            className="text-label-md text-on-surface-variant hover:text-on-surface px-6 py-2.5 transition-colors"
          >
            Discard Changes
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="bg-primary text-on-primary px-8 py-3 rounded-lg text-label-md shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60"
          >
            {mutation.isPending ? (
              <>
                <Icon name="sync" size={18} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                Save Changes
                <Icon name="arrow_forward" size={18} />
              </>
            )}
          </button>
        </div>
      )}
    </form>
  );
}