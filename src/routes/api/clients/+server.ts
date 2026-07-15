import { error, json } from '@sveltejs/kit';
import { createClient, getClients } from '$lib/server/db';
import { requirePro } from '$lib/server/entitlements';
import { requireDB } from '$lib/server/session';
import type { RequestHandler } from './$types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 200;
const MAX_FIELD = 2000;

/** Trim a string field to a bounded length, or null when empty/absent. */
function optionalField(value: unknown, max: number): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (trimmed === '') return null;
	return trimmed.slice(0, max);
}

export const GET: RequestHandler = async (event) => {
	const session = event.locals.session;
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const db = requireDB(event);
	const clients = await getClients(db, session.user.id);
	return json({ clients });
};

export const POST: RequestHandler = async (event) => {
	const session = event.locals.session;
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Saving a new client is a new Pro action (no grandfathering).
	// No-op until MONETIZATION_ENABLED.
	requirePro(event);

	const db = requireDB(event);

	const body = (await event.request.json().catch(() => null)) as {
		name?: unknown;
		email?: unknown;
		phone?: unknown;
		address?: unknown;
		notes?: unknown;
	} | null;

	const name = typeof body?.name === 'string' ? body.name.trim() : '';
	if (name === '') {
		throw error(400, 'A client name is required.');
	}

	const email = optionalField(body?.email, MAX_FIELD);
	if (email !== null && !EMAIL_REGEX.test(email)) {
		throw error(400, 'A valid email address is required.');
	}

	const id = await createClient(db, session.user.id, {
		name: name.slice(0, MAX_NAME),
		email,
		phone: optionalField(body?.phone, MAX_FIELD),
		address: optionalField(body?.address, MAX_FIELD),
		notes: optionalField(body?.notes, MAX_FIELD)
	});

	return json({ success: true, id });
};
