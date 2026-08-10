import { useState } from "react";
import { Icon } from "../../../components/Icon";
import { useAuth } from "../../../context/AuthContext";
import { JournalTab } from "../components/JournalTab";
import { CashBookTab } from "../components/CashBookTab";
import { ProfitLossTab } from "../components/ProfitLossTab";
import { TrialBalanceTab } from "../components/TrialBalanceTab";
import { PostJournalModal } from "../components/PostJournalModal";

type TabKey = "journal" | "cashbook" | "pandl" | "trial";

// journal(GET)/cash-book are ADMIN,MANAGER,ACCOUNTANT — profit-loss/
// trial-balance (and posting a manual journal entry) are ADMIN,ACCOUNTANT
// only, matching AccountsController's actual @PreAuthorize on each endpoint.
const allTabs: { key: TabKey; label: string; icon: string; roles: string[] }[] = [
  { key: "journal", label: "Journal Entries", icon: "book", roles: ["ADMIN", "MANAGER", "ACCOUNTANT"] },
  { key: "cashbook", label: "Cash Book", icon: "payments", roles: ["ADMIN", "MANAGER", "ACCOUNTANT"] },
  { key: "pandl", label: "Profit & Loss", icon: "equalizer", roles: ["ADMIN", "ACCOUNTANT"] },
  { key: "trial", label: "Trial Balance", icon: "account_balance_wallet", roles: ["ADMIN", "ACCOUNTANT"] },
];

export function AccountsPage() {
  const { session } = useAuth();
  const tabs = allTabs.filter((t) => session && t.roles.includes(session.role));
  const [tab, setTab] = useState<TabKey>(tabs[0]?.key ?? "journal");
  const [postOpen, setPostOpen] = useState(false);
  const canPost = session?.role === "ADMIN" || session?.role === "ACCOUNTANT";

  if (tabs.length === 0) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-xl border border-outline-variant p-10 text-center">
        <Icon name="block" className="text-error mx-auto mb-3" size={32} />
        <h2 className="text-headline-md text-on-surface mb-2">Your role can't access accounts</h2>
        <p className="text-body-md text-on-surface-variant">
          {session?.role} accounts don't have access to any accounting endpoint.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-headline-lg text-on-surface">Financial Accounts</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Manage your ledgers, cash flow, and financial statements.</p>
        </div>
        {canPost && (
          <button
            onClick={() => setPostOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
          >
            <Icon name="add" />
            Post Manual Entry
          </button>
        )}
      </div>

      <div className="flex items-center border-b border-outline-variant mb-6 gap-8 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`py-4 text-label-md uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-2 border-b-2 ${
              tab === t.key ? "border-primary text-primary font-bold" : "border-transparent text-on-surface-variant hover:text-primary"
            }`}
          >
            <Icon name={t.icon} size={20} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "journal" && <JournalTab />}
      {tab === "cashbook" && <CashBookTab />}
      {tab === "pandl" && <ProfitLossTab />}
      {tab === "trial" && <TrialBalanceTab />}

      <PostJournalModal isOpen={postOpen} onClose={() => setPostOpen(false)} />
    </div>
  );
}