import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Icon } from "../../../components/Icon";
import { useAuth } from "../../../context/AuthContext";

// SUPER_ADMIN gets its own portal chrome — deliberately distinct from the
// tenant AppShell/Sidebar (secondary-container active state instead of
// primary-container, "corporate_fare" wordmark icon, logout in the rail
// instead of a Support Center card) — matches admin_companies_list_desktop
// and super_admin_user_management_desktop, which both use this same shell
// rather than reusing the tenant one.
const navItems = [
  { to: "/admin", label: "Dashboard", icon: "dashboard", end: true },
  { to: "/admin/tenants", label: "Tenants", icon: "corporate_fare" },
  { to: "/admin/plans", label: "Plans", icon: "payments" },
  { to: "/admin/audits", label: "Audits", icon: "history_edu" },
  { to: "/admin/support", label: "Support", icon: "support_agent" },
];

function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { logout } = useAuth();

  return (
    <>
      <div className="px-4 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-on-primary">
          <Icon name="corporate_fare" />
        </div>
        <div>
          <h1 className="text-headline-md font-black text-primary leading-none">SmartBill</h1>
          <p className="text-label-md text-on-surface-variant">Super Admin</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1" onClick={onNavigate}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 text-label-md rounded-lg transition-all ${
                isActive
                  ? "bg-secondary-container text-on-secondary-container font-bold"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`
            }
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-4 pt-6 border-t border-outline-variant">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-3 text-on-surface-variant text-label-md hover:bg-surface-container-high transition-all rounded-lg w-full"
        >
          <Icon name="logout" />
          <span>Logout</span>
        </button>
      </div>
    </>
  );
}

export function AdminShell() {
  const { session } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface-container-lowest">
      <aside className="hidden md:flex flex-col h-screen py-6 bg-surface-container-low border-r border-outline-variant fixed left-0 top-0 w-64 z-50">
        <AdminSidebar />
      </aside>

      <main className="flex-1 md:ml-64 min-h-screen flex flex-col">
        <header className="flex justify-between items-center w-full px-6 h-16 sticky top-0 z-40 bg-surface border-b border-outline-variant shadow-sm">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Icon name="menu" />
            </button>
            <h2 className="text-headline-md font-bold text-primary">Platform Admin</h2>
          </div>
          <div className="flex items-center gap-3 pl-4 border-l border-outline-variant">
            <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-body-md">
              {session?.name?.charAt(0).toUpperCase() ?? "S"}
            </div>
            <div className="hidden sm:block">
              <p className="text-body-md font-bold leading-none">{session?.name}</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-1">
                System Controller
              </p>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6 flex-1 max-w-[1400px] mx-auto w-full">
          <Outlet />
        </div>
      </main>

      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setMobileOpen(false)} />
          <div className="fixed top-0 left-0 h-full w-72 bg-surface-container-low z-[70] shadow-2xl flex flex-col py-6 overflow-y-auto">
            <div className="px-4 mb-4 flex justify-end">
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <Icon name="close" />
              </button>
            </div>
            <AdminSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
