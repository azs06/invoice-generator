import { error, redirect } from '@sveltejs/kit';
import { createPolar, isBillingConfigured, isValidPlan, productIdForPlan } from '$lib/server/billing';
import { requirePlatform, requireSession } from '$lib/server/session';
import type { RequestHandler } from './$types';

/**
 * GET /api/billing/checkout?plan=pro_monthly|pro_annual|lifetime
 * Creates a Polar hosted checkout for the signed-in user and redirects to it.
 * The user id is passed as externalCustomerId so the webhook can map back to us.
 */
export const GET: RequestHandler = async (event) => {
	const session = await requireSession(event);
	const env = requirePlatform(event);

	const plan = event.url.searchParams.get('plan');
	if (!isValidPlan(plan)) {
		throw error(400, 'Invalid or missing plan');
	}

	if (!isBillingConfigured(env)) {
		throw redirect(303, '/pricing?billing=unavailable');
	}

	const productId = productIdForPlan(env, plan);
	if (!productId) {
		throw redirect(303, '/pricing?billing=unavailable');
	}

	const polar = createPolar(env);

	let checkoutUrl: string;
	try {
		const checkout = await polar.checkouts.create({
			products: [productId],
			successUrl: `${event.url.origin}/dashboard/settings?upgraded=1`,
			externalCustomerId: session.user.id,
			customerEmail: session.user.email,
			metadata: { userId: session.user.id, plan }
		});
		checkoutUrl = checkout.url;
	} catch (err) {
		console.error('Polar checkout creation failed:', err);
		throw redirect(303, '/pricing?billing=error');
	}

	throw redirect(303, checkoutUrl);
};
