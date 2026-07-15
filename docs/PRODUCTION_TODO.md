# Production Launch TODO

_Created 2026-07-15. The monetization roadmap (docs/MONETIZATION.md Phases 0–4) is **code-complete** on the `monetization` branch. This is the ordered checklist to take it to production. Work through it top to bottom — the ordering matters (e.g. email DNS before merge, because merge auto-deploys the cron that sends email)._

Companion docs: `docs/POLAR_SETUP.md` (billing specifics), `docs/MONETIZATION.md` (strategy/roadmap), `docs/COST_ANALYSIS.md` (per-user cost vs. fee).

---

## Stage 1 — Pre-merge verification (local, no production impact)

- [ ] **Apply migrations locally** so the new features have tables under `wrangler dev`:
  ```bash
  wrangler d1 execute invoice-db --local --file=./migrations/0003_recurring_schedules.sql
  wrangler d1 execute invoice-db --local --file=./migrations/0004_clients.sql
  wrangler d1 execute invoice-db --local --file=./migrations/0005_reminder_settings.sql
  ```
- [ ] **Runtime smoke test under `npm run dev:cf`** — none of the Phase 3/4 features have ever executed, only typechecked/built. Walk each flow signed in:
  - [ ] Create/edit/delete a client; fill bill-to from the picker
  - [ ] Create a recurring schedule from History; confirm it lists in Settings
  - [ ] Set an overdue reminder; confirm it lists in Settings
  - [ ] AI fill: paste text, verify Gemma-4 extraction quality and the preview→apply merge (needs the `AI` binding — `dev:cf` provides it; this call hits the real Workers AI API)
  - [ ] Reports page with a few paid/unpaid invoices (check currency grouping, overdue split)
  - [ ] Pay-this-invoice: enable payment details, open the shared page, see the Pay section
  - [ ] Send an invoice email (will fail with `E_SENDER_NOT_VERIFIED` until Stage 2 DNS — a clean 4xx/5xx with a sensible message is the pass criterion for now)
- [ ] **Gate dry-run with the flag ON** (`MONETIZATION_ENABLED = "true"` locally only): as a free user, verify each 402 path fires and the UI shows the upgrade prompt — server PDF, 4th share link, 11th cloud invoice, newly enabling payment details, recurring create, reminder create, client create, AI fill, email send. **The 402 paths have never executed anywhere.** Revert the flag to `"false"` before committing anything.
- [ ] **Cron dry-run**: `wrangler dev` supports triggering scheduled events (`curl "http://localhost:<port>/__scheduled?cron=0+*+*+*+*"` with `--test-scheduled`); verify `runDueSchedules` + `runDueReminders` execute without error against local D1 (with a due schedule seeded).
- [ ] Optional but recommended: a few Playwright tests for the highest-risk paths (402 gates, ownership checks on `/api/clients|reminders|recurring/[id]`).

## Stage 2 — One-time platform onboarding (safe to do anytime, required before merge)

- [ ] **Email DNS**: `wrangler email sending enable freeinvoice.info`, then add the SPF/DKIM records Cloudflare returns. Verify with a real send from `dev:cf` (or a temporary test route) once records propagate. _Until this is done, every cron/user email fails with `E_SENDER_NOT_VERIFIED` — this is why it precedes merge._
- [ ] **Remote D1 migrations** (additive only — no risk to existing tables, also fine to do pre-merge):
  ```bash
  wrangler d1 execute invoice-db --remote --file=./migrations/0003_recurring_schedules.sql
  wrangler d1 execute invoice-db --remote --file=./migrations/0004_clients.sql
  wrangler d1 execute invoice-db --remote --file=./migrations/0005_reminder_settings.sql
  ```
  Confirm migrations 0001/0002 are already applied remotely first (`wrangler d1 execute invoice-db --remote --command "SELECT name FROM sqlite_master WHERE type='table'"`); apply them if not (subscriptions/rate-limit tables are prerequisites for the code already on main-bound branch).
- [ ] **Verify the Analytics Engine dataset** appears after first deploy (no pre-provisioning needed; `invoice_events` is created on first write). Save an API token with Analytics read permission for querying (SQL HTTP API — see CLAUDE.md → Analytics).

## Stage 3 — Merge & deploy (features go live, monetization still dark)

- [ ] Open PR `monetization` → `main`, review, merge. **Merge auto-deploys.**
- [ ] Post-deploy verification in production (everything is free-for-all while the flag is `"false"` — that's expected):
  - [ ] Recurring + reminders + clients + AI fill + reports work signed in
  - [ ] An invoice email actually delivers (DNS from Stage 2)
  - [ ] The hourly cron runs clean (check `wrangler tail` or the Workers dashboard around the top of the hour)
  - [ ] Analytics events arrive: query `invoice_events` for the last hour
- [ ] Let it bake for a few days; watch Cloudflare usage dashboards (Browser Rendering, Workers AI, Email) against `docs/COST_ANALYSIS.md` expectations.

## Stage 4 — Polar billing activation (see docs/POLAR_SETUP.md for details)

- [ ] Create products in the Polar **sandbox**: Pro Monthly $6, Pro Annual $49, Lifetime (one-time, capped window)
- [ ] Set sandbox secrets in `.dev.vars`; end-to-end test checkout → webhook → `subscriptions` row → `locals.tier = 'pro'` under `dev:cf`
- [ ] Create the same products in **production** Polar; register the webhook endpoint (`/api/billing/webhook`)
- [ ] Set production secrets:
  ```bash
  wrangler secret put POLAR_ACCESS_TOKEN
  wrangler secret put POLAR_WEBHOOK_SECRET
  ```
  plus any `POLAR_PRODUCT_*` ids the checkout route expects (see POLAR_SETUP.md)
- [ ] One real production test purchase (refund it via Polar afterwards) verifying the full loop: checkout → webhook → tier flips to pro → gates open → customer portal reachable

## Stage 5 — Flag flip (the actual monetization launch)

- [ ] Announce ahead of time if there are existing active users (server PDF and 4+ share links stop being free — grandfathering protects stored *data*, not previously-free *actions*)
- [ ] Set `MONETIZATION_ENABLED = "true"` in `wrangler.toml`, commit, deploy
- [ ] Immediately verify as a free account: gates return 402 with the upgrade prompt; as the Pro test account: everything works
- [ ] Watch `gate_blocked` vs `checkout_started` in Analytics Engine daily for the first weeks — this ratio is the pricing/gating feedback loop
- [ ] Launch the lifetime deal + annual push (Phase 2 announce item)

## Stage 6 — Post-launch guardrails

- [ ] Weekly: infra cost per active user (Cloudflare dashboards) vs. `docs/COST_ANALYSIS.md`; re-verify pricing assumptions monthly
- [ ] Watch KPIs from MONETIZATION.md §6: guest→signup, signup→first-invoice, free→Pro (2–5% is healthy), monthly-vs-annual churn
- [ ] Revisit parked items only on trigger events: Stripe Connect (requires an entity), SSLCommerz/bKash (after v1 payment links prove demand), BD regional pricing

---

## Known non-blockers (tracked, deliberately deferred)

- No Playwright coverage for the new Phase 3/4 surface (Stage 1 has the manual pass; add tests opportunistically)
- Client address book fills `invoiceTo` as text; a structured client field on the invoice would improve reports' per-client accuracy later
- Gemma 4 has no native JSON mode — extraction quality should be sanity-checked in Stage 1 and revisited if 422 rates are high (a pricier model with `json_schema` support is a one-constant change in `src/lib/server/aiInvoice.ts`)
