import type { Handle } from '@sveltejs/kit';
import { getSession } from '$lib/server/session';

/**
 * SvelteKit server hooks for centralized request handling.
 * 
 * This hook runs on every server request and:
 * 1. Attaches the user session to event.locals (if authenticated)
 * 2. Makes session available to all routes without per-route auth boilerplate
 */
export const handle: Handle = async ({ event, resolve }) => {
    // Ignore Chrome DevTools requests (avoid noisy 404 logs)
    if (event.url.pathname.startsWith('/.well-known/')) {
        return new Response(null, { status: 404 });
    }

    // Attempt to get session - will return null if platform bindings unavailable
    event.locals.session = await getSession(event);

    const response = await resolve(event);
    return response;
};
