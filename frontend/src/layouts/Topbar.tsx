import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import { companyApi } from "../api/company";

interface TopbarProps {
  onMenuClick: () => void;
}

function initialsOf(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { session, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Real company name in the title bar, not the mockup's hardcoded
  // "Acme Solutions" — cached, so this doesn't refetch on every navigation.
  const { data: company } = useQuery({
    queryKey: ["company"],
    queryFn: companyApi.get,
    staleTime: 5 * 60_000,
  });

  return (
    <header className="fixed top-0 right-0 w-full md:w-[calc(100%-16rem)] h-16 bg-surface border-b border-outline-variant flex justify-between items-center px-6 z-40 transition-all duration-300">
      <div className="flex items-center gap-4 min-w-0">
        <button
          className="md:hidden p-2 hover:bg-surface-container-low rounded-full transition-colors"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Icon name="menu" />
        </button>
        <h1 className="text-headline-md font-semibold text-on-surface truncate">
          {company?.name ?? "SmartBill"}
        </h1>
      </div>
      {/* Search Bar */}
      <div className="flex items-center w-1/3">
        <div className="relative w-full max-w-sm">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
          <input
            className="w-full bg-surface-container text-body-md font-body-md pl-10 pr-4 py-2 rounded-full border-none focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="Search Global..." type="text" />
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        {/* Static badge count for now — wired to GET /api/notifications/unread-count in Phase 7 */}
        <button
          className="relative p-2 hover:bg-surface-container-low rounded-full transition-colors group"
          aria-label="Notifications"
        >
          <Icon name="notifications" className="text-on-surface-variant group-hover:text-primary" />
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-error text-white text-[10px] flex items-center justify-center rounded-full font-bold border-2 border-surface">
            3
          </span>
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-3 px-2 py-1.5 hover:bg-surface-container-low rounded-full cursor-pointer transition-all duration-200 group border border-transparent hover:border-outline-variant/20"
          >
            <div className="w-8 h-8 md:w-9 md:h-9 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center font-bold text-body-md shadow-sm">
              {initialsOf(session?.name)}
            </div>
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="text-body-md font-semibold text-on-surface">{session?.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-secondary-container text-on-secondary-container rounded font-bold self-start uppercase">
                {session?.role.replace("_", " ")}
              </span>
            </div>
            <Icon
              name="keyboard_arrow_down"
              size={20}
              className="text-on-surface-variant transition-transform group-hover:translate-y-0.5"
            />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-outline-variant/30 bg-surface py-1 shadow-lg">
                <div className="border-b border-outline-variant/30 px-3 py-2">
                  <p className="text-body-md font-semibold text-on-surface">{session?.name}</p>
                  <p className="truncate text-label-md text-on-surface-variant">{session?.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-body-md text-error hover:bg-error-container/40"
                >
                  <Icon name="logout" size={18} />
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
