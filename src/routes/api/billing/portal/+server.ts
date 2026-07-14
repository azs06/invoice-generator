import { redirect } from '@sveltejs/kit';
import { createPolar, isBillingConfigured } from '$lib/server/billing';
import { requirePlatform, requireSession } from '$lib/server/session';
import type { RequestHandler } from './$types';

/**
 * GET /api/billing/portal
 * Redirects the signed-in user to their Polar-hosted customer portal
 * (manage plan, update card, download receipts). Requires an existing Polar
 * customer (created at first checkout), matched by externalCustomerId = user id.
 */
export const GET: RequestHandler = async (event) => {
	const session = await requireSession(event);
	const env = requirePlatform(event);

	if (!isBillingConfigured(env)) {
		throw redirect(303, '/pricing?billing=unavailable');
	}

	const polar = createPolar(env);

	let portalUrl: string;
	try {
		const customerSession = await polar.customerSessions.create({
			externalCustomerId: session.user.id
		});
		portalUrl = customerSession.customerPortalUrl;
	} catch (err) {
		// No Polar customer yet (never purchased) or API error — nudge to pricing.
		console.error('Polar portal session failed:', err);
		throw redirect(303, '/pricing?billing=no-customer');
	}

	throw redirect(303, portalUrl);
};
