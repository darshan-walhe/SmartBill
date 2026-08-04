import { type SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, id, className = "", children, ...rest }, ref) => {
    const selectId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={selectId} className="text-label-md font-medium text-on-surface">
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          className={`rounded-lg border bg-surface px-3 py-2 text-body-md text-on-surface
            focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
            disabled:bg-surface-container-low disabled:text-outline
            ${error ? "border-error" : "border-outline-variant"} ${className}`}
          {...rest}
        >
          {children}
        </select>
        {error && <p className="text-label-md text-error">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
