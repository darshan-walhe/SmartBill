interface ComingSoonProps {
  title: string;
  phase: string;
}

export function ComingSoon({ title, phase }: ComingSoonProps) {
  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center rounded-lg border border-dashed border-border text-center">
      <h1 className="font-display text-xl font-medium text-ink">{title}</h1>
      <p className="mt-1 text-sm text-slate">Built in {phase} — not yet wired up.</p>
    </div>
  );
}
