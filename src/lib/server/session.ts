import { json, error } from '@sveltejs/kit';
import { createAuth } from './auth';
import type { RequestEvent } from '@sveltejs/kit';
import type { Session, User } from 'better-auth';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

export interface AuthSession {
    session: Session;
    user: User;
}

export interface SessionResult {
    session: AuthSession | null;
    error: { message: string; status: number } | null;
}

/**
 * Get the current session from a request event.
 * Returns null if not authenticated or if platform is unavailable.
 */
export async function getSession(event: RequestEvent): Promise<AuthSession | null> {
    const env = event.platform?.env;
    
    if (!env) {
        console.warn('Platform environment not available - running outside Cloudflare?');
        return null;
    }

    try {
        const auth = createAuth(env);
        const session = await auth.api.getSession({ headers: event.request.headers });
        return session;
    } catch (err) {
        console.error('Failed to get session:', err);
        return null;
    }
}

/**
 * Require an authenticated session. Returns the session or throws an error response.
 * Use this in API routes that require authentication.
 */
export async function requireSession(event: RequestEvent): Promise<AuthSession> {
    const env = event.platform?.env;
    
    if (!env) {
        throw error(503, 'Service temporarily unavailable');
    }

    const session = await getSession(event);
    
    if (!session) {
        throw error(401, 'Unauthorized');
    }

    return session;
}

/**
 * Check if the platform environment is available.
 * Useful for early checks in API routes.
 */
export function requirePlatform(event: RequestEvent): App.Platform['env'] {
    const env = event.platform?.env;
    
    if (!env) {
        throw error(503, 'Service temporarily unavailable');
    }

    return env;
}

/**
 * Get database from platform, throwing if unavailable.
 */
export function requireDB(event: RequestEvent): D1Database {
    const env = requirePlatform(event);
    
    if (!env.DB) {
        throw error(500, 'Database not available');
    }

    return env.DB;
}

/**
 * Get R2 bucket from platform (optional - may be undefined).
 */
export function getBucket(event: RequestEvent): R2Bucket | undefined {
    return event.platform?.env?.BUCKET;
}
