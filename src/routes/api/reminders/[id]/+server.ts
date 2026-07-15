import { error, json } from '@sveltejs/kit';
import { deleteReminder, updateReminder } from '$lib/server/db';
import { requirePro } from '$lib/server/entitlements';
import { requireDB } from '$lib/server/session';
import type { RequestHandler } from './$types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MIN_REMIND_DAYS = 1;
const MAX_REMIND_DAYS = 90;

export const PUT: RequestHandler = async (event) => {
	const session = event.locals.session;
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Editing a reminder keeps it a Pro action (no-op until MONETIZATION_ENABLED).
	requirePro(event);

	const db = requireDB(event);
	const { id } = event.params;
	if (!id) {
		throw error(400, 'Reminder id is required.');
	}

	const body = (await event.request.json().catch(() => null)) as {
		recipientEmail?: unknown;
		remindAfterDays?: unknown;
		active?: unknown;
	} | null;

	const patch: {
		recipientEmail?: string;
		remindAfterDays?: number;
		active?: boolean;
	} = {};

	if (body?.recipientEmail !== undefined) {
		const recipientEmail = typeof body.recipientEmail === 'string' ? body.recipientEmail.trim() : '';
		if (!EMAIL_REGEX.test(recipientEmail)) {
			throw error(400, 'A valid recipient email address is required.');
		}
		patch.recipientEmail = recipientEmail;
	}

	if (body?.remindAfterDays !== undefined) {
		const n =
			typeof body.remindAfterDays === 'number'
				? body.remindAfterDays
				: Number(body.remindAfterDays);
		if (!Number.isInteger(n) || n < MIN_REMIND_DAYS || n > MAX_REMIND_DAYS) {
			throw error(400, `Remind after must be between ${MIN_REMIND_DAYS} and ${MAX_REMIND_DAYS} days.`);
		}
		patch.remindAfterDays = n;
	}

	if (body?.active !== undefined) {
		if (typeof body.active !== 'boolean') {
			throw error(400, 'active must be a boolean.');
		}
		patch.active = body.active;
	}

	if (Object.keys(patch).length === 0) {
		throw error(400, 'No valid fields to update.');
	}

	const updated = await updateReminder(db, session.user.id, id, patch);
	if (!updated) {
		throw error(404, 'Reminder not found.');
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
		throw error(400, 'Reminder id is required.');
	}

	const deleted = await deleteReminder(db, session.user.id, id);
	if (!deleted) {
		throw error(404, 'Reminder not found.');
	}

	return json({ success: true });
};
