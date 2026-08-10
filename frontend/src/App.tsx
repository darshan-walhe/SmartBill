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
import { InvoiceBuilderPage } from "./features/invoices/pages/InvoiceBuilderPage";
import { InvoiceDetailPage } from "./features/invoices/pages/InvoiceDetailPage";
import { PurchasesListPage } from "./features/purchases/pages/PurchasesListPage";
import { PurchaseBuilderPage } from "./features/purchases/pages/PurchaseBuilderPage";
import { PurchaseDetailPage } from "./features/purchases/pages/PurchaseDetailPage";
import { GstReportsPage } from "./features/gst/pages/GstReportsPage";
import { AccountsPage } from "./features/accounts/pages/AccountsPage";
import { NotificationsPage } from "./features/notifications/pages/NotificationsPage";
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
        <Route path="/invoices/new" element={<InvoiceBuilderPage />} />
        <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="/purchases" element={<PurchasesListPage />} />
        <Route path="/purchases/new" element={<PurchaseBuilderPage />} />
        <Route path="/purchases/:id" element={<PurchaseDetailPage />} />
        <Route path="/gst" element={<GstReportsPage />} />
        <Route path="/accounts" element={<AccountsPage />} />
        <Route path="/company" element={<CompanyPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
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