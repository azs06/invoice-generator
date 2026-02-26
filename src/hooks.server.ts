import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { session as sessionTable } from '$lib/server/schema';
import {
	checkUserStatus,
	getSession,
	getUserById,
	isSuperAdmin,
	isUserAdmin
} from '$lib/server/session';

/**
 * SvelteKit server hooks for centralized request handling.
 *
 * This hook runs on every server request and:
 * 1. Attaches the user session to event.locals (if authenticated)
 * 2. Checks if user is banned and redirects with message
 * 3. Makes session available to all routes without per-route auth boilerplate
 */
export const handle: Handle = async ({ event, resolve }) => {
	// Ignore noisy 404s (service worker probes, Chrome DevTools)
	if (event.url.pathname === '/sw.js' || event.url.pathname.startsWith('/.well-known/')) {
		return new Response(null, { status: 404 });
	}

	// Attempt to get session - will return null if platform bindings unavailable
	const session = await getSession(event);
	event.locals.session = session;

	// Check if user is banned or deleted
	if (session && event.platform?.env?.DB) {
		const db = event.platform.env.DB;
		const userStatus = await checkUserStatus(db, session.user.id);

		if (userStatus.isBanned || userStatus.isDeleted) {
			// Clear session for banned/deleted user
			const d1 = drizzle(db);
			await d1.delete(sessionTable).where(eq(sessionTable.userId, session.user.id));

			// Clear session from locals
			event.locals.session = null;

			// Redirect to home with ban message (don't redirect if already at home with query)
			if (!event.url.pathname.startsWith('/api')) {
				const reason = userStatus.isBanned ? 'banned' : 'deleted';
				throw redirect(302, `/?account=${reason}`);
			}
		}
	}

	const response = await resolve(event);
	return response;
};
