import type { ReactNode } from "react";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyOf: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  // Pagination — mirrors the backend's Page<T> shape directly
  page?: number;
  totalPages?: number;
  totalElements?: number;
  onPageChange?: (page: number) => void;
  entityLabel?: string; // e.g. "members", "invoices" — used in the "Showing X of Y" line
}

const alignClass = { left: "text-left", right: "text-right", center: "text-center" };

// Matches team_management_desktop's table card: bg-white rounded-xl border,
// surface-container-low header row, numbered pagination (not just Prev/Next).
export function Table<T>({
  columns,
  rows,
  keyOf,
  isLoading,
  emptyMessage = "Nothing here yet.",
  page,
  totalPages,
  totalElements,
  onPageChange,
  entityLabel = "items",
}: TableProps<T>) {
  const showPagination =
    onPageChange !== undefined && page !== undefined && totalPages !== undefined;

  const pageNumbers =
    showPagination && totalPages > 0
      ? Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          // Center the window around the current page once there are more
          // than 5 pages, instead of always showing pages 1-5.
          const start = Math.max(0, Math.min(page - 2, totalPages - 5));
          return start + i;
        })
      : [];

  return (
    <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              {columns.map((col) => (
                <th
                  key={col.header}
                  className={`px-6 py-3 text-label-md text-on-surface-variant uppercase tracking-wider ${alignClass[col.align ?? "left"]}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 text-center text-on-surface-variant">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-10 text-center text-on-surface-variant">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={keyOf(row)} className="hover:bg-surface-container-lowest transition-colors">
                  {columns.map((col) => (
                    <td
                      key={col.header}
                      className={`px-6 py-4 text-on-surface ${alignClass[col.align ?? "left"]} ${col.className ?? ""}`}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPagination && totalPages > 1 && (
        <div className="px-6 py-3 flex items-center justify-between bg-surface-container-lowest border-t border-outline-variant">
          <p className="text-label-md text-on-surface-variant">
            {totalElements !== undefined
              ? `Page ${page + 1} of ${totalPages} · ${totalElements} ${entityLabel}`
              : `Page ${page + 1} of ${totalPages}`}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
              className="p-2 rounded-lg border border-outline-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              ‹
            </button>
            {pageNumbers.map((n) => (
              <button
                key={n}
                onClick={() => onPageChange(n)}
                className={`px-3 py-1.5 rounded-lg text-label-md transition-colors ${
                  n === page
                    ? "bg-primary text-on-primary font-bold"
                    : "border border-outline-variant hover:bg-surface-container-high"
                }`}
              >
                {n + 1}
              </button>
            ))}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page + 1 >= totalPages}
              className="p-2 rounded-lg border border-outline-variant hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
