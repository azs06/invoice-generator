import { json, error } from '@sveltejs/kit';
import { requireDB, requireAdmin, isSuperAdmin, requirePlatform, isUserAdmin } from '$lib/server/session';
import { drizzle } from 'drizzle-orm/d1';
import { user } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

/**
 * POST /api/admin/users/[id]/role
 * Change a user's role (admin or user).
 * Only super admins can promote/demote other admins.
 */
export const POST: RequestHandler = async (event) => {
    const session = await requireAdmin(event);

    const db = requireDB(event);
    const env = requirePlatform(event);
    const d1 = drizzle(db);
    const { id } = event.params;
    const { role } = await event.request.json() as { role: 'admin' | 'user' };

    // Validate role
    if (role !== 'admin' && role !== 'user') {
        throw error(400, 'Invalid role. Must be "admin" or "user"');
    }

    // Get target user
    const targetUser = await d1.select().from(user).where(eq(user.id, id)).get();

    if (!targetUser) {
        throw error(404, 'User not found');
    }

    // Prevent changing super admin's role
    if (isSuperAdmin(targetUser.email, env)) {
        throw error(400, 'Cannot change super admin role');
    }

    // Only super admins can change roles
    if (!isSuperAdmin(session.user.email, env)) {
        throw error(403, 'Only super admin can change user roles');
    }

    // Update role
    await d1.update(user)
        .set({
            role,
            updatedAt: new Date()
        })
        .where(eq(user.id, id));

    return json({
        success: true,
        role,
        message: role === 'admin' ? 'User is now an admin' : 'User is no longer an admin'
    });
};
