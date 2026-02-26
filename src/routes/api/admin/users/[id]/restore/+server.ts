import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { user } from '$lib/server/schema';
import { requireAdmin, requireDB } from '$lib/server/session';
import type { RequestHandler } from './$types';

/**
 * POST /api/admin/users/[id]/restore
 * Restore a soft-deleted user by clearing deletedAt.
 */
export const POST: RequestHandler = async (event) => {
	await requireAdmin(event);

	const db = requireDB(event);
	const d1 = drizzle(db);
	const { id } = event.params;

	// Get target user
	const targetUser = await d1.select().from(user).where(eq(user.id, id)).get();

	if (!targetUser) {
		throw error(404, 'User not found');
	}

	if (!targetUser.deletedAt) {
		throw error(400, 'User is not deleted');
	}

	// Restore by clearing deletedAt
	await d1
		.update(user)
		.set({
			deletedAt: null,
			updatedAt: new Date()
		})
		.where(eq(user.id, id));

	return json({
		success: true,
		message: 'User has been restored'
	});
};
