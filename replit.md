# WorkerConnect

A full-stack worker marketplace platform connecting skilled workers (plumbers, electricians, carpenters, etc.) with jobs, featuring Worker and Admin roles.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/worker-connect run dev` — run the frontend (Vite)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Wouter (routing) + Tanstack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Auth: JWT (`jsonwebtoken`) + phone OTP (demo/mock stored in DB)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/db/src/schema/` — Drizzle table definitions (workers, jobs, applications, payouts, otps, admins)
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit manually)
- `lib/api-zod/src/generated/` — generated Zod schemas (do not edit manually)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — JWT auth middleware
- `artifacts/worker-connect/src/pages/` — React pages (login, register, worker/*, admin/*)
- `artifacts/worker-connect/src/components/` — Shared components + worker-layout, admin-layout

## Architecture decisions

- **OTP auth is demo-mode**: OTP codes are generated and stored in the `otps` table. In dev, the code is logged server-side (not sent via SMS). Wire up Firebase/Twilio to go live.
- **Payout stub**: `POST /payouts` immediately marks the payout as `paid` with a `WC-{timestamp}` reference. Wire up Razorpay Payouts API before going live.
- **JWT stored in localStorage**: Token key `workerconnect_token`, role key `workerconnect_role`, worker ID key `workerconnect_worker_id`.
- **Auth middleware**: `authenticate`, `requireWorker`, `requireAdmin` in `middlewares/auth.ts`.
- **Shared proxy routes**: API lives at `/api/*`, frontend at `/`. Never call service ports directly.

## Product

**Worker Portal:**
- Phone OTP login + registration with skill/city/UPI
- Browse & filter open jobs by skill and location
- One-click apply; track application statuses
- Earnings dashboard with payout history
- Toggle online/offline availability
- Edit profile (name, city, UPI ID)

**Admin Panel:**
- Username + password login
- Dashboard with analytics (worker/job/payout stats + charts)
- Workers list: search/filter, suspend/reinstate
- Jobs CRUD: create, edit, cancel, complete; view applicants per job
- Applicants management: accept/reject applications
- Payouts: trigger & track worker payouts

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After changing `lib/db` schema files, always run `pnpm run typecheck:libs` before checking `api-server`.
- Run `pnpm --filter @workspace/db run push` after schema changes to sync the database.
- Admin seed: `node` inline script using `lib/db/node_modules/pg` and `artifacts/api-server/node_modules/bcrypt`. Default: `admin / admin123`.
- `bcrypt` needs build approval: run `pnpm approve-builds` after install.
- `wouter` Link renders as `<a>` — never wrap it in another `<a>` tag.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
