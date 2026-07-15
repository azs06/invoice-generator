import { error, json } from '@sveltejs/kit';
import { deleteClient, updateClient } from '$lib/server/db';
import { requirePro } from '$lib/server/entitlements';
import { requireDB } from '$lib/server/session';
import type { RequestHandler } from './$types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 200;
const MAX_FIELD = 2000;

/** Trim a string field to a bounded length, or null when empty. */
function optionalField(value: unknown, max: number): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (trimmed === '') return null;
	return trimmed.slice(0, max);
}

export const PUT: RequestHandler = async (event) => {
	const session = event.locals.session;
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Editing a client keeps it a Pro action (no-op until MONETIZATION_ENABLED).
	requirePro(event);

	const db = requireDB(event);
	const { id } = event.params;
	if (!id) {
		throw error(400, 'Client id is required.');
	}

	const body = (await event.request.json().catch(() => null)) as {
		name?: unknown;
		email?: unknown;
		phone?: unknown;
		address?: unknown;
		notes?: unknown;
	} | null;

	const patch: {
		name?: string;
		email?: string | null;
		phone?: string | null;
		address?: string | null;
		notes?: string | null;
	} = {};

	if (body?.name !== undefined) {
		const name = typeof body.name === 'string' ? body.name.trim() : '';
		if (name === '') {
			throw error(400, 'A client name is required.');
		}
		patch.name = name.slice(0, MAX_NAME);
	}

	if (body?.email !== undefined) {
		const email = optionalField(body.email, MAX_FIELD);
		if (email !== null && !EMAIL_REGEX.test(email)) {
			throw error(400, 'A valid email address is required.');
		}
		patch.email = email;
	}

	if (body?.phone !== undefined) patch.phone = optionalField(body.phone, MAX_FIELD);
	if (body?.address !== undefined) patch.address = optionalField(body.address, MAX_FIELD);
	if (body?.notes !== undefined) patch.notes = optionalField(body.notes, MAX_FIELD);

	if (Object.keys(patch).length === 0) {
		throw error(400, 'No valid fields to update.');
	}

	const updated = await updateClient(db, session.user.id, id, patch);
	if (!updated) {
		throw error(404, 'Client not found.');
	}

	return json({ success: true });
};

export const DELETE: RequestHandler = async (event) => {
	const session = event.locals.session;
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const db = requireDB(event);
	const { id } = event.params;
	if (!id) {
		throw error(400, 'Client id is required.');
	}

	const deleted = await deleteClient(db, session.user.id, id);
	if (!deleted) {
		throw error(404, 'Client not found.');
	}

	return json({ success: true });
};
