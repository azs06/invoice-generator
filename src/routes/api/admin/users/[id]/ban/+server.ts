import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { session as sessionTable, user } from '$lib/server/schema';
import { isSuperAdmin, requireAdmin, requireDB, requirePlatform } from '$lib/server/session';
import type { RequestHandler } from './$types';

/**
 * POST /api/admin/users/[id]/ban
 * Ban or unban a user. Banning also invalidates all their sessions.
 */
export const POST: RequestHandler = async (event) => {
	await requireAdmin(event);

	const db = requireDB(event);
	const env = requirePlatform(event);
	const d1 = drizzle(db);
	const { id } = event.params;
	const { banned } = (await event.request.json()) as { banned: boolean };

	// Get target user
	const targetUser = await d1.select().from(user).where(eq(user.id, id)).get();

	if (!targetUser) {
		throw error(404, 'User not found');
	}

	// Prevent banning super admin
	if (isSuperAdmin(targetUser.email, env)) {
		throw error(400, 'Cannot ban super admin');
	}

	// Update ban status
	await d1
		.update(user)
		.set({
			isBanned: banned,
			updatedAt: new Date()
		})
		.where(eq(user.id, id));

	// If banning, invalidate all sessions to force logout
	if (banned) {
		await d1.delete(sessionTable).where(eq(sessionTable.userId, id));
	}

	return json({
		success: true,
		banned,
		message: banned ? 'User has been banned' : 'User has been unbanned'
	});
};
