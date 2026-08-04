import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Icon } from "../Icon";

type ToastTone = "success" | "danger" | "info";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// No direct mockup for toasts — extrapolated from the same token system
// (secondary = success green, error = danger, inverse-surface = info/neutral).
const toneConfig: Record<ToastTone, { bg: string; icon: string }> = {
  success: { bg: "bg-secondary text-on-secondary", icon: "check_circle" },
  danger: { bg: "bg-error text-on-error", icon: "error" },
  info: { bg: "bg-inverse-surface text-inverse-on-surface", icon: "info" },
};

let idCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, tone: ToastTone = "info") => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
        {toasts.map((t) => {
          const config = toneConfig[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-body-md font-medium shadow-lg ${config.bg}`}
            >
              <Icon name={config.icon} size={20} />
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
