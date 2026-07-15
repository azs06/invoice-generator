# FreeInvoice.info — Monetization Strategy

_Last updated: 2026-07-14. Based on a full codebase audit. Supersedes the business-model sections of `PLAN.md`, which no longer reflect the actual architecture (magic links → Google OAuth, Pages Functions → SvelteKit Workers routes, KV sessions → Better Auth + D1)._

> **Decisions locked in:**
>
> - **Billing provider: Polar.sh** (Merchant of Record) for Pro subscriptions and the lifetime deal
> - **Pay-this-invoice ships as v1 only** (zero-liability payment links, a Pro feature). **Stripe Connect (v2) and SSLCommerz/bKash (v3) are parked** — both need a legal entity in a Stripe-supported country (a US LLC takes time we're not spending now). See §5B for the parked notes.
>
> Operational launch checklist (products, secrets, webhook, flag flip): `docs/POLAR_SETUP.md`

---

## 1. Where You Actually Are (Codebase Audit)

### Built and working

| Capability | Implementation | Notes |
| --- | --- | --- |
| Auth | Better Auth + Google OAuth, D1 via Drizzle (`src/lib/server/auth.ts`) | Solid foundation; sessions in D1 |
| Cloud invoice storage | `invoices` table (JSON blob) + `/api/invoices` CRUD | Already the "premium" cloud sync from PLAN.md — currently free |
| Guest/local mode | IndexedDB (`guestDb.ts`, `localDb.ts`) + `SignUpPromptModal` | Good freemium funnel shape already exists |
| Server-side PDF | Cloudflare Browser Rendering + R2 (`/api/pdf`, `/api/invoices/[id]/download`) | Was planned as premium-only; currently free to any logged-in user |
| Share links | `shared_links` + `link_views` tables, expiry, revocation, view tracking | This is your natural surface for "pay this invoice" |
| Admin panel | User management, ban, soft/hard delete, roles | Operationally ready for real users |
| Dashboard | Stats, filters, card/table views | Retention surface exists |
| Templates | 8 templates, registry in `src/lib/templates/registry.ts` | All free — premium flags removed 2026-07-14 (see §4) |
| User settings | Invoice prefix, preferred currency | Billing section is a "coming soon" placeholder |
| i18n / themes | English + Bengali, dark mode | Differentiator for the BD market |

### Missing (the gap between you and revenue)

1. **No entitlement system.** There is no `tier`, `plan`, or `subscriptions` concept anywhere in the schema or code. Nothing can be gated until this exists. This is the single prerequisite for everything else.
2. ~~Premium template flags are dead code.~~ **Resolved by decision (2026-07-14):** templates are deliberately all-free; the flags were removed rather than enforced.
3. **Email sending is a stub.** `SendEmailModal.svelte` fakes a send and alerts "available in a future update." Email delivery (invoice + reminders) is one of the strongest paid features in this category.
4. **No rate limiting or quotas on paid infrastructure.** `/api/pdf` invokes Browser Rendering (billed per usage) for any authenticated user with no cap. A single abusive user can run up your Cloudflare bill today. Same for R2 writes.
5. **No analytics or conversion instrumentation.** You cannot answer: How many guests convert to signup? How many invoices per user? What features are used? Pricing decisions without this are guesses.
6. **No recurring invoices, client book, or reports.** These are the features freelancers actually pay for (see §4).
7. **`npm run check` fails** (see AGENTS.md). Charging money raises the bar — a broken typecheck pipeline means regressions ship silently.
8. **Docs drift.** CLAUDE.md still describes a client-only IndexedDB app; PLAN.md describes an architecture you didn't build. Contributors (and AI agents) are being misled.

### Unknowns you should resolve before writing payment code

| Unknown | Why it matters | How to resolve |
| --- | --- | --- |
| **Polar payout eligibility from Bangladesh** | Polar is the chosen MoR, but Polar pays sellers out via **Stripe Connect Express**, so its supported-country list follows Stripe's cross-border payout countries. Bangladesh may not be eligible. | Create a Polar account and attempt payout setup in week one; if blocked, decide on a US LLC (Stripe Atlas ~$500 + ~$300/yr) or an entity elsewhere before Phase 2 |
| ~~Stripe platform account for Connect (§5B v2)~~ | **Resolved by parking it (2026-07-14):** Connect requires your own entity in a Stripe-supported country. Decision: not opening a US LLC now, so Connect (and BYO-API-key alternatives, rejected on security grounds) are off the roadmap. | Revisit only if/when an entity exists |
| Sales tax / VAT exposure | Solved by choosing Polar as MoR — Polar is the merchant and handles global VAT/sales tax for ~4% + 40¢ per transaction. | Confirm fees at signup; no further action |
| Actual usage volume & costs | Browser Rendering, R2, D1 costs per active user are unknown. Free-tier generosity should be set from data. | Add analytics + Cloudflare cost dashboards for 2–4 weeks |
| Willingness to pay in your audience mix | Bengali i18n suggests meaningful BD traffic; $6/mo is priced very differently in Dhaka vs. Denver. | Discount codes / PPP-style coupons in Polar now; true local pricing when bKash/SSLCommerz land |
| Legal name/branding conflict | "FreeInvoice" as a brand fights the paid tier in users' minds. | Keep the free tier genuinely strong; market premium as "FreeInvoice Pro" |

---

## 2. Strategy Overview

**Positioning:** Keep the core generator genuinely free and account-optional — that is your SEO/acquisition engine and your name promises it. Monetize the *business workflow around the invoice*: getting it delivered, getting it paid, and doing it repeatedly.

**Two revenue streams, in order:**

1. **Pro subscription via Polar.sh (build first).** Money flows from your users to you. Polar acts as Merchant of Record — it is the legal seller, handles global VAT/sales tax, checkout, and customer portal for ~4% + 40¢ per transaction. All the app-side infrastructure (auth, D1, gating points) is nearly in place.
2. **Pay-this-invoice (build second, sold as a Pro feature).** Money flows from your users' clients to your users. Higher perceived value ("get paid faster" sells better than "nicer PDFs"). Ship v1 as a zero-liability payment-links version (see §5B). The Stripe Connect upgrade is parked until an entity exists.

---

## 3. Pricing Recommendation

Invoice tools have a low-frequency usage pattern (a freelancer invoices a few times a month), which makes monthly subscriptions churn-prone. Recommendation:

| Plan | Price | Notes |
| --- | --- | --- |
| **Free** | $0 | Unlimited invoices, guest or account, client-side PDF, 5 free templates, 3 active share links, manual everything |
| **Pro Monthly** | **$6/mo** | Anchor price; most competitors (Invoice Simple, Zoho Invoice tiers, Bonsai) sit $9–25 |
| **Pro Annual** | **$49/yr** (~$4/mo) | Push hard toward annual — solves the churn problem and fits episodic usage |
| **Launch Lifetime Deal** | **$99–129 one-time, limited window** | Generates immediate cash + reviews + urgency; cap it (e.g., first 200 buyers) so it doesn't cannibalize forever |
| **BD Regional pricing (later)** | ~৳300–400/mo equivalent via bKash/SSLCommerz | Only after the Polar flow is proven; local rails, local price |

Why not usage credits: metering (per-email, per-PDF) fights the product's simplicity and your brand. Use *quotas within tiers* instead (e.g., 100 emails/mo on Pro) purely as abuse protection.

---

## 4. Free vs. Pro Feature Split

Rule of thumb: **creation is free, workflow is paid.** Never gate something a user already relied on without grandfathering.

| Feature | Free | Pro | Code status |
| --- | --- | --- | --- |
| Invoice creation, editing, unlimited count | ✅ | ✅ | Done |
| Client-side PDF (html2pdf) | ✅ | ✅ | Done |
| Templates | All 8 | All 8 | **Decision 2026-07-14: templates are not gated.** They don't carry the Pro pitch (see risks #5); flags and gates removed from code |
| Cloud save/sync (account) | Last 10 invoices | Unlimited | Storage done; **quota missing** |
| Server-side PDF (Browser Rendering) | ❌ (or 3/mo teaser) | ✅ | Endpoint done; **gating missing** |
| Share links | 3 active, 7-day expiry | Unlimited, custom expiry, view analytics | Done; **limits missing** |
| Email invoice to client + reminders | ❌ | ✅ | **Stub — must build** |
| Recurring invoices | ❌ | ✅ | **Must build** |
| Client address book | ❌ | ✅ | **Must build** |
| Reports (revenue, outstanding, per-client) | ❌ | ✅ | **Built** — `/dashboard/reports` |
| "Pay this invoice" online | ❌ | ✅ | **Must build** (§5B) |
| Remove "Made with FreeInvoice" badge on shared page | ❌ | ✅ | Trivial; add badge first |

The three strongest conversion levers to build (in order): **email sending → recurring invoices → pay-this-invoice.** They map directly to "spend less time, get paid faster."

---

## 5. Payment Architecture

### A. Pro subscriptions (money → you)

**Provider: Polar.sh (decided).**

Why Polar:

- **Merchant of Record** — Polar is the legal seller, so global VAT/sales tax, invoicing, and refunds are its problem, not yours (~4% + 40¢ per transaction, all-inclusive)
- **Developer-first** — TypeScript SDK (`@polar-sh/sdk`), framework adapters, hosted checkout links, hosted customer portal, sandbox environment
- **Better Auth integration** — `@polar-sh/better-auth` plugin plugs directly into the existing Better Auth setup (`src/lib/server/auth.ts`): automatic customer creation on signup, `checkout`/`portal`/`usage` plugin routes, and webhook handling — evaluate it first before hand-rolling endpoints
- Supports subscriptions **and** one-time purchases (covers Pro Monthly/Annual and the Lifetime deal from one dashboard)

⚠️ **Caveat to verify in week one:** Polar pays sellers out via Stripe Connect Express, so payout eligibility follows Stripe's supported-country list — confirm Bangladesh payouts work or line up an entity (see §1 unknowns).

**Recommended schema additions (D1 / Drizzle):**

```ts
// src/lib/server/schema.ts
export const subscriptions = sqliteTable('subscriptions', {
	id: text('id').primaryKey(),
	userId: text('userId').notNull().unique().references(() => user.id),
	provider: text('provider').notNull(), // 'stripe' | 'paddle' | 'sslcommerz' | 'bkash' | 'manual'
	providerCustomerId: text('providerCustomerId'),
	providerSubscriptionId: text('providerSubscriptionId'),
	plan: text('plan').notNull(), // 'pro_monthly' | 'pro_annual' | 'lifetime'
	status: text('status').notNull(), // 'active' | 'canceled' | 'past_due' | 'trialing'
	currentPeriodEnd: integer('currentPeriodEnd', { mode: 'timestamp' }),
	createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
	updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull()
});
```

Plus a `tier` accessor: derive `locals.tier = 'pro' | 'free'` in `hooks.server.ts` (one D1 read, cacheable per-session), and a single shared helper `requirePro(event)` next to the existing `requireSession` in `src/lib/server/session.ts`. **All gating must be server-side** — the premium flags in the client registry are UX hints only.

**Flow (Polar):**

1. Create products in the Polar dashboard: `Pro Monthly`, `Pro Annual` (subscriptions) and `Lifetime` (one-time); start in sandbox
2. `/api/billing/checkout` → creates a Polar Checkout Session via SDK (or the Better Auth plugin's `checkout` route) with `metadata: { userId }` / external customer ID = Better Auth user ID → redirect to hosted checkout
3. Polar Webhook → `/api/billing/webhook` (verify signature with `POLAR_WEBHOOK_SECRET`): handle `order.paid` (lifetime), `subscription.active`, `subscription.updated`, `subscription.canceled`, `subscription.revoked` → upsert `subscriptions` row
4. `/api/billing/portal` → Polar hosted Customer Portal for cancel/card update/receipts (zero UI to build)
5. Settings page "Billing" section replaces the coming-soon badge: current plan, upgrade button, portal link
6. Secrets via `wrangler secret put`: `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET` (plus sandbox equivalents in `.dev.vars`)

The provider abstraction (`provider` column + a small interface: `createCheckout`, `handleWebhook`, `getPortalUrl`) is what lets you slot in **SSLCommerz/bKash later** without schema changes — those become additional providers with their own IPN/webhook handlers, likely selling annual passes rather than auto-recurring subscriptions (recurring billing support on local rails is weak; sell 12-month access instead).

### B. Pay-this-invoice (money → your users) — **a Pro premium feature**

Gated behind Pro; this is the headline reason to upgrade ("get paid online, directly on your invoice").

**v1 — zero-liability payment links (the current plan; 1–2 days of work, no payment provider needed):**
Add a `paymentDetails` field to the invoice object: users paste their own Stripe Payment Link, PayPal.me, Wise link, bKash number, or bank details. The shared invoice page (`/shared/[token]`) renders a prominent **"Pay this invoice"** button/section. You never touch the money — no compliance, no KYC, works for users in any country. This alone delivers 70% of the perceived value. Only public URLs/text are stored — never API keys or other credentials.

**Parked (decision 2026-07-14 — no US entity for now):**

- **Stripe Connect (was v2):** Connect Standard OAuth onboarding + Checkout Sessions on the connected account with an `application_fee_amount`, webhook → `payments` table → paid/overdue status. Requires *your own* Stripe platform account, i.e. an entity in a Stripe-supported country (independent of Polar). Revisit if/when an entity exists. Do **not** substitute a bring-your-own-Stripe-secret-key model — it makes the app a credential vault for money-moving keys and is against Stripe's guidance.
- **Bangladesh rails (was v3):** SSLCommerz / bKash PGW (REST + IPN callbacks, same would-be `payments` table). Materially more work (merchant applications, sandbox certification); revisit only after v1 proves demand.

---

## 6. Roadmap

### Phase 0 — Prerequisites (do before charging anyone) — ~1 week

- [x] Fix `npm run check` — passes with 0 errors / 0 warnings
- [x] Rate limiting/quotas — D1-counter based (`src/lib/server/rateLimit.ts`): PDF 20/hr, share links 30/day, invoice saves 100/hr, email 20/day, AI fill 30/day, per user
- [x] Add privacy-friendly analytics — **Cloudflare Web Analytics** beacon (page-level, already in `src/app.html`) + **Workers Analytics Engine** for custom funnel events (Web Analytics cannot record custom events). Events are written via `env.METRICS.writeDataPoint` through the fail-open helper `src/lib/server/analytics.ts` (`trackEvent`) to the `analytics_engine_datasets` binding `METRICS` → dataset **`invoice_events`** (see wrangler.toml). Server-side events fire at the endpoints (signup, invoice_created, pdf_generated/downloaded, share_created, email_sent [source user vs cron], recurring_created, reminder_created/sent, client_created, ai_fill_used, checkout_started, and the highest-signal **gate_blocked** in `entitlements.ts`); guest-side browser events (guest_invoice_created, guest_pdf_downloaded, signup_prompt_shown, upgrade_prompt_shown) beacon through `POST /api/track` via `src/lib/analytics.ts`. **No PII** — no user ids, emails, IPs, or invoice content; per-user questions are answered at cohort level from aggregate counts. See CLAUDE.md → Analytics for the full event taxonomy and how to query. Analytics is **not** gated by `MONETIZATION_ENABLED` — it records for everyone.
- [x] Update CLAUDE.md/AGENTS.md to describe the real architecture; PLAN.md archived to `docs/archive/`
- [x] **Polar.sh account created and Bangladesh payout eligibility CONFIRMED working** — the plan's #1 risk is resolved; no US LLC needed for Pro billing

### Phase 1 — Entitlements + first paid gate — ~1–2 weeks

- [x] `subscriptions` table + `locals.tier` (derived in `hooks.server.ts` via `getTier`) + `requirePro()` in `src/lib/server/entitlements.ts` — all gates no-op while `MONETIZATION_ENABLED="false"` (dark launch)
- ~~Enforce template premium flags~~ — **dropped 2026-07-14**: all templates stay free (they don't sell Pro; workflow features do)
- [x] Server-side PDF gated; free tier limited to 3 active share links; "Made with FreeInvoice" badge on shared pages (Pro removes it)
- [x] Grandfathering: cloud-invoice quota applies to creates only, and the payment-link gate blocks only *newly enabling* — existing data is never locked (see `enforceInvoiceSaveGates`)

### Phase 2 — Billing (Polar) — ~1–2 weeks

- [ ] Polar products (Pro Monthly, Pro Annual, Lifetime) in sandbox, then production
- [x] `/api/billing/{checkout,portal,webhook}` routes: checkout, webhook → `subscriptions` upsert (never downgrades an active lifetime plan), hosted customer portal — activation-blocked until `POLAR_ACCESS_TOKEN`/`POLAR_WEBHOOK_SECRET` + product ids are set (see `docs/POLAR_SETUP.md`)
- [x] Billing section in settings; pricing page; `UpgradePromptModal` at the gates
- [ ] Launch lifetime deal + annual plan; announce

### Phase 3 — The features people pay for — ~4–6 weeks

- [x] Real email sending — built on **Cloudflare Email Sending** (`send_email` binding `EMAIL`; `POST /api/invoices/[id]/email`; Pro-gated + rate-limited 20/day; attaches the R2 PDF when present). Replaces the stub in `SendEmailModal.svelte`. **Manual DNS onboarding still required**: run `wrangler email sending enable freeinvoice.info` and add the SPF/DKIM records Cloudflare returns before sends succeed in production (until then sends fail with `E_SENDER_NOT_VERIFIED`).
- [x] Pay-this-invoice v1, Pro-gated — `paymentDetails` on the invoice (`PaymentDetailsComponent.svelte` in the editor), rendered as a "Pay this invoice" section on `/shared/[token]`. Save-path gate in `enforceInvoiceSaveGates` blocks only *newly enabling* payment details for free users (existing invoices grandfathered so auto-save never locks users out). Public URLs/text only — no credentials stored.
- [x] Recurring invoices — **Cloudflare Workers Cron trigger** (hourly, `[triggers] crons` in `wrangler.toml`) + `recurring_schedules` table + auto-email. Because adapter-cloudflare only emits a `fetch` handler, a wrapper worker (`worker.js`, wrangler `main`) re-exports the adapter-generated worker and adds a `scheduled` handler (`src/lib/server/recurring.ts`); the adapter emits its worker to `.svelte-kit/cloudflare/_worker.js` via a build-only `wrangler.build.toml` (see `svelte.config.js`). The scheduled handler clones each due invoice (new id/number, shifted dates, cleared paid state), saves it, and emails it (link only — no Browser Rendering from cron) via the shared `sendInvoiceEmail` helper (`src/lib/server/email.ts`). Managed via `/api/recurring` (Pro-gated create) and the History "Make recurring" action + a Settings management list.
- [x] Client address book — `clients` table (`migrations/0004_clients.sql`) + `/api/clients` (Pro-gated create) and `/api/clients/[id]` (edit/delete, ownership-checked). Signed-in users get a saved-clients picker + "save as client" affordance beneath the editor's "bill to" field (`ClientBookComponent.svelte` / `ClientFormModal.svelte`); guests and free users hit the upgrade prompt. Managed from a Clients list in Settings. Reading/using existing clients is never gated.
- [x] Overdue reminders — `reminder_settings` table (`migrations/0005_reminder_settings.sql`; one config per invoice) + the same hourly **Workers Cron trigger** as recurring invoices. The scheduled handler (`src/lib/server/reminders.ts`, wired into `worker.js` alongside `runDueSchedules`) finds active configs whose invoice is past its due date + `remindAfterDays` and still unpaid, emails the client a reminder — linking to the `/shared/<token>` page when an active share link exists, otherwise link-free — via a `sendReminderEmail` helper (`src/lib/server/email.ts`; no Browser Rendering, no attachment), and records `lastSentAt`. Reminders repeat at most once every `remindAfterDays` while overdue; configs whose invoice is gone are deactivated. Managed via `/api/reminders` (Pro-gated create) and `/api/reminders/[id]` (edit/delete, ownership-checked), plus the History "Set overdue reminder" action + a Settings management list.

### Phase 4 — Scale revenue — ongoing

- [x] Reports (revenue, outstanding, per-client) — `/dashboard/reports` (Pro-gated server load via `requirePro`; `src/routes/dashboard/reports/+page.server.ts`). Aggregates the user's cloud invoices in JS (D1 stores each invoice as opaque JSON): paid invoices → revenue by issue-month over the last 12 months, unpaid → outstanding split into not-yet-due vs overdue by due date, plus top clients by paid revenue (client = first line of the bill-to field). **All money is grouped per currency and never summed across currencies** — invoices carry no currency field, so each falls back to the user's `preferredCurrency`. Drafts/archived excluded; malformed rows skipped. Pure-CSS bar chart, no chart dependency.
- [x] AI assist — **invoice-from-text** (`POST /api/ai/invoice-from-text`; Pro-gated via `requirePro` + rate-limited 30/day + 503 without the `AI` binding). Signed-in users paste free-form text ("Invoice Acme for 12h consulting at $80/hr plus a $200 setup fee, due in 14 days") and the editor fields (bill-to, line items, due date, notes) get filled after a review/apply preview (`AiFillModal.svelte`). Uses **Cloudflare Workers AI** with `@cf/google/gemma-4-26b-a4b-it` (Gemma 4; cheapest text model in the catalog at $0.10/$0.30 per M in/out tokens). Model output is never trusted: prompted for raw JSON, then parsed + schema-validated server-side (`src/lib/server/aiInvoice.ts`); the user text is treated strictly as data (prompt-injection resistant). No native JSON mode on Gemma, so parsing is defensive.
- ~~Stripe Connect pay-this-invoice~~ / ~~SSLCommerz/bKash provider + BDT regional pricing~~ — **parked 2026-07-14** (entity requirement; see §5B)

### KPIs to watch from day one

- Guest → signup conversion; signup → first-invoice; weekly active invoicers
- Free → Pro conversion (healthy benchmark for this category: 2–5%)
- Infra cost per active user (Browser Rendering is the one to watch)
- Churn on monthly vs. annual — expect monthly churn to be high; that's why annual is the push

---

## 7. Biggest Risks (honest list)

1. **Polar payout eligibility** — Polar's payouts ride on Stripe Connect Express, so Bangladesh eligibility is unverified. Stripe Connect the *feature* is parked, but this payout path is the make-or-break unknown for Pro billing itself. Verify in week one, before any billing code is written; if blocked, the US LLC decision comes back regardless.
2. **Pay-this-invoice is capped at v1 for now** — payment links deliver most of the perceived value, but without Connect there is no automatic paid-status tracking, no application-fee revenue, and "get paid online" depends on users bringing their own payment provider. Acceptable trade for zero liability and zero entity requirement.
3. **Charging for previously-free features** — server PDF, all templates, and unlimited sharing are free today. Grandfather generously and gate loudly *before* the paid launch, not at it.
4. **Cost exposure precedes revenue** — the unmetered Browser Rendering endpoint is a liability right now. Phase 0 is not optional.
5. **The name** — "FreeInvoice" sets expectations. Lean into it: the free tier must remain best-in-class, and Pro must sell *time saved and money collected*, not un-crippling.
6. **Solo-maintainer bandwidth** — the roadmap above is ~3 months of focused work. The lifetime deal in Phase 2 exists partly to fund/validate the rest before you build it.
