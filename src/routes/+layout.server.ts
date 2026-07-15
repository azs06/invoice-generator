import { building } from '$app/environment';
import { isUserAdmin, requirePlatform } from '$lib/server/session';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const session = event.locals.session;
	// platform.env access throws inside the Cloudflare adapter during prerender
	const monetizationEnabled = !building && event.platform?.env?.MONETIZATION_ENABLED === 'true';
	const tier = event.locals.tier ?? 'free';

	if (!session || !event.platform?.env?.DB) {
		return { isAdmin: false, monetizationEnabled, tier };
	}

	const db = event.platform.env.DB;
	const env = event.platform.env;

	const isAdmin = await isUserAdmin(db, session.user.id, env);

	return { isAdmin, monetizationEnabled, tier };
};
