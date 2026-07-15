import { error, json } from '@sveltejs/kit';
import { deleteRecurringSchedule, updateRecurringSchedule } from '$lib/server/db';
import { requirePro } from '$lib/server/entitlements';
import { isFrequency } from '$lib/server/recurring';
import { requireDB } from '$lib/server/session';
import type { RequestHandler } from './$types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseStartDate(value: unknown): Date | null {
	if (typeof value !== 'string' || value === '') return null;
	const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value;
	const ms = Date.parse(normalized);
	return Number.isNaN(ms) ? null : new Date(ms);
}

export const PUT: RequestHandler = async (event) => {
	const session = event.locals.session;
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Editing a schedule keeps it a Pro action (no-op until MONETIZATION_ENABLED).
	requirePro(event);

	const db = requireDB(event);
	const { id } = event.params;
	if (!id) {
		throw error(400, 'Schedule id is required.');
	}

	const body = (await event.request.json().catch(() => null)) as {
		frequency?: unknown;
		recipientEmail?: unknown;
		active?: unknown;
		startDate?: unknown;
	} | null;

	const patch: {
		frequency?: string;
		recipientEmail?: string;
		active?: boolean;
		nextRunAt?: Date;
	} = {};

	if (body?.frequency !== undefined) {
		if (!isFrequency(body.frequency)) {
			throw error(400, 'Frequency must be one of: weekly, monthly, yearly.');
		}
		patch.frequency = body.frequency;
	}

	if (body?.recipientEmail !== undefined) {
		const recipientEmail = typeof body.recipientEmail === 'string' ? body.recipientEmail.trim() : '';
		if (!EMAIL_REGEX.test(recipientEmail)) {
			throw error(400, 'A valid recipient email address is required.');
		}
		patch.recipientEmail = recipientEmail;
	}

	if (body?.active !== undefined) {
		if (typeof body.active !== 'boolean') {
			throw error(400, 'active must be a boolean.');
		}
		patch.active = body.active;
	}

	if (body?.startDate !== undefined) {
		const nextRunAt = parseStartDate(body.startDate);
		if (!nextRunAt) {
			throw error(400, 'Start date is invalid.');
		}
		patch.nextRunAt = nextRunAt;
	}

	if (Object.keys(patch).length === 0) {
		throw error(400, 'No valid fields to update.');
	}

	const updated = await updateRecurringSchedule(db, session.user.id, id, patch);
	if (!updated) {
		throw error(404, 'Schedule not found.');
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
		throw error(400, 'Schedule id is required.');
	}

	const deleted = await deleteRecurringSchedule(db, session.user.id, id);
	if (!deleted) {
		throw error(404, 'Schedule not found.');
	}

	return json({ success: true });
};
