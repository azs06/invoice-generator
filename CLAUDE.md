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
- **Deployment**: `@sveltejs/adapter-cloudflare` → Cloudflare Workers, config in `wrangler.toml` (bindings: `DB` = D1, `BUCKET` = R2, `BROWSER` = Browser Rendering, `EMAIL` = Email Sending (`send_email`), `AI` = Workers AI (`[ai]`), `ASSETS`; secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`; var: `SUPER_ADMIN_EMAILS`)

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
- `clients` (Pro): saved address-book contacts (`name` required, `email`, `phone`, `address`, `notes`) per `userId`. Fills an invoice's "bill to" from a saved client; create/edit are Pro-gated, reading/using existing clients is not.
- `recurring_schedules` (Pro): `sourceInvoiceId` (cloud invoice to clone; plain text, no FK — cron deactivates orphans), `frequency` (`weekly`|`monthly`|`yearly`), `nextRunAt`, `lastRunAt`, `recipientEmail`, `active`, per `userId`. Driven by the Workers Cron trigger (see Deployment).
- `reminder_settings` (Pro): overdue-invoice reminders — `invoiceId` (cloud invoice; plain text, no FK — cron deactivates orphans), `recipientEmail`, `remindAfterDays` (days past due before the first reminder and the re-send cadence), `lastSentAt`, `active`, per `userId` (one config per invoice). Driven by the same Workers Cron trigger (see Deployment).

### Routes

Pages:

- `/` — invoice editor (main state in `src/routes/+page.svelte` with `$state`; auto-save via `$effect`)
- `/dashboard` — cloud invoice list, stats, filters (components in `src/components/dashboard/`)
- `/dashboard/settings` — user settings (invoice prefix, currency)
- `/dashboard/reports` — Pro reports (revenue by month, outstanding, top clients; aggregated in JS, grouped per currency)
- `/admin`, `/admin/deleted` — admin panel (user management, ban, soft/hard delete, roles)
- `/shared/[token]` — public shared-invoice view (records views)
- `/invoice/[id]`, `/saved-invoices`, `/history` — invoice viewing/listing
- `/about`, `/features`, `/how-it-works` — static pages

API endpoints (`src/routes/api/`):

- `api/auth/[...all]` — Better Auth handler
- `api/invoices` (GET/POST), `api/invoices/[id]` (GET/PUT/DELETE), `api/invoices/[id]/archive`, `api/invoices/[id]/download` (PDF from R2), `api/invoices/[id]/share` (share link management), `api/invoices/[id]/email` (POST — send invoice via Cloudflare Email Sending; Pro-gated, rate-limited, attaches R2 PDF if present; returns 503 without the `EMAIL` binding)
- `api/pdf` — server-side PDF generation (auth required)
- `api/ai/invoice-from-text` (POST — body `{ text }`, 20–4000 chars) — extract structured invoice fields (bill-to, items, due date, notes) from free-form text via Cloudflare Workers AI (`env.AI.run`, model `@cf/google/gemma-4-26b-a4b-it`); Pro-gated, rate-limited 30/day, returns 503 without the `AI` binding. Output is prompted-JSON, parsed + schema-validated server-side (`src/lib/server/aiInvoice.ts`) — raw model text is never returned; the editor merges the result via a preview/apply step (`AiFillModal.svelte`)
- `api/recurring` (GET list / POST create — Pro-gated create), `api/recurring/[id]` (PUT update / DELETE) — recurring invoice schedules; validates `frequency` + `recipientEmail`
- `api/reminders` (GET list / POST create — Pro-gated create), `api/reminders/[id]` (PUT update / DELETE) — overdue-invoice reminders; ownership-checked, validates `recipientEmail` + `remindAfterDays` (1–90), one config per invoice
- `api/clients` (GET list / POST create — Pro-gated create), `api/clients/[id]` (PUT update / DELETE) — client address book; ownership-checked, validates `name` + optional `email`
- `api/user/settings`
- `api/admin/users`, `api/admin/users/deleted`, `api/admin/users/[id]/{ban,delete,destroy,restore,role}`

### PDF Pipeline

- **Client-side** (guest/fallback): html2pdf.js in `src/lib/pdfGenerator.ts`.
- **Server-side** (signed-in users): `POST /api/pdf` receives rendered HTML + page settings, launches Cloudflare Browser Rendering (`@cloudflare/puppeteer` via `env.BROWSER`), produces the PDF, stores it in R2, and records `pdfKey` on the invoice. `GET /api/invoices/[id]/download` serves the stored PDF. In plain `npm run dev` there is no `BROWSER` binding, so the endpoint returns 503 — use `npm run dev:cf` to test it.

### Template System

- Registry: `src/lib/templates/registry.ts` maps 8 template IDs (`modern`, `simple`, `standard`, `classic`, `minimal`, `atlantic`, `compact`, `executive`) to lazily imported Svelte components plus metadata (name, tags, preview). All templates are free — a premium flag existed briefly but was removed by decision (2026-07-14); templates are not gated.
- Template components live in `src/lib/templates/components/`; `migration.ts` handles template ID migrations; see `src/lib/templates/README.md` for authoring notes.

### Share Links

- Created via `POST /api/invoices/[id]/share`; tokens stored in `shared_links` with expiry and revocation. `/shared/[token]` renders the invoice publicly and logs each view to `link_views` and increments `viewCount`.

### Other Lib Modules

- `src/lib/InvoiceCalculator.ts` — pure tax/discount/total math
- `src/lib/invoiceValidation.ts`, `src/lib/invoiceExport.ts`
- `src/lib/currency.ts` + `src/lib/stores/currency.ts` — currency formatting/store
- `src/lib/theme.ts` — dark mode store; `src/lib/useSelection.svelte.ts` — runes-based selection helper
- `src/stores/` — invoice, page-settings, and template stores (`invoiceStore.ts`, `pageSettingsStore.ts`, `templateStore.ts`)

### Analytics (funnel/conversion)

Privacy-friendly funnel instrumentation for the monetization plan, split across two systems:

- **Cloudflare Web Analytics** — the page-level beacon already in `src/app.html` (traffic/pageviews only; it cannot record custom events).
- **Workers Analytics Engine** — custom product events. Binding `METRICS` (`analytics_engine_datasets` in `wrangler.toml` only, not `wrangler.build.toml`), dataset **`invoice_events`**. Typed in `src/app.d.ts` (`METRICS?: AnalyticsEngineDataset`).

The single helper is `src/lib/server/analytics.ts` → `trackEvent(env, name, { plan?, source?, gate? })`. It writes one data point (`blob1`=event name, `blob2`=plan, `blob3`=source, `blob4`=gate; `double1`=1; `index1`=event name). It **fails open**: wrapped in try/catch, no-ops when `METRICS` is absent (plain `npm run dev`), and `writeDataPoint` needs no `await` (flushes in the background — no request delay). It's declared with a local `MetricsBinding` interface so the esbuild-bundled Cron path can import it (relative import, like `email.ts`). Analytics is **not** gated by `MONETIZATION_ENABLED` — it records for everyone (guest/free/pro).

**No PII**: no user ids, emails, IPs, or invoice content ever enter a data point. Per-user questions ("invoices per user", "signup → first invoice") are answered at cohort level from aggregate counts.

Event taxonomy (all `blob1`):

| Event | Where fired | Key dims |
| --- | --- | --- |
| `signup` | Better Auth `databaseHooks.user.create.after` (`auth.ts`) | source=user |
| `invoice_created` | POST `/api/invoices` (creates only, not auto-save updates) | plan |
| `pdf_generated` | POST `/api/pdf` (Browser Rendering success) | plan |
| `pdf_downloaded` | GET `/api/invoices/[id]/download` (R2 PDF) | plan |
| `share_created` | POST `/api/invoices/[id]/share` | plan |
| `email_sent` | POST `/api/invoices/[id]/email` (source=user); recurring cron (source=cron) | plan, source |
| `reminder_created` | POST `/api/reminders` | plan |
| `reminder_sent` | overdue-reminder cron (`reminders.ts`) | source=cron |
| `recurring_created` | POST `/api/recurring` | plan |
| `client_created` | POST `/api/clients` | plan |
| `ai_fill_used` | POST `/api/ai/invoice-from-text` (usable extraction) | plan |
| `checkout_started` | GET `/api/billing/checkout` (valid plan) | plan, source=billing plan |
| `gate_blocked` | `entitlements.ts` 402s (`requirePro` + save gates) + share limit | plan=free, gate (route id / gate name) — **highest-signal conversion event** |
| `guest_invoice_created` | client: local-mode auto-save, deduped per invoice id (`+page.svelte`) | plan=guest, source=web |
| `guest_pdf_downloaded` | client: guest html2pdf path (`+page.svelte`) | plan=guest, source=web |
| `signup_prompt_shown` | client: `SignUpPromptModal` shown | plan=guest, source=web |
| `upgrade_prompt_shown` | client: `UpgradePromptModal` shown | plan, source=web |

Guest/browser events (last 4) fire-and-forget via `src/lib/analytics.ts` (`track`/`trackOnce`, uses `navigator.sendBeacon` with a keepalive-fetch fallback, never throws) → `POST /api/track`, which accepts only that 4-name allowlist, needs no auth, and is lightly throttled by a per-isolate in-memory sliding window keyed by client IP (best-effort; resets on cold start — deliberately no D1 write per beacon).

**Querying**: there is **no** `wrangler` CLI subcommand for this — use the Analytics Engine **SQL HTTP API** (`POST https://api.cloudflare.com/client/v4/accounts/<account_id>/analytics_engine/sql` with a `Bearer` token and the SQL as the request body). Columns are `blob1..blob20`, `double1..double20`, `index1`. Because rows may be sampled, count with `SUM(_sample_interval)` rather than `COUNT(*)`. Example — gate hits by gate over the last day:

```sql
SELECT blob4 AS gate, SUM(_sample_interval) AS hits
FROM invoice_events
WHERE blob1 = 'gate_blocked' AND timestamp > NOW() - INTERVAL '1' DAY
GROUP BY gate ORDER BY hits DESC
```

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

- Cloudflare **Workers** via `@sveltejs/adapter-cloudflare`. The wrangler `main` is a **wrapper worker** (`worker.js`) that re-exports the adapter-generated worker and adds a `scheduled` (Cron) handler. The adapter only emits a `fetch` handler, and it always overwrites its own `main`, so it is pointed at a build-only config (`wrangler.build.toml`, via the `config` option in `svelte.config.js`) that makes it emit to `.svelte-kit/cloudflare/_worker.js` — which `worker.js` then imports. Keep `name`/`compatibility_date`/`[assets]` in sync between `wrangler.toml` and `wrangler.build.toml`.
- **Cron**: `[triggers] crons = ["0 * * * *"]` (hourly) in `wrangler.toml` runs two engines from `worker.js`'s `scheduled` handler: the recurring-invoices engine (`src/lib/server/recurring.ts` → `runDueSchedules`) and the overdue-reminder engine (`src/lib/server/reminders.ts` → `runDueReminders`, which emails clients via `sendReminderEmail`). Those modules and their imports are bundled by wrangler/esbuild (not Vite), so they must avoid Vite-only runtime aliases (`$lib`/`$components`/`$app/*` as value imports); `import type` from `$lib` is fine (stripped at build time). Like recurring, the reminder engine has no `RequestEvent` so it does no monetization check — it only processes configs users could create through the Pro-gated API.
- Deploy with `npm run deploy`. Secrets are set with `wrangler secret put <NAME>`.
- The adapter's `platformProxy` gives local access to bindings under `wrangler dev` (`npm run dev:cf`), persisted in `.wrangler/state`.
- **New D1 migrations** are hand-written SQL in `migrations/` and applied with `wrangler d1 execute invoice-db --local|--remote --file=./migrations/<file>.sql` (see the header comment in each migration).

## Related Docs

- `docs/MONETIZATION.md` — current monetization strategy and roadmap
- `docs/POLAR_SETUP.md` — Polar billing setup, launch checklist, deployment commands
- `docs/archive/PLAN.md` — historical plan (superseded; do not follow)
- `AGENTS.md` — commands, code style, structure

## Playwright Testing Cleanup

When using Playwright MCP to take screenshots during testing, always delete any `.png` files created in the project root and `.playwright-mcp/` directory before finishing. These are ephemeral test artifacts and should not be committed.
