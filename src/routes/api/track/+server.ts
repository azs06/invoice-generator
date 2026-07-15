import { json } from '@sveltejs/kit';
import { type AnalyticsPlan, trackEvent } from '$lib/server/analytics';
import type { RequestHandler } from './$types';

/**
 * POST /api/track — minimal, unauthenticated funnel beacon for guest-side
 * events that happen entirely in the browser (local-mode invoice save,
 * client-side PDF, prompt impressions). Called fire-and-forget from
 * src/lib/analytics.ts.
 *
 * Privacy/abuse posture:
 * - Only a fixed allowlist of low-cardinality event names is accepted; anything
 *   else is silently ignored. The body carries no free-form data, so no PII can
 *   be recorded.
 * - Lightly rate-limited with a per-isolate, in-memory sliding window keyed by
 *   client IP. This is best-effort only: the map lives in Worker isolate memory,
 *   so it resets on cold start and is not shared across isolates. That's an
 *   acceptable tradeoff for anonymous telemetry — we don't want a D1 write per
 *   beacon, and the endpoint does nothing but bump a free-tier counter. The IP
 *   is used solely as an ephemeral throttle key and is never recorded.
 * - Always responds 204 (even when ignored/throttled) so the client never
 *   treats analytics as a failure.
 */

/** Guest events allowed from the browser. Keep this list tiny + stable. */
const ALLOWED_EVENTS = new Set([
	'guest_invoice_created',
	'guest_pdf_downloaded',
	'signup_prompt_shown',
	'upgrade_prompt_shown'
]);

// Per-isolate throttle: at most MAX_PER_WINDOW accepted beacons per IP per
// window. Best-effort (see the note above).
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;
const hits = new Map<string, number[]>();

function allow(ip: string): boolean {
	const now = Date.now();
	const cutoff = now - WINDOW_MS;
	const recent = (hits.get(ip) ?? []).filter((t) => t > cutoff);
	if (recent.length >= MAX_PER_WINDOW) {
		hits.set(ip, recent);
		return false;
	}
	recent.push(now);
	hits.set(ip, recent);
	// Opportunistic cleanup so the map can't grow unbounded across many IPs.
	if (hits.size > 5000) {
		for (const [key, times] of hits) {
			if (times.every((t) => t <= cutoff)) hits.delete(key);
		}
	}
	return true;
}

const noContent = () => new Response(null, { status: 204 });

export const POST: RequestHandler = async (event) => {
	try {
		let ip = 'unknown';
		try {
			ip = event.getClientAddress();
		} catch {
			// No client address available (e.g. local dev) — share one bucket.
		}
		if (!allow(ip)) return noContent();

		const body = (await event.request.json().catch(() => null)) as { event?: unknown } | null;
		const name = typeof body?.event === 'string' ? body.event : '';
		if (!ALLOWED_EVENTS.has(name)) return noContent();

		// Guests are anonymous; signed-in users don't hit this path. Tag plan as
		// 'guest' unless a session happens to be present.
		const plan: AnalyticsPlan = event.locals.session ? event.locals.tier : 'guest';
		trackEvent(event.platform?.env, name, { plan, source: 'web' });
	} catch {
		// Never let a beacon surface as an error.
	}
	return noContent();
};

// Silence any accidental GET/HEAD probes cheaply.
export const GET: RequestHandler = () => json({ ok: true });
