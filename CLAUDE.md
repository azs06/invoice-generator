# CLAUDE.md

This file provides guidance to AI coding agents working with code in this repository.

## Project Overview

FreeInvoice.info — a SvelteKit 2.x invoice generator using Svelte 5 runes, deployed to **Cloudflare Workers** (not Pages). It supports two storage modes: a guest/local mode (IndexedDB, no account) and a cloud mode (Google sign-in, invoices stored in Cloudflare D1, PDFs in R2).

## Tech Stack

- **Framework**: SvelteKit 2.16+ with Svelte 5 (runes), TypeScript (strict)
- **Styling**: Tailwind CSS 4.1+
- **Auth**: Better Auth with Google OAuth (`src/lib/server/auth.ts`), sessions in D1
- **Database**: Cloudflare D1 (SQLite) via Drizzle ORM (`src/lib/server/schema.ts`, `src/lib/server/db.ts`)
- **Object storage**: Cloudflare R2 (stored invoice PDFs)
- **Server PDF**: Cloudflare Browser Rendering via `@cloudflare/puppeteer` (`src/routes/api/pdf/+server.ts`)
- **Client PDF**: html2pdf.js (guest/local fallback, `src/lib/pdfGenerator.ts`)
- **Local storage**: IndexedDB via `idb-keyval` (`src/lib/localDb.ts`; `src/lib/guestDb.ts` is a deprecated re-export)
- **i18n**: svelte-i18n, English (`en.json`) + Bengali (`bn.json`) in `src/lib/i18n/`
- **Deployment**: `@sveltejs/adapter-cloudflare` → Cloudflare Workers, config in `wrangler.toml` (bindings: `DB` = D1, `BUCKET` = R2, `BROWSER` = Browser Rendering, `ASSETS`; secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`; var: `SUPER_ADMIN_EMAILS`)

## Development Commands

```bash
npm run dev              # Vite dev server (NO Cloudflare bindings; server PDF returns 503)
npm run dev:cf           # Build + wrangler dev with D1/R2/Browser bindings
npm run build            # Production build
npm run preview          # Preview production build
npm run check            # svelte-check type checking
npm run check:watch      # Type checking in watch mode
npm run format           # oxfmt + prettier (Svelte files)
npm run lint             # oxlint
npm run deploy           # Build + wrangler deploy to Cloudflare Workers
npm run test             # Playwright tests (also test:ui, test:headed)
```

## Architecture

### Dual Storage Modes

- **Guest/local mode** (no login): invoices live in IndexedDB via `src/lib/localDb.ts` (`ig.invoice.*` keys). `SignUpPromptModal.svelte` nudges guests to sign up; `CloudModeBanner.svelte` reflects the active mode.
- **Cloud mode** (signed in): invoices are persisted to D1 through `/api/invoices` CRUD endpoints as a JSON blob in the `invoices` table. Server-rendered PDFs are cached in R2 (`pdfKey` column).

### Auth & Data Flow

- `src/hooks.server.ts` wires Better Auth; `createAuth(env)` in `src/lib/server/auth.ts` builds a per-request instance backed by D1 via the Drizzle adapter. Google OAuth only. Session/user land on `event.locals`.
- `src/lib/auth.ts` is the client-side auth helper; `src/lib/server/session.ts` provides `requirePlatform`/`getBucket` helpers for endpoints.
- Admin access is role-based (`user.role`), bootstrapped from `SUPER_ADMIN_EMAILS`.

### D1 Schema (`src/lib/server/schema.ts`)

- Better Auth tables: `user` (with `role`, `isBanned`, `deletedAt` soft delete), `session`, `account`, `verification`
- `invoices`: `id`, `data` (JSON string of the full invoice), `userId`, `pdfKey` (R2 key), `pdfGeneratedAt`, timestamps
- `shared_links`: token, expiry, `revoked`, `viewCount`, `lastViewedAt` per invoice
- `link_views`: per-view log (linkId, viewedAt, ipAddress, userAgent)
- `user_settings`: `invoicePrefix`, `preferredCurrency` per user

### Routes

Pages:

- `/` — invoice editor (main state in `src/routes/+page.svelte` with `$state`; auto-save via `$effect`)
- `/dashboard` — cloud invoice list, stats, filters (components in `src/components/dashboard/`)
- `/dashboard/settings` — user settings (invoice prefix, currency)
- `/admin`, `/admin/deleted` — admin panel (user management, ban, soft/hard delete, roles)
- `/shared/[token]` — public shared-invoice view (records views)
- `/invoice/[id]`, `/saved-invoices`, `/history` — invoice viewing/listing
- `/about`, `/features`, `/how-it-works` — static pages

API endpoints (`src/routes/api/`):

- `api/auth/[...all]` — Better Auth handler
- `api/invoices` (GET/POST), `api/invoices/[id]` (GET/PUT/DELETE), `api/invoices/[id]/archive`, `api/invoices/[id]/download` (PDF from R2), `api/invoices/[id]/share` (share link management)
- `api/pdf` — server-side PDF generation (auth required)
- `api/user/settings`
- `api/admin/users`, `api/admin/users/deleted`, `api/admin/users/[id]/{ban,delete,destroy,restore,role}`

### PDF Pipeline

- **Client-side** (guest/fallback): html2pdf.js in `src/lib/pdfGenerator.ts`.
- **Server-side** (signed-in users): `POST /api/pdf` receives rendered HTML + page settings, launches Cloudflare Browser Rendering (`@cloudflare/puppeteer` via `env.BROWSER`), produces the PDF, stores it in R2, and records `pdfKey` on the invoice. `GET /api/invoices/[id]/download` serves the stored PDF. In plain `npm run dev` there is no `BROWSER` binding, so the endpoint returns 503 — use `npm run dev:cf` to test it.

### Template System

- Registry: `src/lib/templates/registry.ts` maps 8 template IDs (`modern`, `simple`, `standard`, `classic`, `minimal`, `atlantic`, `compact`, `executive`) to lazily imported Svelte components plus metadata (name, tags, `premium` flag — the flag is currently not enforced anywhere).
- Template components live in `src/lib/templates/components/`; `migration.ts` handles template ID migrations; see `src/lib/templates/README.md` for authoring notes.

### Share Links

- Created via `POST /api/invoices/[id]/share`; tokens stored in `shared_links` with expiry and revocation. `/shared/[token]` renders the invoice publicly and logs each view to `link_views` and increments `viewCount`.

### Other Lib Modules

- `src/lib/InvoiceCalculator.ts` — pure tax/discount/total math
- `src/lib/invoiceValidation.ts`, `src/lib/invoiceExport.ts`
- `src/lib/currency.ts` + `src/lib/stores/currency.ts` — currency formatting/store
- `src/lib/theme.ts` — dark mode store; `src/lib/useSelection.svelte.ts` — runes-based selection helper
- `src/stores/` — invoice, page-settings, and template stores (`invoiceStore.ts`, `pageSettingsStore.ts`, `templateStore.ts`)

### Path Aliases

Configured in `svelte.config.js`:

- `$components` → `src/components`
- `$services` → `src/services`
- `$lib` → `src/lib` (SvelteKit default)

## Svelte 5 Conventions

This codebase uses Svelte 5 runes:

- `$state()` for reactive state, `$derived()` for computed values
- `$effect()` for side effects
- `$props()` for component props (not `export let`)
- Event handlers use `onclick={...}` syntax (not `on:click`)

Maintain this runes-based approach when modifying components.

## Deployment

- Cloudflare **Workers** via `@sveltejs/adapter-cloudflare`; worker entry is `.svelte-kit/cloudflare/_worker.js` (see `wrangler.toml`).
- Deploy with `npm run deploy`. Secrets are set with `wrangler secret put <NAME>`.
- The adapter's `platformProxy` gives local access to bindings under `wrangler dev` (`npm run dev:cf`), persisted in `.wrangler/state`.

## Related Docs

- `docs/MONETIZATION.md` — current monetization strategy and roadmap
- `docs/POLAR_SETUP.md` — Polar billing setup, launch checklist, deployment commands
- `docs/archive/PLAN.md` — historical plan (superseded; do not follow)
- `AGENTS.md` — commands, code style, structure

## Playwright Testing Cleanup

When using Playwright MCP to take screenshots during testing, always delete any `.png` files created in the project root and `.playwright-mcp/` directory before finishing. These are ephemeral test artifacts and should not be committed.
