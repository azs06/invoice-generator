/**
 * Client-side funnel beacon helper.
 *
 * Fire-and-forget POSTs to /api/track for the handful of guest events that
 * happen entirely in the browser (see the allowlist in that endpoint). Uses
 * navigator.sendBeacon when available (survives page unload / navigation) and
 * falls back to fetch with keepalive. NEVER throws and never blocks the caller —
 * analytics must not affect the user-facing flow.
 */

/** Guest events mirrored by the /api/track allowlist. */
export type GuestEvent =
	| 'guest_invoice_created'
	| 'guest_pdf_downloaded'
	| 'signup_prompt_shown'
	| 'upgrade_prompt_shown';

/** Send a guest funnel event. Safe to call anywhere; no-ops on the server. */
export function track(event: GuestEvent): void {
	try {
		if (typeof window === 'undefined') return;
		const body = JSON.stringify({ event });

		if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
			const blob = new Blob([body], { type: 'application/json' });
			if (navigator.sendBeacon('/api/track', blob)) return;
		}

		// Fallback: keepalive fetch so it still flushes during navigation/unload.
		void fetch('/api/track', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body,
			keepalive: true
		}).catch(() => {
			// Ignore — analytics is best-effort.
		});
	} catch {
		// Never let a beacon surface as an error.
	}
}

/**
 * Fire a guest event at most once per `key` for the lifetime of this page
 * session. Used to dedupe the high-frequency auto-save path so a guest working
 * on one invoice is counted once, not on every keystroke.
 */
const fired = new Set<string>();
export function trackOnce(event: GuestEvent, key: string): void {
	const dedupeKey = `${event}:${key}`;
	if (fired.has(dedupeKey)) return;
	fired.add(dedupeKey);
	track(event);
}
