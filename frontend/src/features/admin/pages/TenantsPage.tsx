import { useState } from "react";
import { CompaniesListPage } from "./CompaniesListPage";
import { PlatformUsersPage } from "./PlatformUsersPage";

type SubTab = "companies" | "users";

// The mockups' "Tenants" nav item covers both admin_companies_list_desktop
// and super_admin_user_management_desktop — both use the same sidebar with
// "Tenants" highlighted, so they live under one route with a sub-tab here
// rather than each getting their own top-level nav entry.
export function TenantsPage() {
  const [tab, setTab] = useState<SubTab>("companies");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-headline-lg text-on-surface">
          {tab === "companies" ? "Company Management" : "Platform Users"}
        </h1>
        <div className="flex gap-1 bg-surface-container-low rounded-lg p-1">
          <button
            onClick={() => setTab("companies")}
            className={`px-4 py-1.5 rounded-md text-label-md font-bold transition-colors ${
              tab === "companies" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant"
            }`}
          >
            Companies
          </button>
          <button
            onClick={() => setTab("users")}
            className={`px-4 py-1.5 rounded-md text-label-md font-bold transition-colors ${
              tab === "users" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant"
            }`}
          >
            Users
          </button>
        </div>
      </div>

      {tab === "companies" ? <CompaniesListPage /> : <PlatformUsersPage />}
    </div>
  );
}
