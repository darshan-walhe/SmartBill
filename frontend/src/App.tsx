import { Routes, Route } from "react-router-dom";
import { AppShell } from "./layouts/AppShell";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { LoginPage } from "./features/auth/pages/LoginPage";
import { RegisterPage } from "./features/auth/pages/RegisterPage";
import { Dashboard } from "./features/dashboard/Dashboard";
import { CompanyPage } from "./features/company/pages/CompanyPage";
import { TeamPage } from "./features/team/pages/TeamPage";
import { CustomersPage } from "./features/customers/pages/CustomersPage";
import { SuppliersPage } from "./features/suppliers/pages/SuppliersPage";
import { ProductsPage } from "./features/products/pages/ProductsPage";
import { InventoryLedgerPage } from "./features/inventory/pages/InventoryLedgerPage";
import { InvoicesListPage } from "./features/invoices/pages/InvoicesListPage";
import { AdminShell } from "./features/admin/layout/AdminShell";
import { TenantsPage } from "./features/admin/pages/TenantsPage";
import { PlatformAuditLogPage } from "./features/admin/pages/PlatformAuditLogPage";
import { AdminComingSoon } from "./features/admin/pages/AdminComingSoon";
import { ComingSoon } from "./components/ComingSoon";
import { Navigate } from "react-router-dom";

export default function App() {
  return (
    <Routes>
      {/* Public — auth screens */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/otp" element={<Navigate to="/login" replace />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected — tenant app shell */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/inventory" element={<InventoryLedgerPage />} />
        <Route path="/invoices" element={<InvoicesListPage />} />
        <Route path="/invoices/new" element={<ComingSoon title="Create Invoice" phase="Phase 4 (next)" />} />
        <Route path="/invoices/:id" element={<ComingSoon title="Invoice Detail" phase="Phase 4 (next)" />} />
        <Route path="/purchases" element={<ComingSoon title="Purchases" phase="Phase 5" />} />
        <Route path="/gst" element={<ComingSoon title="GST Reports" phase="Phase 6" />} />
        <Route path="/accounts" element={<ComingSoon title="Journal" phase="Phase 6" />} />
        <Route path="/company" element={<CompanyPage />} />
        <Route path="/notifications" element={<ComingSoon title="Notifications" phase="Phase 7" />} />
      </Route>

      {/* ADMIN/MANAGER only — matches backend's hasAnyRole('ADMIN','MANAGER') on GET /api/users */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/team" element={<TeamPage />} />
      </Route>

      {/* SUPER_ADMIN only — its own dedicated portal shell (AdminShell), not
          the tenant AppShell — matches the mockups' separate sidebar/topbar */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
            <AdminShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminComingSoon title="Dashboard" note="Platform-wide stats dashboard — no dedicated backend aggregation endpoint yet." />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="plans" element={<AdminComingSoon title="Plans" note="Plan management happens inline from Tenants → Companies for now." />} />
        <Route path="audits" element={<PlatformAuditLogPage />} />
        <Route path="support" element={<AdminComingSoon title="Support" note="No support-ticket backend exists yet." />} />
      </Route>

      <Route path="*" element={<ComingSoon title="Page not found" phase="—" />} />
    </Routes>
  );
}