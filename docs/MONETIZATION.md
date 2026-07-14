# FreeInvoice.info — Monetization Strategy

_Last updated: 2026-07-05. Based on a full codebase audit. Supersedes the business-model sections of `PLAN.md`, which no longer reflect the actual architecture (magic links → Google OAuth, Pages Functions → SvelteKit Workers routes, KV sessions → Better Auth + D1)._

> **Decisions locked in:**
>
> - **Billing provider: Polar.sh** (Merchant of Record) for Pro subscriptions and the lifetime deal
> - **Pay-this-invoice via Stripe Connect** is a **Pro premium feature** (v1 ships earlier as zero-liability payment links, also Pro)
> - SSLCommerz / bKash remain a later phase for the Bangladesh market
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
| Templates | 8 templates, registry with `premium: boolean` flags | Flags exist but are **enforced nowhere** |
| User settings | Invoice prefix, preferred currency | Billing section is a "coming soon" placeholder |
| i18n / themes | English + Bengali, dark mode | Differentiator for the BD market |

### Missing (the gap between you and revenue)

1. **No entitlement system.** There is no `tier`, `plan`, or `subscriptions` concept anywhere in the schema or code. Nothing can be gated until this exists. This is the single prerequisite for everything else.
2. **Premium template flags are dead code.** `registry.ts` marks classic/minimal/atlantic as `premium: true`, but `TemplateSelector.svelte` never checks the flag. Every user gets everything.
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
| **Stripe platform account for Connect (§5B v2)** | The pay-this-invoice Connect feature requires *your own* Stripe platform account, which requires an entity in a Stripe-supported country — independent of Polar. | Same entity decision; Connect stays in Phase 4 behind it |
| Sales tax / VAT exposure | Solved by choosing Polar as MoR — Polar is the merchant and handles global VAT/sales tax for ~4% + 40¢ per transaction. | Confirm fees at signup; no further action |
| Actual usage volume & costs | Browser Rendering, R2, D1 costs per active user are unknown. Free-tier generosity should be set from data. | Add analytics + Cloudflare cost dashboards for 2–4 weeks |
| Willingness to pay in your audience mix | Bengali i18n suggests meaningful BD traffic; $6/mo is priced very differently in Dhaka vs. Denver. | Discount codes / PPP-style coupons in Polar now; true local pricing when bKash/SSLCommerz land |
| Legal name/branding conflict | "FreeInvoice" as a brand fights the paid tier in users' minds. | Keep the free tier genuinely strong; market premium as "FreeInvoice Pro" |

---

## 2. Strategy Overview

**Positioning:** Keep the core generator genuinely free and account-optional — that is your SEO/acquisition engine and your name promises it. Monetize the *business workflow around the invoice*: getting it delivered, getting it paid, and doing it repeatedly.

**Two revenue streams, in order:**

1. **Pro subscription via Polar.sh (build first).** Money flows from your users to you. Polar acts as Merchant of Record — it is the legal seller, handles global VAT/sales tax, checkout, and customer portal for ~4% + 40¢ per transaction. All the app-side infrastructure (auth, D1, gating points) is nearly in place.
2. **Pay-this-invoice (build second, sold as a Pro feature).** Money flows from your users' clients to your users. Higher perceived value ("get paid faster" sells better than "nicer PDFs"). Ship v1 as a zero-liability payment-links version (see §5B), then upgrade to **Stripe Connect** as the headline Pro differentiator — with an optional application fee as a third revenue stream.

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
| Templates | 5 free | All 8 + future | Flags exist; **enforcement missing** |
| Cloud save/sync (account) | Last 10 invoices | Unlimited | Storage done; **quota missing** |
| Server-side PDF (Browser Rendering) | ❌ (or 3/mo teaser) | ✅ | Endpoint done; **gating missing** |
| Share links | 3 active, 7-day expiry | Unlimited, custom expiry, view analytics | Done; **limits missing** |
| Email invoice to client + reminders | ❌ | ✅ | **Stub — must build** |
| Recurring invoices | ❌ | ✅ | **Must build** |
| Client address book | ❌ | ✅ | **Must build** |
| Reports (revenue, outstanding, per-client) | ❌ | ✅ | **Must build** (dashboard stats are a start) |
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

Both versions are gated behind Pro; this is the headline reason to upgrade ("get paid online, directly on your invoice"). Ship in two versions:

**v1 — zero-liability (1–2 days of work, no payment provider needed):**
Add a `paymentDetails` field to the invoice object: users paste their own Stripe Payment Link, PayPal.me, Wise link, bKash number, or bank details. The shared invoice page (`/shared/[token]`) renders a prominent **"Pay this invoice"** button/section. You never touch the money — no compliance, no KYC, works for users in any country. This alone delivers 70% of the perceived value.

**v2 — Stripe Connect (the premium differentiator; requires your own Stripe platform entity, 2–3 weeks):**
- Connect **Standard** accounts: user clicks "Connect Stripe" in settings → OAuth onboarding → store `stripeAccountId`
- On the shared page, "Pay" creates a Checkout Session **on the connected account** (`stripe.checkout.sessions.create({...}, { stripeAccount })`) with an optional `application_fee_amount` (e.g., 0.5–1%) — a third revenue stream on top of Polar subscriptions
- Webhook marks the invoice `paid` and records amount in a new `payments` table → powers "paid/overdue" status, reminders, and reports
- Standard accounts mean Stripe handles the merchant's KYC/disputes, not you
- Note: this is **independent of Polar** — Polar bills your users; Connect moves your users' clients' money. Your platform Stripe account needs a supported-country entity (§1 unknowns), which is why this sits in Phase 4

**Bangladesh rails (v3):** SSLCommerz / bKash PGW for BD users' clients. Both are REST + IPN-callback based and fit the same `payments` table. Do this only once v1/v2 prove demand — these integrations require merchant applications and sandbox certification per user or via an aggregator model, which is materially more work.

---

## 6. Roadmap

### Phase 0 — Prerequisites (do before charging anyone) — ~1 week

- [ ] Fix `npm run check` (dashboard comma-operator error) and the a11y warnings; make CI green a hard rule
- [ ] Add rate limiting/quotas on `/api/pdf`, `/api/invoices/[id]/share`, and R2 writes (Cloudflare rate limiting rules or a D1/DO counter) — cost protection is needed *today*, independent of monetization
- [ ] Add privacy-friendly analytics (Cloudflare Web Analytics is free; add custom events for signup, invoice created, PDF downloaded, share created) — you need funnel data to validate pricing
- [ ] Update CLAUDE.md/AGENTS.md to describe the real architecture; archive PLAN.md
- [ ] **Create a Polar.sh account (sandbox + production) and verify payout eligibility from Bangladesh**; only pursue a US LLC / entity if payouts are blocked — the entity is otherwise only needed for Stripe Connect in Phase 4

### Phase 1 — Entitlements + first paid gate — ~1–2 weeks

- [ ] `subscriptions` table + `locals.tier` + `requirePro()` helper
- [ ] Enforce template premium flags (server-side for saved invoices/PDF; client UX shows lock + upgrade modal)
- [ ] Gate server-side PDF and share-link limits; add "Made with FreeInvoice" badge to shared pages (Pro removes it)
- [ ] Grandfather all existing users' saved invoices (never lock away existing data)

### Phase 2 — Billing (Polar) — ~1–2 weeks

- [ ] Polar products (Pro Monthly, Pro Annual, Lifetime) in sandbox, then production
- [ ] Integrate `@polar-sh/better-auth` plugin (or hand-rolled `/api/billing/*` routes with `@polar-sh/sdk`): checkout, webhook → `subscriptions` upsert, hosted customer portal
- [ ] Billing UI in settings; pricing page; upgrade modals at every gate
- [ ] Launch lifetime deal + annual plan; announce

### Phase 3 — The features people pay for — ~4–6 weeks

- [ ] Real email sending (Cloudflare Email Service or Resend; SPF/DKIM on freeinvoice.info; PDF attached from R2) — replaces the stub
- [ ] Pay-this-invoice v1, Pro-gated (user-provided payment links on the shared page)
- [ ] Recurring invoices (Workers Cron trigger + `recurring_schedules` table + auto-email)
- [ ] Client address book; overdue reminders

### Phase 4 — Scale revenue — ongoing

- [ ] Stripe Connect pay-this-invoice (Pro premium feature) with application fee — requires platform entity from §1
- [ ] Reports (revenue, outstanding, per-client)
- [ ] SSLCommerz/bKash provider + BDT regional pricing for the BD market
- [ ] AI assist features (invoice-from-text) as Pro perks, per PLAN.md Phase 10

### KPIs to watch from day one

- Guest → signup conversion; signup → first-invoice; weekly active invoicers
- Free → Pro conversion (healthy benchmark for this category: 2–5%)
- Infra cost per active user (Browser Rendering is the one to watch)
- Churn on monthly vs. annual — expect monthly churn to be high; that's why annual is the push

---

## 7. Biggest Risks (honest list)

1. **Polar payout eligibility** — Polar's payouts ride on Stripe Connect Express, so Bangladesh eligibility is unverified. If blocked, an entity (US LLC) unblocks both Polar and the Phase 4 Stripe Connect feature at once. Verify in week one, before any billing code is written.
2. **Stripe Connect still needs an entity regardless of Polar** — Polar removes the entity requirement for *selling Pro*, not for *being a Connect platform*. Plan Phase 4 timing around the entity decision.
3. **Charging for previously-free features** — server PDF, all templates, and unlimited sharing are free today. Grandfather generously and gate loudly *before* the paid launch, not at it.
4. **Cost exposure precedes revenue** — the unmetered Browser Rendering endpoint is a liability right now. Phase 0 is not optional.
5. **The name** — "FreeInvoice" sets expectations. Lean into it: the free tier must remain best-in-class, and Pro must sell *time saved and money collected*, not un-crippling.
6. **Solo-maintainer bandwidth** — the roadmap above is ~3 months of focused work. The lifetime deal in Phase 2 exists partly to fund/validate the rest before you build it.
