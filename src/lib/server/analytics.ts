/**
 * Privacy-friendly funnel/conversion analytics via Workers Analytics Engine.
 *
 * Writes one low-cardinality data point per product event to the `METRICS`
 * binding (analytics_engine_datasets in wrangler.toml, dataset
 * `invoice_events`). Queried later through the Analytics Engine SQL API /
 * `wrangler analytics-engine sql` (see docs/MONETIZATION.md → Analytics).
 *
 * Design rules (see docs/MONETIZATION.md → Analytics):
 * - Fails OPEN: every call is wrapped in try/catch and no-ops when the binding
 *   is absent (plain `npm run dev`) or the write throws. A tracking failure
 *   must NEVER surface as a request error or delay a response.
 * - `writeDataPoint` returns synchronously and flushes in the background, so
 *   there is nothing to await (no waitUntil needed).
 * - NO PII: blobs carry only the event name plus a handful of bounded, non-
 *   identifying dimensions (plan, source). We deliberately DO NOT attach user
 *   ids, emails, IPs, or invoice content. Per-user funnel questions
 *   ("invoices per user", "signup → first invoice") are answered at the cohort
 *   level from aggregate counts (e.g. invoice_created total / signup total),
 *   which keeps every event non-identifying and low-cardinality.
 *
 * This module is imported by the Cron path (src/lib/server/recurring.ts via
 * worker.js), which is bundled by esbuild — NOT Vite — so it must only use
 * relative imports and `import type`. It has none, which keeps it esbuild-safe.
 */

/**
 * Minimal shape of the Analytics Engine binding used here. Mirrors the
 * `AnalyticsEngineDataset` global from @cloudflare/workers-types, redeclared
 * locally so this module has no dependency on the ambient global types (it runs
 * in the esbuild-bundled Cron path). See the `METRICS` binding in src/app.d.ts.
 */
export interface MetricsBinding {
	writeDataPoint(event?: {
		indexes?: (ArrayBuffer | string | null)[];
		doubles?: number[];
		blobs?: (ArrayBuffer | string | null)[];
	}): void;
}

/** Env subset the tracker needs. METRICS is optional (absent in plain dev). */
export interface MetricsEnv {
	METRICS?: MetricsBinding;
}

/** Plan dimension: the viewer's tier, or `guest` for anonymous/local mode. */
export type AnalyticsPlan = 'free' | 'pro' | 'guest' | 'unknown';

/**
 * Low-cardinality dimensions attached to an event. Keep these to a small,
 * bounded set of values so Analytics Engine stays cheap and queryable.
 */
export interface AnalyticsDimensions {
	/** Viewer tier at the time of the event. */
	plan?: AnalyticsPlan;
	/** Where the event originated, e.g. 'user' | 'cron' | 'web'. */
	source?: string;
	/**
	 * For `gate_blocked`: which Pro gate rejected the request (a stable, low-
	 * cardinality name like a route id or `cloud_invoice_quota`). Omitted for
	 * all other events.
	 */
	gate?: string;
}

/**
 * Record a single product event. Fire-and-forget; never throws.
 *
 * Blob layout (fixed order so SQL queries can rely on positions):
 *   blob1 = event name, blob2 = plan, blob3 = source, blob4 = gate
 * doubles[0] = 1 (a count, so `sum(double1)` totals occurrences)
 * indexes[0] = event name (the sampling key)
 *
 * @param env    Anything exposing an optional `METRICS` binding (the Worker
 *               `Env`, a `RequestEvent.platform.env`, or the Cron `CronEnv`).
 * @param name   Stable, low-cardinality event name (see the taxonomy in
 *               docs/MONETIZATION.md → Analytics).
 * @param dims   Optional bounded dimensions.
 */
export function trackEvent(
	env: MetricsEnv | undefined,
	name: string,
	dims: AnalyticsDimensions = {}
): void {
	try {
		const metrics = env?.METRICS;
		if (!metrics) return; // No binding (plain dev) → no-op.

		metrics.writeDataPoint({
			blobs: [name, dims.plan ?? 'unknown', dims.source ?? 'user', dims.gate ?? ''],
			doubles: [1],
			indexes: [name]
		});
	} catch (err) {
		// Analytics must never break a request. Log at most.
		console.warn('[analytics] trackEvent failed (ignored):', err);
	}
}
