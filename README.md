# BCS Smart Billing & Inventory Management

A multi-tenant SaaS platform for GST-compliant billing, inventory, and accounting — built for small and mid-sized Indian businesses. Each registered business operates as an isolated tenant with its own users, products, customers, invoices, and books of accounts, while a platform-level Super Admin oversees all tenants from a central admin console.

## Overview

SmartBill combines the day-to-day workflows a small business actually needs — invoicing, purchases, inventory, customers/suppliers, and GST filing — with a proper double-entry accounting ledger underneath, so every invoice, payment, and purchase automatically posts to the books. It's built as a Spring Boot REST API backed by MongoDB, with a React + TypeScript single-page frontend.

## Key Features

- **Multi-tenant architecture** — each company (tenant) has its own data, invoice/purchase numbering sequences, financial year settings, and subscription plan (Free/paid tiers)
- **Authentication & authorization**
  - Email/password login, mobile OTP login (with auto-expiring OTP tokens), and Google OAuth2 sign-in
  - JWT access + refresh tokens
  - Role-based access control: `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `STAFF`, `ACCOUNTANT`
  - Team management — invite users, assign roles, activate/deactivate accounts
- **Billing & Invoicing** — create, confirm, and cancel invoices; record payments; track overdue invoices; auto-generated invoice numbers per company
- **Purchases** — purchase orders, confirmations, payments, and purchase returns
- **Inventory management** — stock ledger per product, manual stock adjustments, low-stock alerts, inventory reports
- **Products & Customers/Suppliers** — full CRUD, categorization, barcode lookup, outstanding-balance and stats views
- **GST module** — GSTR-1 and GSTR-3B report generation, HSN summary, tax slab lookups, filing status tracking
- **Accounting ledger** — manual/auto journal entries, cash book, trial balance, and profit & loss statement (double-entry bookkeeping under the hood)
- **Notifications** — in-app notifications with unread counts and mark-as-read
- **Audit logging** — every sensitive action is logged and searchable by entity or user
- **Platform Admin console** — Super Admin can view/manage all tenant companies, change subscription plans, deactivate/reactivate companies, promote users, and review platform-wide audit logs
- **Security hardening** — request rate limiting, no stack traces/exception details leaked in error responses, dev-only OTP logging that's hard-disabled in production

## Tech Stack

**Backend**
- Java 21, Spring Boot 4
- Spring Web (MVC), Spring Security, Spring Validation, Spring Data MongoDB
- JWT authentication (`jjwt`)
- Google API Client (OAuth2 login)
- Spring Mail (OTP delivery via SMTP)
- Lombok
- Maven

**Frontend**
- React 19 + TypeScript
- Vite 8 (build tool)
- TanStack Query (server-state management)
- React Router 7
- React Hook Form
- Tailwind CSS 4
- Axios
- jsPDF + jsPDF-AutoTable (PDF export for invoices)
- Lucide React (icons)
- Oxlint (linting)

**Database**
- MongoDB

## Project Structure

```
SmartBill/
├── SmartBill/                  # Spring Boot backend
│   ├── src/main/java/com/BCSTech/SmartBill/
│   │   ├── auth/                # Login, registration, OTP, Google OAuth
│   │   ├── user/                 # Users, roles, team management
│   │   ├── company/              # Tenant/company profile & settings
│   │   ├── admin/                # Platform Super Admin console
│   │   ├── product/               # Products & product categories
│   │   ├── customer/ / supplier/  # Customer & supplier management
│   │   ├── invoice/               # Invoices & payments
│   │   ├── purchase/              # Purchases & purchase returns
│   │   ├── inventory/             # Stock ledger & adjustments
│   │   ├── accounts/              # Journal entries, cash book, P&L, trial balance
│   │   ├── gst/                    # GSTR-1/3B, HSN summary, tax slabs
│   │   ├── notification/          # In-app notifications
│   │   ├── audit/                  # Audit logging
│   │   └── common/                 # Security (JWT), rate limiting, shared config
│   └── pom.xml
├── frontend/                    # React + TypeScript SPA
│   └── src/
│       ├── api/                  # Typed API client per module
│       ├── features/             # Feature-based modules (auth, invoices, purchases, gst, admin, ...)
│       ├── components/           # Shared UI components
│       ├── layouts/, routes/, context/, lib/, types/
└── Documents/                    # Project documentation (bug-fix/audit reports, etc.)
```

## Getting Started

### Prerequisites
- Java 21+
- Node.js 18+
- MongoDB (local or remote)

### Backend Setup

```bash
cd SmartBill
./mvnw spring-boot:run
```

Configure via environment variables (see `src/main/resources/application.yaml`):

| Variable | Purpose |
|---|---|
| `MAIL_USERNAME` / `MAIL_PASSWORD` | SMTP credentials for OTP emails |
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID |
| `OTP_LOG_PLAINTEXT` | Dev-only flag to log OTPs (keep `false`/unset in prod) |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` / `SUPER_ADMIN_NAME` | Bootstraps the first platform Super Admin on first run |

The API runs on `http://localhost:8080` by default and connects to `mongodb://localhost:27017/bcs_billing_db`.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Configure `frontend/.env` (see `.env.example`):

```
VITE_API_BASE_URL=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

The frontend dev server runs on `http://localhost:5173`.

## API Overview

All endpoints are prefixed with `/api`. Major resource groups:

- `/api/auth` — register, login, OTP send/verify, Google login
- `/api/users` — team/user management
- `/api/company` — tenant company profile
- `/api/admin` — Super Admin platform console
- `/api/products`, `/api/product-categories`
- `/api/customers`, `/api/suppliers`
- `/api/invoices`, `/api/payments`
- `/api/purchases`
- `/api/inventory`
- `/api/accounts` — journal, cash book, trial balance, P&L
- `/api/gst` — GSTR-1, GSTR-3B, HSN summary, tax slab, filing status
- `/api/notifications`
- `/api/audit-logs`

## License

No license file is currently included in this repository.
