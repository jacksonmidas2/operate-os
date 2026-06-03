# OperateHQ

The operating system for cleaning businesses.

- **Track A** — White-glove install for independent cleaning operators (40% profit share).
- **Track B** — Two-sided marketplace ("Uber for Cleaning").

One codebase serves both.

## Quick start (local dev on Windows)

Prerequisites: Node 20+, Docker Desktop.

```bash
# 1. Install deps
npm install

# 2. Boot dev infrastructure (Postgres + MinIO + maildev)
npm run db:up

# 3. Generate Prisma clients
npm run control:generate
npm run tenant:generate

# 4. Apply control-plane migrations
npm run control:migrate

# 5. Run the app
npm run dev
```

Then visit:

- **App** — http://operatehq.localhost:3000 (or http://localhost:3000)
- **MinIO console** — http://localhost:9001 (user: `operate` / pass: `operate-secret`)
- **maildev (catches outgoing email)** — http://localhost:1080

## Tenant addressing

- Subdomain in prod: `mm.operatehq.app` → tenant `mm`.
- Path fallback in dev: `localhost:3000/t/mm` works without DNS.
- Most modern browsers route `*.localhost` → 127.0.0.1, so `mm.operatehq.localhost:3000` works out of the box.

## Deployment

See `infra/azure/README.md` for Azure-specific deployment notes. The stack is
portable to any Docker host + Postgres 16+ environment.

The `apps/web/Dockerfile` builds a production image from the monorepo root.

## Architecture

Database-per-tenant. One **control-plane DB** holds tenants, users, role assignments, profit-share configs. Each tenant gets its **own database** with the operational schema (clients, jobs, invoices, employees, etc.).

```
apps/web                    Next.js 15 App Router — all 4 role areas
packages/db-control         Prisma schema for control plane
packages/db-tenant          Prisma schema template for each tenant DB
packages/providers          Interfaces: Payments, Accounting, Payroll, Messaging, OCR, AI
packages/tenant-router      Per-request Prisma client factory
infra/                      (Phase 14) Azure deployment manifests
```

See `memory/project_v1_decisions.md` for the locked architectural decisions.
