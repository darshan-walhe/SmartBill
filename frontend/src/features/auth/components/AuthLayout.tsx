import type { ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

// NOTE: not currently used anywhere — LoginPage and RegisterPage each have
// their own bespoke layout now, matching login_page_desktop_with_google's
// split-panel card and register_page_with_google's simple centered card
// respectively, since the two mockups differ structurally enough that a
// single shared wrapper couldn't cover both. Kept here in case a future
// simple auth-style screen (e.g. "forgot password") wants this instead.
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-dark px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white font-display text-xl font-bold text-primary">
            S
          </span>
          <span className="font-display text-xl font-bold text-white">SmartBill</span>
        </div>

        <div className="rounded-lg bg-surface p-6 shadow-xl">
          <h1 className="font-display text-lg font-medium text-ink">{title}</h1>
          <p className="mt-1 text-sm text-slate">{subtitle}</p>
          <div className="mt-5">{children}</div>
        </div>

        {footer && <div className="mt-4 text-center text-sm text-white/70">{footer}</div>}
      </div>
    </div>
  );
}
