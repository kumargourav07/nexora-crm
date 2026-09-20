# NEXORA CRM — 360° Full-Stack Enterprise Platform

> **One CRM. Your entire business, connected.**  
> Capture leads, manage workforce presence, automate GST billing, and orchestrate omnichannel lead connectors in a unified, multi-tenant SaaS workspace.

---

## 🌟 Overview

**NEXORA CRM** is a production-grade, full-stack CRM and marketing application built for high-growth enterprise sales and operations teams. It bridges the gap between omnichannel customer lead capture, workforce attendance, financial invoicing with automated GST, and cross-channel analytics.

---

## 🏛️ Architecture & Route Structure

The project implements a clean dual-tier architecture:

```text
/                          # High-converting marketing landing page (100% intact)
├── /demo                  # Public interactive demo preview (mock/simulated)
│   ├── /demo/leads
│   ├── /demo/pipeline
│   ├── /demo/employees
│   ├── /demo/invoices
│   ├── /demo/integrations
│   └── /demo/analytics
│
├── /login                 # Secure login page (with demo credentials helper)
├── /signup                # Multi-tenant workspace registration (OWNER role)
│
└── /app                   # Authenticated Multi-Tenant Production CRM
    ├── /app/dashboard     # Live PostgreSQL aggregated metrics & revenue velocity
    ├── /app/leads         # Full-text search, multi-filter, paginated DB leads
    ├── /app/pipeline      # Real-time deal stages with persistent DB updates
    ├── /app/employees     # HRMS roster & attendance state synchronization
    ├── /app/invoices      # GST-compliant invoicing with server-side totals
    ├── /app/integrations  # Database-backed lead connector states
    └── /app/analytics     # 360° acquisition ROI and conversion intelligence
```

---

## 🗄️ Database (PostgreSQL + Prisma ORM)

- **PostgreSQL**: Relational database engine powering all workspace records.
- **Prisma ORM**: Type-safe query engine with relational schemas, cascade rules, and connection pooling singleton (`src/lib/prisma.ts`).
- **Models**:
  - `User`: Accounts with bcrypt-hashed passwords.
  - `Workspace`: Enterprise tenant organization.
  - `Membership`: Multi-tenant membership with `OWNER`, `ADMIN`, `MEMBER` roles.
  - `Lead`: Inbound leads with values in Decimal, sources, statuses, tags, notes.
  - `Employee`: Workforce directory with department, role, location, attendance states.
  - `Invoice`: GST invoices with itemized ledger entries and server-calculated totals.
  - `InvoiceItem`: Line items with quantity, unit rate, and calculated amounts.
  - `Integration`: Connector records for Facebook, IndiaMART, 99acres, Housing, Google Ads, WhatsApp, Website, and Custom API.
  - `Activity`: Audit trail log for lead and deal events.
  - `Notification`: In-app system alerts.

---

## 🔐 Authentication & Workspace Isolation

- **Secure Session Management**: Signed JWT encrypted session stored in HTTP-only, secure, SameSite cookies via `jose`.
- **Password Hashing**: `bcryptjs` with 10 salt rounds. Plaintext passwords are never stored.
- **Strict Multi-Tenant Isolation**: Every database query and mutation retrieves `workspaceId` strictly from the verified session token. Client-supplied tenant IDs are never trusted.
- **Role Permissions**:
  - `OWNER`: Full administrative and workspace billing control.
  - `ADMIN`: Manage CRM leads, workforce, and invoices.
  - `MEMBER`: View and update standard CRM records.

---

## 🛠️ Local Setup Guide

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create `.env` or `.env.local` in the project root based on `.env.example`:

```bash
cp .env.example .env.local
```

Populate the required environment variables:

```env
# PostgreSQL Connection URL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nexora_crm?schema=public"

# Auth Secret (generate with `openssl rand -base64 32`)
AUTH_SECRET="your-development-auth-secret-key-at-least-32-chars-long"

# Application URL
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

### 3. Initialize Database & Run Migrations

Generate Prisma Client and push the schema to your PostgreSQL database:

```bash
npx prisma generate
npx prisma db push
# or for migrations:
# npx prisma migrate dev --name init
```

### 4. Seed Database with Realistic Demo Data

Run the seeding script to populate realistic workspaces, users, leads, workforce, and invoices:

```bash
npx prisma db seed
```

> **Default Seed Accounts:**
> - **Demo User**: `demo@nexora.local` / `Nexora@2026` (OWNER)
> - **Rahul Sharma**: `rahul@nexora.local` / `Nexora@2026` (ADMIN)
> - **Priya Mehta**: `priya@nexora.local` / `Nexora@2026` (ADMIN)
> - *Note: All seed data is strictly fictional.*

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the marketing site, or [http://localhost:3000/login](http://localhost:3000/login) to log into the authenticated CRM workspace.

---

## 📦 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Next.js development server with Turbopack |
| `npm run build` | Compiles production bundle & type checks |
| `npm run start` | Launches optimized production server |
| `npm run lint` | Runs ESLint for syntax & style verification |
| `npm run type-check` | Runs TypeScript validation (`tsc --noEmit`) |
| `npm run db:generate` | Generates Prisma client types |
| `npm run db:push` | Pushes Prisma schema to database without migrations |
| `npm run db:seed` | Seeds database with demo records |

---

## 🚀 Production Deployment (Vercel Ready)

1. Connect your GitHub repository to **Vercel**.
2. Add your production environment variables in Vercel Project Settings:
   - `DATABASE_URL`: Connection string to hosted PostgreSQL (e.g. Supabase, Neon, AWS RDS, Railway, Neon).
   - `AUTH_SECRET`: Random 32+ character cryptographic secret.
3. Deploy! Next.js App Router and Prisma client will build automatically.

---

## 📄 License

&copy; 2026 NEXORA Technologies. All rights reserved.
