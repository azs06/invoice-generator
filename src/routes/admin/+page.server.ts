import { count, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { invoices, user } from '$lib/server/schema';
import { isSuperAdmin, requireDB, requirePlatform } from '$lib/server/session';
import type { PageServerLoad } from './$types';

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

export const load: PageServerLoad = async (event) => {
	const db = requireDB(event);
	const env = requirePlatform(event);
	const d1 = drizzle(db);
	const session = event.locals.session!;

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

	return {
		users: usersWithStats,
		stats: {
			totalUsers: users.length,
			bannedUsers: users.filter((u) => u.isBanned).length,
			activeUsers: users.filter((u) => !u.isBanned).length,
			adminUsers: users.filter((u) => u.role === 'admin' || isSuperAdmin(u.email, env)).length
		},
		currentUserIsSuperAdmin: isSuperAdmin(session.user.email, env)
	};
};
