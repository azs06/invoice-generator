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
    // Attach session to locals for all routes
    // This avoids duplicating auth checks in every API route
    event.locals.session = await getSession(event);

    const response = await resolve(event);
    return response;
};
