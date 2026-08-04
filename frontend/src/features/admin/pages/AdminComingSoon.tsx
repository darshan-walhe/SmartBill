import { Icon } from "../../../components/Icon";

interface AdminComingSoonProps {
  title: string;
  note: string;
}

// Dashboard/Plans/Support are real nav items in the mockup's admin sidebar
// but have no dedicated backend endpoints yet (Plans overlaps with the
// per-company subscription-change already in Tenants → Companies; Support
// has no backend concept at all).
export function AdminComingSoon({ title, note }: AdminComingSoonProps) {
  return (
    <div>
      <h1 className="text-headline-lg text-on-surface mb-6">{title}</h1>
      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
        <Icon name="construction" className="text-on-surface-variant mx-auto mb-3" size={32} />
        <p className="text-body-md text-on-surface-variant">{note}</p>
      </div>
    </div>
  );
}
