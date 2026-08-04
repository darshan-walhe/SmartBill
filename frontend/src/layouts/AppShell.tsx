import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar, SidebarNav } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Icon } from "../components/Icon";

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Topbar onMenuClick={() => setMobileNavOpen(true)} />

      <main className="pt-16 md:pl-64 min-h-screen transition-all duration-300">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile drawer — React state instead of the mockup's vanilla-JS
          toggleMobileNav(), reusing the same SidebarNav as desktop so the
          two navs can never drift out of sync. */}
      {mobileNavOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="fixed top-0 left-0 h-full w-72 bg-white z-[70] shadow-2xl flex flex-col overflow-y-auto">
            <div className="px-6 py-8 flex justify-between items-center">
              <span className="text-headline-md font-bold text-primary">SmartBill</span>
              <button className="p-2" onClick={() => setMobileNavOpen(false)} aria-label="Close menu">
                <Icon name="close" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}
