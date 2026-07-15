import { error, json } from '@sveltejs/kit';
import { isValidInvoiceId } from '$lib/invoiceValidation';
import { trackEvent } from '$lib/server/analytics';
import { createRecurringSchedule, getRecurringSchedules } from '$lib/server/db';
import { requirePro } from '$lib/server/entitlements';
import { isFrequency } from '$lib/server/recurring';
import { requireDB } from '$lib/server/session';
import type { RequestHandler } from './$types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Parse a YYYY-MM-DD (or ISO) start date into a Date, or null if invalid. */
function parseStartDate(value: unknown): Date | null {
	if (value === undefined || value === null || value === '') {
		return new Date();
	}
	if (typeof value !== 'string') return null;
	// Treat a bare date as UTC midnight so the schedule is timezone-stable.
	const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value;
	const ms = Date.parse(normalized);
	return Number.isNaN(ms) ? null : new Date(ms);
}

export const GET: RequestHandler = async (event) => {
	const session = event.locals.session;
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const db = requireDB(event);
	const schedules = await getRecurringSchedules(db, session.user.id);
	return json({ schedules });
};

export const POST: RequestHandler = async (event) => {
	const session = event.locals.session;
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Creating a recurring schedule is a new Pro action (no grandfathering).
	// No-op until MONETIZATION_ENABLED.
	requirePro(event);

	const db = requireDB(event);

	const body = (await event.request.json().catch(() => null)) as {
		sourceInvoiceId?: unknown;
		frequency?: unknown;
		recipientEmail?: unknown;
		startDate?: unknown;
	} | null;

	const sourceInvoiceId = typeof body?.sourceInvoiceId === 'string' ? body.sourceInvoiceId : '';
	if (!isValidInvoiceId(sourceInvoiceId)) {
		throw error(400, 'A valid source invoice is required.');
	}

	if (!isFrequency(body?.frequency)) {
		throw error(400, 'Frequency must be one of: weekly, monthly, yearly.');
	}

	const recipientEmail =
		typeof body?.recipientEmail === 'string' ? body.recipientEmail.trim() : '';
	if (!EMAIL_REGEX.test(recipientEmail)) {
		throw error(400, 'A valid recipient email address is required.');
	}

	const nextRunAt = parseStartDate(body?.startDate);
	if (!nextRunAt) {
		throw error(400, 'Start date is invalid.');
	}

	const id = await createRecurringSchedule(db, session.user.id, {
		sourceInvoiceId,
		frequency: body.frequency,
		recipientEmail,
		nextRunAt
	});

	if (!id) {
		throw error(404, 'Source invoice not found.');
	}

	// Funnel: a recurring schedule was created.
	trackEvent(event.platform?.env, 'recurring_created', { plan: event.locals.tier });

	return json({ success: true, id });
};
