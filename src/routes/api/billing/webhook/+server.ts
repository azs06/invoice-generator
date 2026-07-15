import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';
import { json } from '@sveltejs/kit';
import { planForProductId } from '$lib/server/billing';
import { upsertSubscription } from '$lib/server/db';
import { requireDB, requirePlatform } from '$lib/server/session';
import type { RequestHandler } from './$types';

/** Metadata values are string|number|boolean; only accept a string userId. */
function metaUserId(metadata: Record<string, unknown> | null | undefined): string | undefined {
	const value = metadata?.userId;
	return typeof value === 'string' ? value : undefined;
}

/**
 * POST /api/billing/webhook — Polar delivers order/subscription events here.
 * Signature is verified with POLAR_WEBHOOK_SECRET; the payload's external
 * customer id (set to our user id at checkout) maps the event back to a user.
 */
export const POST: RequestHandler = async (event) => {
	const env = requirePlatform(event);
	const db = requireDB(event);

	const secret = env.POLAR_WEBHOOK_SECRET;
	if (!secret) {
		return json({ error: 'Billing webhook not configured' }, { status: 503 });
	}

	// validateEvent needs the RAW body string and the standard webhook headers.
	const body = await event.request.text();
	const headers = Object.fromEntries(event.request.headers);

	let webhookEvent;
	try {
		webhookEvent = validateEvent(body, headers, secret);
	} catch (err) {
		if (err instanceof WebhookVerificationError) {
			return json({ error: 'Invalid signature' }, { status: 403 });
		}
		throw err;
	}

	switch (webhookEvent.type) {
		case 'order.paid': {
			const order = webhookEvent.data;
			// Recurring plans are driven by subscription.* events; only handle the
			// one-time lifetime purchase here (subscription orders carry a sub id).
			if (order.subscriptionId) break;
			const userId = order.customer?.externalId ?? metaUserId(order.metadata);
			const plan = planForProductId(env, order.productId);
			if (userId && plan === 'lifetime') {
				await upsertSubscription(db, {
					userId,
					provider: 'polar',
					providerCustomerId: order.customerId,
					providerSubscriptionId: null,
					plan: 'lifetime',
					status: 'active',
					currentPeriodEnd: null
				});
			}
			break;
		}
		case 'subscription.active':
		case 'subscription.updated':
		case 'subscription.canceled':
		case 'subscription.revoked': {
			const sub = webhookEvent.data;
			const userId = sub.customer?.externalId ?? metaUserId(sub.metadata);
			if (userId) {
				const plan = planForProductId(env, sub.productId);
				await upsertSubscription(db, {
					userId,
					provider: 'polar',
					providerCustomerId: sub.customerId,
					providerSubscriptionId: sub.id,
					plan: plan ?? 'pro_monthly',
					status: sub.status,
					currentPeriodEnd: sub.currentPeriodEnd ?? null
				});
			}
			break;
		}
	}

	return json({ received: true });
};
