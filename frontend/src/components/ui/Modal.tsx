import { type ReactNode, useEffect } from "react";
import { Icon } from "../Icon";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: string; // Material Symbols name — matches the icon-in-a-tinted-circle header pattern
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string; // Tailwind max-w-* class, e.g. "max-w-2xl" for form modals
}

// Matches customer_form_modal_desktop / team_management_desktop's invite
// modal: surface-container-low header/footer bands, rounded-xl, backdrop
// blur. (Skipped the mockup's animate-in/zoom-in — that's from the
// tailwindcss-animate plugin, not installed here; a plain mount is fine.)
export function Modal({ isOpen, onClose, title, subtitle, icon, children, footer, maxWidth = "max-w-lg" }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative bg-surface border border-outline-variant w-full ${maxWidth} max-h-[90vh] overflow-hidden rounded-xl shadow-xl flex flex-col`}
      >
        <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Icon name={icon} />
              </div>
            )}
            <div className="min-w-0">
              <h2 id="modal-title" className="text-headline-md text-on-surface truncate">
                {title}
              </h2>
              {subtitle && <p className="text-label-md text-on-surface-variant">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 hover:bg-surface-container-highest rounded-full transition-colors text-on-surface-variant flex-shrink-0"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {footer && (
          <div className="px-6 py-4 border-t border-outline-variant flex items-center justify-end gap-3 bg-surface-container-low">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
