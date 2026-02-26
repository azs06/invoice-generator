import { count, eq, isNotNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { invoices, user } from '$lib/server/schema';
import { requireDB } from '$lib/server/session';
import type { PageServerLoad } from './$types';

export interface DeletedUser {
	id: string;
	name: string;
	email: string;
	image: string | null;
	role: string;
	invoiceCount: number;
	deletedAt: Date;
	createdAt: Date;
}

export const load: PageServerLoad = async (event) => {
	const db = requireDB(event);
	const d1 = drizzle(db);

	// Get all deleted users
	const users = await d1.select().from(user).where(isNotNull(user.deletedAt)).all();

	// Get invoice counts for each user
	const deletedUsers: DeletedUser[] = await Promise.all(
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
				invoiceCount: invoiceCount?.count ?? 0,
				deletedAt: u.deletedAt!,
				createdAt: u.createdAt
			};
		})
	);

	// Sort by deletion date, newest first
	deletedUsers.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());

	return { users: deletedUsers };
};
