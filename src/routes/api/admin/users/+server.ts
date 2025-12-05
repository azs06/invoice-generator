import { json } from '@sveltejs/kit';
import { requireDB, requireAdmin, isSuperAdmin, requirePlatform } from '$lib/server/session';
import { drizzle } from 'drizzle-orm/d1';
import { user, invoices } from '$lib/server/schema';
import { count, eq, isNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export interface AdminUser {
	id: string;
	name: string;
	email: string;
	image: string | null;
	role: string;
	isBanned: boolean;
	isSuperAdmin: boolean;
	invoiceCount: number;
	createdAt: Date;
}

/**
 * GET /api/admin/users
 * List all active users (not soft-deleted) with their invoice counts.
 */
export const GET: RequestHandler = async (event) => {
	await requireAdmin(event);

	const db = requireDB(event);
	const env = requirePlatform(event);
	const d1 = drizzle(db);

	// Get all non-deleted users
	const users = await d1.select().from(user).where(isNull(user.deletedAt)).all();

	// Get invoice counts for each user
	const usersWithStats: AdminUser[] = await Promise.all(
		users.map(async (u) => {
			const invoiceCount = await d1
				.select({ count: count() })
				.from(invoices)
				.where(eq(invoices.userId, u.id))
				.get();

			return {
				id: u.id,
				name: u.name,
				email: u.email,
				image: u.image,
				role: u.role,
				isBanned: u.isBanned,
				isSuperAdmin: isSuperAdmin(u.email, env),
				invoiceCount: invoiceCount?.count ?? 0,
				createdAt: u.createdAt
			};
		})
	);

	// Sort by creation date, newest first
	usersWithStats.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

	return json({
		users: usersWithStats,
		stats: {
			totalUsers: users.length,
			bannedUsers: users.filter((u) => u.isBanned).length,
			activeUsers: users.filter((u) => !u.isBanned).length,
			adminUsers: users.filter((u) => u.role === 'admin').length
		}
	});
};
