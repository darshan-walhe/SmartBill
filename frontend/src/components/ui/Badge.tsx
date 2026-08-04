type Tone = "neutral" | "success" | "danger" | "warning" | "primary" | "info";

interface BadgeProps {
  children: React.ReactNode;
  tone?: Tone;
  dot?: boolean; // adds a small status dot — matches team_management_desktop's
                 // Active/Inactive pill style, distinct from flat role pills
}

// Matches the literal class pairs used across the mockups: bg-emerald-100/
// text-emerald-700 for Paid, bg-amber-100/text-amber-700 for Pending,
// bg-red-100/text-red-700 for Overdue, bg-blue-100/text-blue-700 for
// MANAGER role, bg-primary/10 text-primary for ADMIN role.
const toneClasses: Record<Tone, { pill: string; dot: string }> = {
  neutral: { pill: "bg-slate-100 text-slate-600", dot: "bg-slate-500" },
  success: { pill: "bg-emerald-500/10 text-emerald-600", dot: "bg-emerald-600" },
  danger: { pill: "bg-rose-500/10 text-rose-600", dot: "bg-rose-600" },
  warning: { pill: "bg-amber-100 text-amber-700", dot: "bg-amber-600" },
  primary: { pill: "bg-primary/10 text-primary", dot: "bg-primary" },
  info: { pill: "bg-blue-100 text-blue-700", dot: "bg-blue-600" },
};

export function Badge({ children, tone = "neutral", dot = false }: BadgeProps) {
  const t = toneClasses[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px]
        font-bold uppercase tracking-tight ${t.pill}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />}
      {children}
    </span>
  );
}
