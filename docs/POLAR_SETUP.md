# Polar Billing — Setup & Launch Guide

How to take the monetization branch from dark-launch to live billing. All app-side
code already exists (`src/lib/server/billing.ts`, `/api/billing/{checkout,portal,webhook}`,
`src/lib/server/entitlements.ts`); this guide is the operational checklist.

Strategy and pricing rationale: `docs/MONETIZATION.md`.

---

## 1. Database migrations (do first — safe anytime)

Both migrations are additive (`IF NOT EXISTS`). The code tolerates their absence
(rate limiting fails open, `getTier` defaults to `free`), but apply them before
deploying so rate limiting actually protects the Browser Rendering endpoint:

```bash
npx wrangler d1 execute invoice-db --remote --file=./migrations/0001_rate_limits.sql
npx wrangler d1 execute invoice-db --remote --file=./migrations/0002_subscriptions.sql

# Local dev database (used by npm run dev:cf):
npx wrangler d1 execute invoice-db --local --file=./migrations/0001_rate_limits.sql
npx wrangler d1 execute invoice-db --local --file=./migrations/0002_subscriptions.sql
```

Verify:

```bash
npx wrangler d1 execute invoice-db --remote \
  --command "SELECT name FROM sqlite_master WHERE name IN ('rate_limits','subscriptions')"
```

## 2. Create products in Polar

Do everything in the **sandbox** dashboard (sandbox.polar.sh) first, then repeat
in production (polar.sh).

1. Create an organization (or use the existing one).
2. Create three products:
   | Product | Type | Price (per MONETIZATION.md §3) |
   | --- | --- | --- |
   | FreeInvoice Pro Monthly | Subscription, monthly | $6/mo |
   | FreeInvoice Pro Annual | Subscription, yearly | $49/yr |
   | FreeInvoice Pro Lifetime | One-time purchase | $99–129, limited window |
3. Copy each product's **ID** — these map to the `POLAR_PRODUCT_*` vars below.
   The mapping lives in `productIdForPlan()` / `planForProductId()` in
   `src/lib/server/billing.ts`.

## 3. Access token

Polar dashboard → Settings → **Developers** → create an Organization Access Token.
Scopes needed: `checkouts:write`, `customer_sessions:write`, `customers:read`.
Sandbox and production tokens are separate.

## 4. Webhook endpoint

Polar dashboard → Settings → **Webhooks** → Add endpoint:

- URL: `https://freeinvoice.info/api/billing/webhook`
- Format: **Raw**
- Events (the only ones the handler processes — see
  `src/routes/api/billing/webhook/+server.ts`):
  - `order.paid` (lifetime purchases)
  - `subscription.active`
  - `subscription.updated`
  - `subscription.canceled`
  - `subscription.revoked`
- Copy the signing **secret** → `POLAR_WEBHOOK_SECRET`.

The handler maps events to users via `externalCustomerId` (set to the Better Auth
user id at checkout) and upserts the `subscriptions` row. An active `lifetime`
row is never overwritten by subscription events.

## 5. Secrets & vars

### Production (Cloudflare)

```bash
npx wrangler secret put POLAR_ACCESS_TOKEN     # production org token
npx wrangler secret put POLAR_WEBHOOK_SECRET   # from step 4
npx wrangler secret put POLAR_SERVER           # "production" (anything else = sandbox)
npx wrangler secret put POLAR_PRODUCT_PRO_MONTHLY
npx wrangler secret put POLAR_PRODUCT_PRO_ANNUAL
npx wrangler secret put POLAR_PRODUCT_LIFETIME
```

Billing stays inert until `POLAR_ACCESS_TOKEN` exists (`isBillingConfigured`);
checkout/portal redirect to `/pricing?billing=unavailable` before that.

### Local dev (`.dev.vars`, gitignored)

```ini
POLAR_ACCESS_TOKEN=polar_oat_...      # sandbox token
POLAR_WEBHOOK_SECRET=...              # sandbox webhook secret
POLAR_SERVER=sandbox
POLAR_PRODUCT_PRO_MONTHLY=...         # sandbox product ids
POLAR_PRODUCT_PRO_ANNUAL=...
POLAR_PRODUCT_LIFETIME=...
```

To receive sandbox webhooks locally, expose the dev server with a tunnel
(e.g. `cloudflared tunnel --url http://localhost:8787`) and point the sandbox
webhook endpoint at `<tunnel-url>/api/billing/webhook`.

## 6. Sandbox end-to-end test

```bash
npm run dev:cf
```

1. Sign in with Google.
2. Visit `/api/billing/checkout?plan=pro_monthly` → should redirect to Polar
   sandbox checkout. Pay with test card `4242 4242 4242 4242`.
3. Webhook fires → check the row:
   `npx wrangler d1 execute invoice-db --local --command "SELECT * FROM subscriptions"`
4. Reload the app — Settings → Billing should show the Pro pill;
   `/api/billing/portal` should open the Polar customer portal.
5. Repeat for `plan=lifetime` (one-time purchase path, `order.paid` event).

## 7. Flip the flag (the actual launch)

Gating is controlled by one var in `wrangler.toml`:

```toml
[vars]
MONETIZATION_ENABLED = "true"   # was "false"
```

Deploying this turns on, for free-tier users only:

- Premium templates blocked on save — **only when newly adopting one**
  (existing invoices keep their premium template forever)
- Server-side PDF requires Pro (client falls back to html2pdf silently)
- Max 3 active share links / 10 cloud invoices (creates only; edits never blocked)
- "Made with FreeInvoice" badge on shared pages (hidden for Pro owners)

Pre-flip checklist:

- [ ] Migrations applied (step 1)
- [ ] Production Polar products + webhook + secrets set (steps 2–5)
- [ ] Sandbox flow tested end-to-end (step 6)
- [ ] Pricing page copy final; upgrade modals reviewed
- [ ] Announcement ready (lifetime deal window per MONETIZATION.md §3)

Rollback = set it back to `"false"` and deploy; all gates no-op again.

## 8. Deployment commands

Deploys happen automatically on merge to `main` (auto-deployment is configured).
Manual equivalents:

```bash
npm run check        # svelte-check — must be 0 errors
npm run build        # production build (also catches prerender/platform.env issues)
npm run deploy       # build + wrangler deploy (manual deploy, bypasses CI)
npx wrangler tail    # live production logs (watch webhook deliveries / gate 402s)
```

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Checkout redirects to `/pricing?billing=unavailable` | `POLAR_ACCESS_TOKEN` or the plan's `POLAR_PRODUCT_*` id not set |
| Checkout redirects to `/pricing?billing=error` | Polar API rejected the request — check `wrangler tail`; wrong server (sandbox token against production)? |
| Webhook returns 403 | `POLAR_WEBHOOK_SECRET` mismatch (sandbox vs production secrets differ) |
| Paid but still free tier | Webhook not delivered (check Polar dashboard → Webhooks → deliveries) or `subscriptions` migration missing |
| Pro user hits a gate | `getTier` reads `subscriptions.status` — must be `active` or `trialing` |
