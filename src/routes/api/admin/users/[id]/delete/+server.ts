import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { session as sessionTable, user } from '$lib/server/schema';
import { isSuperAdmin, requireAdmin, requireDB, requirePlatform } from '$lib/server/session';
import type { RequestHandler } from './$types';

/**
 * DELETE /api/admin/users/[id]/delete
 * Soft delete a user by setting deletedAt timestamp.
 * Also invalidates all sessions.
 */
export const DELETE: RequestHandler = async (event) => {
	await requireAdmin(event);

	const db = requireDB(event);
	const env = requirePlatform(event);
	const d1 = drizzle(db);
	const { id } = event.params;

	// Get target user
	const targetUser = await d1.select().from(user).where(eq(user.id, id)).get();

	if (!targetUser) {
		throw error(404, 'User not found');
	}

	// Prevent deleting super admin
	if (isSuperAdmin(targetUser.email, env)) {
		throw error(400, 'Cannot delete super admin');
	}

	// Soft delete by setting deletedAt
	await d1
		.update(user)
		.set({
			deletedAt: new Date(),
			updatedAt: new Date()
		})
		.where(eq(user.id, id));

	// Invalidate all sessions
	await d1.delete(sessionTable).where(eq(sessionTable.userId, id));

	return json({
		success: true,
		message: 'User has been deleted'
	});
};
