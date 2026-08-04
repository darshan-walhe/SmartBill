import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
}

// Matches DESIGN.md's Buttons spec: solid primary / outline secondary,
// active states scale down to 98% to feel responsive.
const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:shadow-lg disabled:bg-primary/50 disabled:shadow-none",
  secondary:
    "bg-transparent text-primary border border-outline hover:bg-surface-container-low disabled:opacity-50",
  danger: "bg-error text-on-error hover:shadow-lg disabled:bg-error/50 disabled:shadow-none",
  ghost: "text-on-surface hover:bg-surface-container-low disabled:opacity-50",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", isLoading, disabled, className = "", children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2
          text-body-md font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100
          ${variantClasses[variant]} ${className}`}
        {...rest}
      >
        {isLoading && (
          <span
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
