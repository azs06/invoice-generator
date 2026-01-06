import { json, error } from '@sveltejs/kit';
import {
	requireDB,
	getBucket,
	requireAdmin,
	isSuperAdmin,
	requirePlatform
} from '$lib/server/session';
import { drizzle } from 'drizzle-orm/d1';
import { clearAllInvoices } from '$lib/server/db';
import { user, session as sessionTable, account, userSettings } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

/**
 * DELETE /api/admin/users/[id]/destroy
 * Permanently delete a user and all their data.
 * This action is irreversible.
 */
export const DELETE: RequestHandler = async (event) => {
	await requireAdmin(event);

	const db = requireDB(event);
	const bucket = getBucket(event);
	const env = requirePlatform(event);
	const d1 = drizzle(db);
	const { id } = event.params;

	// Get target user
	const targetUser = await d1.select().from(user).where(eq(user.id, id)).get();

	if (!targetUser) {
		throw error(404, 'User not found');
	}

	// Prevent destroying super admin
	if (isSuperAdmin(targetUser.email, env)) {
		throw error(400, 'Cannot permanently delete super admin');
	}

	await clearAllInvoices(db, bucket, id);

	// Delete all user data (foreign keys with CASCADE will handle related tables)
	// But we need to manually delete some since they might not cascade properly
	await d1.batch([
		d1.delete(sessionTable).where(eq(sessionTable.userId, id)),
		d1.delete(account).where(eq(account.userId, id)),
		d1.delete(userSettings).where(eq(userSettings.userId, id)),
		d1.delete(user).where(eq(user.id, id))
	]);

	return json({
		success: true,
		message: 'User has been permanently deleted'
	});
};
