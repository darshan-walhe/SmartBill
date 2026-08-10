import { useState } from "react";
import { Icon } from "../../../components/Icon";
import { useAuth } from "../../../context/AuthContext";
import { Gstr1Tab } from "../components/Gstr1Tab";
import { Gstr3bTab } from "../components/Gstr3bTab";
import { HsnSummaryTab } from "../components/HsnSummaryTab";
import { TaxSlabTab } from "../components/TaxSlabTab";
import { FilingHistoryTab } from "../components/FilingHistoryTab";

type TabKey = "gstr1" | "gstr3b" | "hsn" | "taxslab" | "filing";

// GstController restricts most of these to ADMIN/ACCOUNTANT — MANAGER can
// only call GET /api/gst/tax-slab. Filtering tabs by role here (rather than
// showing all 5 and letting the others 403) avoids landing a MANAGER on a
// tab that immediately errors.
const allTabs: { key: TabKey; label: string; icon: string; roles: string[] }[] = [
  { key: "gstr1", label: "GSTR-1", icon: "receipt_long", roles: ["ADMIN", "ACCOUNTANT"] },
  { key: "gstr3b", label: "GSTR-3B", icon: "assignment", roles: ["ADMIN", "ACCOUNTANT"] },
  { key: "hsn", label: "HSN Summary", icon: "analytics", roles: ["ADMIN", "ACCOUNTANT"] },
  { key: "taxslab", label: "Tax Slabs", icon: "pie_chart", roles: ["ADMIN", "ACCOUNTANT", "MANAGER"] },
  { key: "filing", label: "Filing History", icon: "calendar_month", roles: ["ADMIN", "ACCOUNTANT"] },
];

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfQuarter(d: Date): Date {
  return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
}
function startOfFY(d: Date): Date {
  const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return new Date(year, 3, 1); // April 1
}

type Preset = "month" | "quarter" | "fy" | "custom";

export function GstReportsPage() {
  const { session } = useAuth();
  const tabs = allTabs.filter((t) => session && t.roles.includes(session.role));
  const [tab, setTab] = useState<TabKey>(tabs[0]?.key ?? "taxslab");

  if (tabs.length === 0) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-xl border border-outline-variant p-10 text-center">
        <Icon name="block" className="text-error mx-auto mb-3" size={32} />
        <h2 className="text-headline-md text-on-surface mb-2">Your role can't access GST reports</h2>
        <p className="text-body-md text-on-surface-variant">
          {session?.role} accounts don't have access to any GST report endpoint. ADMIN, MANAGER, and
          ACCOUNTANT roles have varying levels of access here.
        </p>
      </div>
    );
  }
  const [preset, setPreset] = useState<Preset>("month");
  const today = new Date();
  const [from, setFrom] = useState(toISO(startOfMonth(today)));
  const [to, setTo] = useState(toISO(today));

  function applyPreset(p: Preset) {
    setPreset(p);
    if (p === "month") { setFrom(toISO(startOfMonth(today))); setTo(toISO(today)); }
    else if (p === "quarter") { setFrom(toISO(startOfQuarter(today))); setTo(toISO(today)); }
    else if (p === "fy") { setFrom(toISO(startOfFY(today))); setTo(toISO(today)); }
  }

  return (
    <div>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 mb-8">
        <div>
          <h1 className="text-headline-lg text-on-surface mb-1">GST Reports &amp; Filing</h1>
          <p className="text-body-md text-on-surface-variant">Manage your compliance, view summaries and prepare for filing.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex bg-surface-container-low rounded-lg p-1 border border-outline-variant">
            {(["month", "quarter", "fy"] as Preset[]).map((p) => (
              <button
                key={p}
                onClick={() => applyPreset(p)}
                className={`px-4 py-1.5 text-label-md rounded transition-all ${
                  preset === p ? "bg-white shadow-sm text-primary font-bold" : "text-on-surface-variant hover:text-primary"
                }`}
              >
                {p === "month" ? "This Month" : p === "quarter" ? "This Quarter" : "This FY"}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPreset("custom"); }}
              className="border border-outline-variant rounded-lg text-body-md px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
            <span className="text-outline">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPreset("custom"); }}
              className="border border-outline-variant rounded-lg text-body-md px-3 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-outline-variant mb-8 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap text-body-md transition-colors ${
              tab === t.key ? "border-b-2 border-primary text-primary font-bold" : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <Icon name={t.icon} size={20} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "gstr1" && <Gstr1Tab from={from} to={to} />}
      {tab === "gstr3b" && <Gstr3bTab from={from} to={to} />}
      {tab === "hsn" && <HsnSummaryTab from={from} to={to} />}
      {tab === "taxslab" && <TaxSlabTab from={from} to={to} />}
      {tab === "filing" && <FilingHistoryTab />}
    </div>
  );
}