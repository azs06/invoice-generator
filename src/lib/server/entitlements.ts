import type { D1Database } from '@cloudflare/workers-types';
import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { trackEvent } from './analytics';
import { getInvoiceCount } from './db';
import { subscriptions } from './schema';
import type { InvoiceData } from '$lib/types';

export type Tier = 'pro' | 'free';

/**
 * Limits applied to free-tier users once monetization is enabled.
 * See docs/MONETIZATION.md §4 for the full free/pro split.
 */
export const FREE_LIMITS = {
	activeShareLinks: 3,
	cloudInvoices: 10
} as const;

/**
 * Whether monetization gating is enabled. Controlled by the
 * MONETIZATION_ENABLED var in wrangler.toml so gating can be shipped
 * dark and flipped on when billing (Polar) launches.
 */
export function isMonetizationEnabled(event: RequestEvent): boolean {
	return event.platform?.env?.MONETIZATION_ENABLED === 'true';
}

/**
 * Resolve a user's tier from the subscriptions table.
 * Pro = an active or trialing subscription (lifetime plans stay 'active').
 */
export async function getTier(db: D1Database, userId: string): Promise<Tier> {
	try {
		const d1 = drizzle(db);
		const sub = await d1
			.select({ status: subscriptions.status })
			.from(subscriptions)
			.where(eq(subscriptions.userId, userId))
			.get();

		if (sub && (sub.status === 'active' || sub.status === 'trialing')) {
			return 'pro';
		}
	} catch (err) {
		// Table may not exist yet (migration not applied) - treat as free
		console.warn('getTier failed, defaulting to free:', err);
	}

	return 'free';
}

/**
 * Require a Pro entitlement for the current request.
 * No-op while monetization is disabled, so features keep working
 * exactly as today until billing launches.
 */
export function requirePro(event: RequestEvent): void {
	if (!isMonetizationEnabled(event)) return;

	if (event.locals.tier !== 'pro') {
		// Highest-signal conversion event: a free user hit a Pro gate. The gate
		// name is the SvelteKit route id (low cardinality, no invoice ids).
		trackEvent(event.platform?.env, 'gate_blocked', {
			plan: 'free',
			gate: event.route?.id ?? 'unknown'
		});
		throw error(402, 'This feature requires FreeInvoice Pro');
	}
}

/**
 * Enforce the free-tier gates that apply when saving a cloud invoice.
 * Shared by POST /api/invoices and PUT /api/invoices/[id].
 *
 * No-op unless monetization is enabled and the user is on the free tier.
 * The gates grandfather existing data (see docs/MONETIZATION.md §4):
 * - the cloud invoice quota applies to creates only; updates are never blocked.
 * - the payment-link gate blocks only when payment details are being *newly*
 *   enabled; invoices that already had them stay editable/saveable forever.
 *
 * `incoming` is the invoice payload being saved; `stored` is the currently
 * persisted invoice for this id (null on create). Pass `stored` in so callers
 * do a single stored-invoice lookup per request. The grandfather diff is
 * mandatory: the editor auto-saves constantly, so a stateless gate would lock
 * free users out of their own already-enabled data.
 */
export async function enforceInvoiceSaveGates(
	event: RequestEvent,
	db: D1Database,
	userId: string,
	incoming: InvoiceData,
	stored: InvoiceData | null
): Promise<void> {
	if (!isMonetizationEnabled(event) || event.locals.tier === 'pro') return;

	// Cloud invoice quota: only creates count against the limit.
	if (!stored) {
		const count = await getInvoiceCount(db, userId);
		if (count >= FREE_LIMITS.cloudInvoices) {
			trackEvent(event.platform?.env, 'gate_blocked', {
				plan: 'free',
				gate: 'cloud_invoice_quota'
			});
			throw error(
				402,
				`Free accounts can store up to ${FREE_LIMITS.cloudInvoices} invoices in the cloud. Upgrade to Pro for unlimited storage.`
			);
		}
	}

	// Payment link (Pro): block only when newly enabling payment details.
	// Grandfather invoices that already had them enabled so auto-save never
	// locks a free user out of an invoice they previously turned this on for.
	if (incoming.paymentDetails?.enabled && !stored?.paymentDetails?.enabled) {
		trackEvent(event.platform?.env, 'gate_blocked', {
			plan: 'free',
			gate: 'payment_link'
		});
		throw error(
			402,
			'“Pay this invoice” payment links require FreeInvoice Pro. Upgrade to add a payment link to your shared invoices.'
		);
	}
}
