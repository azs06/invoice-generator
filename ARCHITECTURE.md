# Architecture

## Overview

FreeInvoice.info is a SvelteKit (Svelte 5) application deployed to Cloudflare Workers.
The UI runs client-side (SSR disabled), while server routes provide auth, data access,
PDF generation, and admin operations. Invoice data is stored in Cloudflare D1 for
authenticated users, and IndexedDB for guests.

## Runtime + Deployment

- Framework: SvelteKit 2 + Vite (see `package.json`).
- Rendering: SSR disabled in `src/routes/+layout.ts` for SPA behavior.
- Adapter: Cloudflare Workers (`svelte.config.js`).
- Cloudflare bindings: D1 (`DB`), R2 (`BUCKET`), Browser Rendering (`BROWSER`)
  configured in `wrangler.toml`.
- Auth: Better Auth with D1-backed sessions and Google OAuth (`src/lib/server/auth.ts`).

## High-Level Data Flow

```
Browser UI
  -> /api/auth/* (Better Auth, session cookies)
  -> /api/invoices/* (CRUD in D1)
  -> /api/pdf (Cloudflare Browser Rendering + optional R2 storage)
  -> /shared/[token] (public invoice view)

Cloudflare D1 (SQLite)
  - users, sessions, accounts
  - invoices (JSON payload + pdfKey)
  - share links + link views

Cloudflare R2
  - stored PDFs per user/invoice
```

## Routing + Pages

- App shell: `src/routes/+layout.svelte`
  - Header/Footer for all routes except `/shared/*`
  - Admin status injected via `src/routes/+layout.server.ts`
- Home (invoice editor + preview): `src/routes/+page.svelte`
- Dashboard (logged-in): `src/routes/dashboard/+page.svelte` + `+page.server.ts`
- History (guest IndexedDB): `src/routes/history/+page.svelte`
- Invoice view (private): `src/routes/invoice/[id]/*`
- Shared invoice (public): `src/routes/shared/[token]/*`
- Admin area: `src/routes/admin/*` guarded by `+layout.server.ts`

## State + UI Composition

- Reusable components in `src/components/*` and `src/components/dashboard/*`.
- Stores:
  - `src/stores/pageSettingsStore.ts` (page size, margins, view mode)
  - `src/stores/templateStore.ts` (template selection)
  - `src/lib/stores/currency.ts` (currency selection)
- Templates: registry and dynamic imports in `src/lib/templates/*`.
- i18n: `src/lib/i18n/*` using `svelte-i18n`.

## Data Layer

### Authenticated users (D1)

- Client API wrapper: `src/lib/db.ts`
- Server data access: `src/lib/server/db.ts`
  - Invoices stored as JSON in `invoices.data`
  - Invoice limit enforced at 12; oldest invoice pruned when limit exceeded
- Schema: `src/lib/server/schema.ts`

### Guest users (IndexedDB)

- IndexedDB via `idb-keyval` in `src/lib/guestDb.ts`
- Used by home page and `/history` without server calls

## PDF Generation

- Shared logic: `src/lib/pdfGenerator.ts`
- Logged-in flow:
  - `/api/pdf` uses Cloudflare Browser Rendering (Puppeteer)
  - PDF stored in R2 when possible, pdfKey saved in D1
  - Client receives `X-Storage-Status` header
- Guest flow:
  - Client-side `html2pdf.js` fallback only

## Sharing

- API: `src/routes/api/invoices/[id]/share/+server.ts`
  - Creates share token with expiry (min 30 days, max 90 days, respects due date)
- Public page: `src/routes/shared/[token]/+page.svelte`
  - Loads invoice via `+page.server.ts`
  - Logs view in `link_views`

## Admin

- Guarded layout: `src/routes/admin/+layout.server.ts`
- User management endpoints:
  - `/api/admin/users/*` for list, ban/unban, role changes, soft delete, restore, destroy
- Super admins are configured by `SUPER_ADMIN_EMAILS` in `wrangler.toml`.

## Key Request Handlers

- Auth: `src/routes/api/auth/[...all]/+server.ts`
- Invoice CRUD: `src/routes/api/invoices/*`
- PDF: `src/routes/api/pdf/+server.ts`
- Admin: `src/routes/api/admin/users/*`

## Directory Map

- `src/routes/` pages + API endpoints
- `src/components/` UI blocks
- `src/lib/` shared utilities (auth client, db client, PDF generation, templates, i18n)
- `src/lib/server/` server-only auth/db/session helpers
- `src/stores/` Svelte stores for UI state
- `tests/` Playwright specs

