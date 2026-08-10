import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { accountsApi, type JournalEntryResponse } from "../../../api/accounts";
import { Icon } from "../../../components/Icon";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatINR(n: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function JournalTab() {
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["accounts", "journal", page],
    queryFn: () => accountsApi.listJournal(page, 20),
  });

  const entries = data?.content ?? [];

  return (
    <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-surface-container text-label-md text-on-surface-variant uppercase font-bold border-b border-outline-variant">
          <tr>
            <th className="px-6 py-4">Date</th>
            <th className="px-6 py-4">Reference</th>
            <th className="px-6 py-4">Description</th>
            <th className="px-6 py-4 text-right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/30">
          {isLoading ? (
            <tr><td colSpan={4} className="px-6 py-10 text-center text-on-surface-variant">Loading…</td></tr>
          ) : entries.length === 0 ? (
            <tr><td colSpan={4} className="px-6 py-10 text-center text-on-surface-variant">No journal entries yet.</td></tr>
          ) : (
            entries.map((entry: JournalEntryResponse) => (
              <JournalRowGroup
                key={entry.id}
                entry={entry}
                expanded={expandedId === entry.id}
                onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              />
            ))
          )}
        </tbody>
      </table>

      {data && data.totalPages > 1 && (
        <div className="px-6 py-3 flex items-center justify-between bg-surface-container-lowest border-t border-outline-variant">
          <span className="text-label-md text-on-surface-variant">Page {page + 1} of {data.totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 border border-outline-variant rounded-lg text-label-md disabled:opacity-30"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= data.totalPages}
              className="px-3 py-1 border border-outline-variant rounded-lg text-label-md disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function JournalRowGroup({ entry, expanded, onToggle }: { entry: JournalEntryResponse; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr onClick={onToggle} className="hover:bg-surface-container-low transition-colors cursor-pointer group">
        <td className="px-6 py-5 font-mono text-numeric-table">{formatDate(entry.entryDate)}</td>
        <td className="px-6 py-5 font-bold text-primary flex items-center gap-2">
          <Icon name={expanded ? "expand_less" : "expand_more"} size={18} className="text-on-surface-variant" />
          {entry.referenceNumber || entry.referenceType}
        </td>
        <td className="px-6 py-5 text-on-surface-variant">{entry.description}</td>
        <td className="px-6 py-5 text-right font-mono text-numeric-table font-bold">{formatINR(entry.totalAmount)}</td>
      </tr>
      {expanded && (
        <tr className="bg-surface-container-lowest border-l-4 border-primary">
          <td className="p-0" colSpan={4}>
            <div className="px-12 py-6">
              <table className="w-full border border-outline-variant rounded-lg overflow-hidden">
                <thead className="bg-slate-50 text-label-md border-b border-outline-variant">
                  <tr>
                    <th className="px-4 py-2 text-left">Account Name</th>
                    <th className="px-4 py-2 text-right">Debit (₹)</th>
                    <th className="px-4 py-2 text-right">Credit (₹)</th>
                    <th className="px-4 py-2 text-left">Narration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30 text-body-md">
                  {entry.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3 font-bold">{line.accountName}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatINR(line.debitAmount)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatINR(line.creditAmount)}</td>
                      <td className="px-4 py-3 italic text-on-surface-variant">{line.narration || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}