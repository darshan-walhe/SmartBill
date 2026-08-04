import { NavLink } from "react-router-dom";
import { Icon } from "../components/Icon";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types/api";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

interface NavGroup {
  label: string | null; // null = ungrouped (Dashboard)
  items: NavItem[];
  roles?: Role[]; // omit to show for every authenticated role
}

const navGroups: NavGroup[] = [
  { label: null, items: [{ to: "/", label: "Dashboard", icon: "dashboard" }] },
  {
    label: "Sales",
    items: [
      { to: "/invoices", label: "Invoices", icon: "receipt_long" },
      { to: "/customers", label: "Customers", icon: "person" },
    ],
  },
  {
    label: "Purchases",
    items: [
      { to: "/purchases", label: "Purchases", icon: "shopping_cart" },
      { to: "/suppliers", label: "Suppliers", icon: "local_shipping" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { to: "/products", label: "Products", icon: "inventory_2" },
      { to: "/inventory", label: "Stock Ledger", icon: "analytics" },
    ],
  },
  {
    label: "Accounting",
    items: [
      { to: "/gst", label: "GST Reports", icon: "account_balance" },
      { to: "/accounts", label: "Journal", icon: "menu_book" },
    ],
    roles: ["ADMIN", "MANAGER", "ACCOUNTANT"],
  },
  {
    label: "Organization",
    items: [
      { to: "/team", label: "Team", icon: "group" },
      { to: "/company", label: "Company", icon: "business" },
    ],
  },
];

const platformAdminItem: NavItem = { to: "/admin", label: "Platform Admin", icon: "admin_panel_settings" };

function NavRow({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 active:scale-95 ${
          isActive
            ? "bg-primary-container text-on-primary-container font-bold"
            : "text-on-surface-variant hover:bg-surface-container-high"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon name={item.icon} filled={isActive} />
          <span className="text-body-md">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

interface SidebarNavProps {
  onNavigate?: () => void;
}

// Shared between the fixed desktop sidebar and the mobile drawer — kept as
// one component (rather than the mockup's "clone sidebar HTML via JS" trick)
// so the two can never drift out of sync.
export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const { session } = useAuth();

  return (
    <nav className="flex-1 flex flex-col px-4 gap-1" onClick={onNavigate}>
      {navGroups
        .filter((group) => !group.roles || (session && group.roles.includes(session.role)))
        .map((group) => (
          <div key={group.label ?? "root"}>
            {group.label && (
              <div className="mt-4 mb-2">
                <p className="px-4 text-[10px] uppercase tracking-wider font-bold text-outline">
                  {group.label}
                </p>
              </div>
            )}
            {group.items.map((item) => (
              <NavRow key={item.to} item={item} />
            ))}
          </div>
        ))}

      {session?.role === "SUPER_ADMIN" && (
        <>
          <div className="my-6 border-t border-outline-variant/50" />
          <div className="mb-2">
            <p className="px-4 text-[10px] uppercase tracking-wider font-bold text-primary">
              Platform Admin
            </p>
          </div>
          <NavRow item={platformAdminItem} />
        </>
      )}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-surface shadow-sm z-50 hidden md:flex flex-col border-r border-outline-variant/30 overflow-y-auto">
      <div className="px-6 py-6 mb-2">
        <span className="text-headline-md font-bold text-primary">SmartBill</span>
      </div>

      <SidebarNav />

      <div className="p-4 mt-auto mb-4">
        <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/30">
          <p className="text-label-md text-on-surface-variant mb-2">Need help?</p>
          <button className="w-full py-2 bg-primary text-on-primary font-bold rounded-lg text-body-md hover:shadow-md transition-all active:scale-95">
            Support Center
          </button>
        </div>
      </div>
    </aside>
  );
}
