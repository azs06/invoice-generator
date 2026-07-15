import { Polar } from '@polar-sh/sdk';

/**
 * Polar billing integration (Merchant of Record). See docs/MONETIZATION.md §5A.
 *
 * All of this is inert until the Polar env vars are set — `isBillingConfigured`
 * gates every entry point so the app runs unchanged in dev / before launch.
 */

export type Plan = 'pro_monthly' | 'pro_annual' | 'lifetime';

export const PLANS: Plan[] = ['pro_monthly', 'pro_annual', 'lifetime'];

export function isValidPlan(value: string | null | undefined): value is Plan {
	return value === 'pro_monthly' || value === 'pro_annual' || value === 'lifetime';
}

/** Billing is usable only once an access token is provisioned. */
export function isBillingConfigured(env: Env): boolean {
	return Boolean(env.POLAR_ACCESS_TOKEN);
}

/** Construct a Polar SDK client for this request's environment. */
export function createPolar(env: Env): Polar {
	return new Polar({
		accessToken: env.POLAR_ACCESS_TOKEN,
		server: env.POLAR_SERVER === 'production' ? 'production' : 'sandbox'
	});
}

/** Map a plan to its configured Polar product id (undefined if not set). */
export function productIdForPlan(env: Env, plan: Plan): string | undefined {
	switch (plan) {
		case 'pro_monthly':
			return env.POLAR_PRODUCT_PRO_MONTHLY;
		case 'pro_annual':
			return env.POLAR_PRODUCT_PRO_ANNUAL;
		case 'lifetime':
			return env.POLAR_PRODUCT_LIFETIME;
	}
}

/** Reverse-map a Polar product id back to a plan (for webhook handling). */
export function planForProductId(env: Env, productId: string | null | undefined): Plan | null {
	if (!productId) return null;
	if (productId === env.POLAR_PRODUCT_PRO_MONTHLY) return 'pro_monthly';
	if (productId === env.POLAR_PRODUCT_PRO_ANNUAL) return 'pro_annual';
	if (productId === env.POLAR_PRODUCT_LIFETIME) return 'lifetime';
	return null;
}
