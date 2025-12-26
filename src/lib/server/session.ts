import { json, error } from '@sveltejs/kit';
import { createAuth } from './auth';
import type { RequestEvent } from '@sveltejs/kit';
import type { Session, User } from 'better-auth';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { user } from './schema';

export interface AuthSession {
	session: Session;
	user: User;
}

export interface SessionResult {
	session: AuthSession | null;
	error: { message: string; status: number } | null;
}

export interface UserRecord {
	id: string;
	email: string;
	role: string;
	isBanned: boolean;
	deletedAt: Date | null;
}

/**
 * Get super admin emails from environment variable.
 * Super admins are defined in SUPER_ADMIN_EMAILS (comma-separated).
 */
function getSuperAdminEmails(env: Env): string[] {
	return (env.SUPER_ADMIN_EMAILS || '')
		.split(',')
		.map((e) => e.trim().toLowerCase())
		.filter((e) => e.length > 0);
}

/**
 * Check if an email belongs to a super admin.
 * Super admins are defined in env and cannot be deleted/banned.
 */
export function isSuperAdmin(email: string, env: Env): boolean {
	return getSuperAdminEmails(env).includes(email.toLowerCase());
}

/**
 * Check if a user has admin privileges (super admin or regular admin).
 */
export async function isUserAdmin(db: D1Database, userId: string, env: Env): Promise<boolean> {
	const d1 = drizzle(db);
	const userRecord = await d1.select().from(user).where(eq(user.id, userId)).get();

	if (!userRecord) return false;

	// Super admin from env
	if (isSuperAdmin(userRecord.email, env)) return true;

	// Regular admin from role
	return userRecord.role === 'admin';
}

/**
 * Get user record from database by ID.
 */
export async function getUserById(db: D1Database, userId: string): Promise<UserRecord | null> {
	const d1 = drizzle(db);
	const userRecord = await d1
		.select({
			id: user.id,
			email: user.email,
			role: user.role,
			isBanned: user.isBanned,
			deletedAt: user.deletedAt
		})
		.from(user)
		.where(eq(user.id, userId))
		.get();

	return userRecord || null;
}

/**
 * Check if a user is banned or deleted.
 */
export async function checkUserStatus(
	db: D1Database,
	userId: string
): Promise<{ isBanned: boolean; isDeleted: boolean }> {
	const userRecord = await getUserById(db, userId);

	// If user not found, don't treat as deleted (might be new columns not in DB yet)
	if (!userRecord) {
		return { isBanned: false, isDeleted: false };
	}

	return {
		isBanned: userRecord.isBanned === true,
		isDeleted: Boolean(userRecord.deletedAt)
	};
}

/**
 * Get the current session from a request event.
 * Returns null if not authenticated or if platform is unavailable.
 */
export async function getSession(event: RequestEvent): Promise<AuthSession | null> {
	// Check if platform exists at all
	if (!event.platform?.env) {
		console.warn('Platform environment not available - running outside Cloudflare?');
		return null;
	}

	try {
		// Try to access DB - this will throw on prerenderable routes
		// We need to catch this specific error from the Cloudflare adapter
		const db = event.platform.env.DB;
		if (!db) {
			console.warn('Database binding not available');
			return null;
		}

		const auth = createAuth(event.platform.env);
		const session = await auth.api.getSession({ headers: event.request.headers });
		return session;
	} catch (err) {
		// Handle the "Cannot access platform.env.DB in a prerenderable route" error gracefully
		if (err instanceof Error && err.message.includes('prerenderable')) {
			return null;
		}
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
 * Require admin access. Throws 403 if user is not an admin.
 */
export async function requireAdmin(event: RequestEvent): Promise<AuthSession> {
	const session = await requireSession(event);
	const env = requirePlatform(event);
	const db = requireDB(event);

	const isAdmin = await isUserAdmin(db, session.user.id, env);

	if (!isAdmin) {
		throw error(403, 'Forbidden: Admin access required');
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
