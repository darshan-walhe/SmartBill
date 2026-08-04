import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

// Matches DESIGN.md's Input Fields spec: 1px outline border, focus ring in
// primary with a soft outer glow, label strictly above the input.
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = "", ...rest }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-label-md font-medium text-on-surface">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`rounded-lg border bg-surface px-3 py-2 text-body-md text-on-surface
            placeholder:text-outline
            focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20
            disabled:bg-surface-container-low disabled:text-outline
            ${error ? "border-error" : "border-outline-variant"} ${className}`}
          {...rest}
        />
        {error ? (
          <p id={`${inputId}-error`} className="text-label-md text-error">
            {error}
          </p>
        ) : hint ? (
          <p className="text-label-md text-on-surface-variant">{hint}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";
