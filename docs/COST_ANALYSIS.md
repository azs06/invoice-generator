# FreeInvoice.info — Per-User Infrastructure Cost vs. Subscription Revenue

_Analysis date: **2026-07-15**. All Cloudflare prices below were verified against
`developers.cloudflare.com` pricing pages on this date. **Re-verify before flipping
`MONETIZATION_ENABLED` to `true`** — Cloudflare adjusts rates and free allocations,
and some services (Analytics Engine, Email Sending) are still pre-billing._

---

## TL;DR

| Headline | Value |
| --- | --- |
| **Typical Pro user — marginal infra cost** | **< $0.05 / month** (essentially $0; usage sits inside the flat free allocations bundled with the $5/mo Workers Paid plan) |
| **Net revenue — Pro Monthly ($6)** | **$5.36 / month** after Polar (4% + $0.40) |
| **Gross margin — typical Pro user** | **≈ 99%** |
| **Worst-case Pro abuser — cost ceiling** | **≈ $3–6 / month** (dominated entirely by Browser Rendering PDF generation) |
| **The one number to watch** | **PDF cap: 20/hr = 14,400/mo.** At a 15 s render that costs **~$5.40/mo** — it can **exceed** the $5.36 net on Pro Monthly. A monthly PDF quota is recommended. |

**Bottom line:** the product is structurally cheap to run. Nearly every metered
service this app touches (D1, R2, Workers requests/CPU, Workers AI, Analytics
Engine) stays inside the Workers Paid plan's included allowances for any realistic
single user. The only service with a per-user marginal cost that can approach or
exceed Pro revenue is **Browser Rendering** (server-side PDF), and only when a user
is pinned at the hourly rate limit around the clock. The current limits keep even
that abuser within a few dollars, but the PDF limit is the single lever worth
tightening (see Recommendations).

---

## Assumptions (one block, read this first)

**Plan:** Workers **Paid** ($5/mo account base). All "included" allowances below are
account-wide, not per-user — so per-user marginal cost is $0 until the *account
aggregate* crosses an allowance. Personas are priced two ways where it matters:
"marginal" (assume the shared free pool is already consumed by other users, i.e.
full overage rate) and "within free tier" (realistic at low user counts).

**Per-request D1 reads:** every authenticated request runs, in `hooks.server.ts`, a
Better Auth session lookup (~1–2 row reads) + `getTier` subscription lookup (1 read)
≈ **3 rows read/request**. Each rate-limited action does **1 D1 write** (the
`INSERT … ON CONFLICT` counter). Invoice CRUD adds a handful of reads/writes per call.

**Invoice size:** cloud invoice ≈ 5–20 KB JSON in D1. Server PDF ≈ 50–200 KB in R2.

**Browser Rendering render time:** **the biggest modeling uncertainty.** One server
PDF = one Puppeteer browser session. Realistic wall-clock is ~5–15 s (launch + load
HTML + print). Modeled at **8 s (low)** and **15 s (high)**. Billing is by *browser
hours*, aggregated monthly and rounded to the nearest hour. **Verify actual session
duration from the Cloudflare dashboard before launch** — every Browser Rendering
number below scales linearly with it.

**Workers AI token estimate per "invoice-from-text" call:** system prompt ~500
tokens + user text (≤2000 chars ≈ ~500 tokens) ≈ **~1,500 input tokens**; small JSON
out ≈ **~300 output tokens**.

**Model note:** the endpoint uses `@cf/google/gemma-4-26b-a4b-it`
(`src/lib/server/aiInvoice.ts`). Cloudflare's public catalog does not yet list
gemma-4-26b's price; the repo comments cite **$0.10 / M input, $0.30 / M output**.
The nearest *published* Gemma (gemma-3-12b) is **$0.345 / M in, $0.556 / M out**.
Both are modeled below; either way the per-user AI cost is negligible because it
stays inside the free Neuron pool.

**Revenue after Polar (Merchant of Record, 4% + $0.40 / transaction):**

| Plan | Gross | Polar fee | Net | Net / month |
| --- | --- | --- | --- | --- |
| Pro Monthly | $6.00 | $0.64 | **$5.36** | **$5.36** |
| Pro Annual | $49.00/yr | $2.36 | $46.64/yr | **$3.89** |
| Lifetime $99 (24-mo amort.) | $99.00 | $4.36 | $94.64 | **$3.94** |
| Lifetime $99 (36-mo amort.) | $99.00 | $4.36 | $94.64 | **$2.63** |

---

## Verified Cloudflare pricing (2026-07-15, Workers Paid plan)

| Service | Included with $5/mo plan | Overage rate |
| --- | --- | --- |
| **Workers requests** | 10 M / month | $0.30 / M |
| **Workers CPU time** | 30 M CPU-ms / month | $0.02 / M CPU-ms |
| **D1 rows read** | 25 **billion** / month | $0.001 / M |
| **D1 rows written** | 50 M / month | $1.00 / M |
| **D1 storage** | 5 GB | $0.75 / GB-mo |
| **R2 storage** | 10 GB-mo | $0.015 / GB-mo |
| **R2 Class A ops** (writes/lists) | 1 M / month | $4.50 / M |
| **R2 Class B ops** (reads) | 10 M / month | $0.36 / M |
| **R2 egress** | — | **Free** |
| **Browser Rendering** | 10 browser-hours/mo + 10 concurrent browsers | $0.09 / browser-hour; $2.00 / extra concurrent browser |
| **Workers AI** | 10,000 Neurons / **day** (~300k/mo) | $0.011 / 1,000 Neurons |
| **Workers AI — Gemma tokens** | (drawn from Neuron pool) | ~$0.10–0.345 / M in, $0.30–0.556 / M out |
| **Analytics Engine — data points** | 10 M / month | $0.25 / M (currently **not billed**) |
| **Analytics Engine — read queries** | 1 M / month | $1.00 / M (currently **not billed**) |
| **Email Sending** (`send_email`) | No public per-message price; beta, daily caps | Treated as **$0** — verify before relying on it |

Key takeaway from the table: **D1 read allowance is 25 billion/month** and R2 egress
is free. Those two facts alone make almost all "per request we hit the database"
worry moot at this app's scale.

---

## Persona costs

Costs shown as **marginal** (full overage rate, i.e. shared free pool assumed
exhausted) so the numbers are an upper bound. At realistic launch scale (tens to low
hundreds of users) most of these fall inside the free tier and round to **$0**.

### (a) Light free user — 2 invoices/mo, client-side PDF only (guest-like)

| Service | Usage | Marginal cost |
| --- | --- | --- |
| Workers req/CPU | ~50 req/mo | ~$0.00 |
| D1 reads/writes | ~150 reads, ~10 writes | ~$0.00 |
| R2 | none (client-side html2pdf) | $0.00 |
| Browser Rendering | 0 | $0.00 |
| Everything else | 0 | $0.00 |
| **Total** | | **≈ $0.00 / mo** |

Guests using IndexedDB cost literally nothing (no session, no D1). This is the SEO
funnel and it is free to run.

### (b) Active free user — at the free caps (10 cloud invoices, 3 share links, + 3/mo server-PDF teaser)

| Service | Usage | Marginal cost |
| --- | --- | --- |
| Workers req/CPU | ~500 req/mo | ~$0.00 |
| D1 reads | ~1,500 rows | ~$0.0000015 |
| D1 writes | ~100 rows (saves, share links, RL counters) | ~$0.0001 |
| R2 | 3 PDFs stored (~0.5 MB) + 3 Class A ops | ~$0.00 |
| Browser Rendering (if 3/mo teaser) | 3 PDFs × 8–15 s = 24–45 s | **$0.0006 – $0.0011** |
| **Total** | | **< $0.01 / mo** |

Even the most active free user costs a fraction of a cent. The free tier is not a
cost risk; it is a marketing expense of essentially $0. The only reason to gate the
server PDF for free users is to reserve it as a Pro pitch, not to save money.

### (c) Typical Pro user — 15 invoices/mo, 20 server PDFs, 30 emails, 20 AI fills, weekly reports

| Service | Usage | Marginal cost |
| --- | --- | --- |
| Workers req/CPU | ~1,500 req/mo, ~a few M CPU-ms | ~$0.00 |
| D1 reads | ~5,000 rows | ~$0.000005 |
| D1 writes | ~300 rows | ~$0.0003 |
| R2 storage + ops | ~20 PDFs (~3 MB) + ~20 Class A | ~$0.0001 |
| **Browser Rendering** | 20 PDFs × 8–15 s = 160–300 s (0.044–0.083 hr) | **$0.004 – $0.0075** |
| Workers AI | 20 fills ≈ 1,240 Neurons (free tier = 10k/**day**) | ~$0.00 (raw token cost ~$0.01) |
| Email | 30 sends (beta, no per-msg price) | ~$0.00 |
| Analytics Engine | ~200 data points | $0.00 (not billed) |
| **Total marginal** | | **≈ $0.01 – $0.05 / mo** |

**Margin: net $5.36 − ~$0.03 cost ≈ $5.33 → ~99% gross margin.** The dominant "cost"
of a Pro user is their share of the flat $5/mo Workers base, which amortizes toward
zero as users grow (see Fixed Costs).

### (d) Worst-case Pro abuser — pinned at every rate limit, 24/7

The cost-exposure ceiling the rate limits were designed to bound.

| Limit hit | Monthly volume | Marginal cost (low → high) |
| --- | --- | --- |
| **PDF** 20/hr | 14,400 PDFs → 32 hr (8 s) / 60 hr (15 s) browser time | **$2.88 → $5.40** |
| Email 20/day | 600 emails | $0.00 (beta) — *verify* |
| AI fill 30/day | 900 calls ≈ 55.8k Neurons/mo (free = 300k/mo) | ~$0.00 (raw token cost ~$0.6) |
| Invoice saves 100/hr | 72,000 saves → ~360k D1 writes | ~$0.36 (if free pool exhausted) |
| Share links 30/day | 900 links → ~1,800 D1 writes | ~$0.002 |
| Aggregate Workers req | ~90k req/mo, ~2–5 M CPU-ms | ~$0.00 (inside 10M/30M free) |
| **Total ceiling** | | **≈ $3.2 → $6.4 / mo** |

**This is the crux.** A single maximally-abusive Pro user can cost **$3–6/mo**,
which at the high-render-time end **exceeds their $5.36 net revenue**. The exposure
is ~95% Browser Rendering. Note the invoice-save D1 writes ($0.36) only bite once the
account's 50M/mo free write pool is exhausted — unlikely until thousands of users.

---

## Break-even points (typical Pro, net $5.36/mo)

How much metered activity a *single* Pro subscription pays for before infra cost
eats the whole net payment:

| Service | Break-even volume / month | vs. current cap |
| --- | --- | --- |
| **Server PDFs** (15 s each, $0.09/browser-hr) | ~**1,430 PDFs** (≈ 59 browser-hrs = $5.36) | cap allows 14,400/mo (**10× over**) |
| Server PDFs (8 s each) | ~2,680 PDFs | cap allows 14,400/mo (5× over) |
| AI fills (@ gemma-3 token price) | ~7,800 calls | cap allows 900/mo (safe, 8.7× headroom) |
| D1 writes | ~5.36 M writes | cap allows ~360k/mo (safe, 15× headroom) |
| Emails | n/a (beta $0) — re-check at GA | cap 600/mo |

Only **Browser Rendering** has a cap set *above* its break-even. Every other limit
is comfortably below the point where one abuser could burn a whole subscription.

---

## Fixed costs (independent of per-user activity)

| Item | Cost | Notes |
| --- | --- | --- |
| Workers Paid base | **$5.00 / mo** | Flat; amortizes across all users |
| Domain (freeinvoice.info) | ~$1–3 / mo | Registrar-dependent; not in repo |
| D1 storage | $0 until 5 GB | ~5–20 KB/invoice → 5 GB ≈ 250k–1M invoices |
| R2 storage | $0 until 10 GB | ~50–200 KB/PDF → 10 GB ≈ 50k–200k PDFs |
| Analytics Engine | $0 (not billed; 10M pts/mo free) | Funnel events; well inside allowance |
| Email Sending | $0 (beta) | Re-verify at GA |

### Hourly cron D1 scan cost (recurring + reminders), by user count

720 cron runs/month. Each run scans `recurring_schedules` + `reminder_settings`.

| Active users | Rows scanned/run (est.) | D1 reads/mo | Cost |
| --- | --- | --- | --- |
| 0 | 0 | 0 | $0 |
| 100 | ~50–100 | ~72k | ~$0.00 (25B free) |
| 1,000 | ~500–1,000 | ~720k | ~$0.0007 |

The cron is effectively free even at 1,000 users — the 25 billion/month D1 read
allowance dwarfs it. (If schedule tables ever grow huge, add an indexed
`WHERE nextRunAt <= now AND active = 1` filter so the cron reads only due rows rather
than full-scanning — cheap insurance, not currently needed.)

**Amortized fixed cost per user:** at 100 Pro users the $5 base = $0.05/user/mo; at
1,000 it's $0.005. Combined with marginal cost, an all-in typical Pro user runs
**well under $0.10/mo** — a **>98% margin** even including fixed overhead.

---

## Sensitivity: which service dominates, and does any limit exceed revenue?

**One service dominates: Browser Rendering (server-side PDF).** It is the only
metered service billed on wall-clock time rather than cheap per-row/per-request
units, and the only one whose current rate limit sits *above* its per-subscription
break-even.

**The PDF limit is the exposure.** PDF 20/hr → **14,400/mo**:

- at 8 s/render → 32 browser-hours → **$2.88/mo**
- at 15 s/render → 60 browser-hours → **$5.40/mo → exceeds the $5.36 net on Pro Monthly**

No single real user needs anywhere near this. 20 PDFs/*hour* sustained 24/7 is pure
abuse. The hourly limit correctly stops burst abuse but does **not** bound the
*monthly* total, which is where the dollar exposure lives.

Every other limit is safe by a wide margin: AI (8.7×), D1 writes (15×), share links,
and requests all cap worst-case cost well below net revenue. Email is $0 today but
unpriced — the 20/day cap is prudent to keep in place for when Cloudflare prices it.

---

## Recommendations

1. ✅ **APPLIED (2026-07-15):** `pdfGenerationMonthly` = **1000**/30-day window in
   `src/lib/server/rateLimit.ts`, enforced as a second `checkRateLimit` call in
   `/api/pdf`. Set above the 200–300 suggested below as a product decision: Pro is
   marketed "unlimited" and the ceiling is an undisclosed anti-abuse tripwire
   (worst case $0.38/user at 15 s renders, ~93% margin — see caps table).
   Original recommendation follows. — The hourly limit
   stops bursts but leaves a 14,400/mo ceiling worth up to ~$5.40. Add a
   `pdfGenerationMonthly` limit of **~200–300/mo for Pro** (window = 30 days in the
   existing D1 counter — no schema change, just another `RATE_LIMITS` entry and a
   second `checkRateLimit` call in `/api/pdf`). That caps worst-case PDF exposure at
   **~$0.30–0.40/mo** while being ~10× more than any genuine freelancer needs.

2. **Verify actual Browser Rendering session duration before launch.** Every PDF
   dollar figure here scales linearly with render time. Pull real numbers from the
   Cloudflare dashboard and re-tune the quota in #1 to the measured value.

3. **Keep the free tier as-is — it is not a cost risk.** An active free user costs
   < $0.01/mo. Gate the server PDF for free users as a *conversion* lever, not a cost
   one; the 3/mo teaser is essentially free to give away.

4. **Re-verify Email Sending and Analytics Engine pricing at the flag flip.** Both
   are $0 today (beta / not-yet-billed). Keep the 20/day email cap so a future GA
   price can't surprise the P&L. If email gets priced per-message, revisit whether the
   cron reminder/recurring sends need their own quota.

5. **Push annual and lifetime, but know the margin still holds on monthly.** Even
   Pro Monthly's $5.36 net yields ~99% margin on a typical user. The churn argument
   for annual (§3 of MONETIZATION.md) stands, but there is no *cost* pressure forcing
   users off monthly.

6. **Leave the other rate limits alone.** AI, D1-write (invoice saves), and
   share-link caps are all comfortably below their break-even; tightening them would
   only hurt legitimate power users for no cost benefit.

7. **Re-run this analysis with real telemetry after 2–4 weeks of live billing.** The
   Analytics Engine events already track `pdf_generated`, `email_sent`,
   `ai_fill_used`, etc. Replace the estimates here (render time, tokens/call, invoice
   size) with measured medians before making any further pricing decision.
