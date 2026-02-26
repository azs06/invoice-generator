import { isUserAdmin, requirePlatform } from '$lib/server/session';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const session = event.locals.session;

	if (!session || !event.platform?.env?.DB) {
		return { isAdmin: false };
	}

	const db = event.platform.env.DB;
	const env = event.platform.env;

	const isAdmin = await isUserAdmin(db, session.user.id, env);

	return { isAdmin };
};
