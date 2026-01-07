import { redirect } from '@sveltejs/kit';
import { requireDB, isUserAdmin, requirePlatform } from '$lib/server/session';
import type { LayoutServerLoad } from './$types';

/**
 * Admin layout guard - ensures only admins can access /admin routes.
 */
export const load: LayoutServerLoad = async (event) => {
	const session = event.locals.session;

	if (!session) {
		throw redirect(302, '/?login=required');
	}

	const db = requireDB(event);
	const env = requirePlatform(event);

	const isAdmin = await isUserAdmin(db, session.user.id, env);

	if (!isAdmin) {
		throw redirect(302, '/dashboard');
	}

	return {
		admin: {
			name: session.user.name,
			email: session.user.email
		}
	};
};
