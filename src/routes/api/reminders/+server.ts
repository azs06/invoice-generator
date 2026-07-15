import { error, json } from '@sveltejs/kit';
import { isValidInvoiceId } from '$lib/invoiceValidation';
import { trackEvent } from '$lib/server/analytics';
import { createReminder, getReminders } from '$lib/server/db';
import { requirePro } from '$lib/server/entitlements';
import { requireDB } from '$lib/server/session';
import type { RequestHandler } from './$types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MIN_REMIND_DAYS = 1;
const MAX_REMIND_DAYS = 90;

/** Parse and clamp-validate the remindAfterDays field. Null when invalid. */
function parseRemindAfterDays(value: unknown): number | null {
	if (value === undefined || value === null || value === '') return 3;
	const n = typeof value === 'number' ? value : Number(value);
	if (!Number.isInteger(n) || n < MIN_REMIND_DAYS || n > MAX_REMIND_DAYS) return null;
	return n;
}

export const GET: RequestHandler = async (event) => {
	const session = event.locals.session;
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const db = requireDB(event);
	const reminders = await getReminders(db, session.user.id);
	return json({ reminders });
};

export const POST: RequestHandler = async (event) => {
	const session = event.locals.session;
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Creating an overdue reminder is a new Pro action (no grandfathering).
	// No-op until MONETIZATION_ENABLED.
	requirePro(event);

	const db = requireDB(event);

	const body = (await event.request.json().catch(() => null)) as {
		invoiceId?: unknown;
		recipientEmail?: unknown;
		remindAfterDays?: unknown;
	} | null;

	const invoiceId = typeof body?.invoiceId === 'string' ? body.invoiceId : '';
	if (!isValidInvoiceId(invoiceId)) {
		throw error(400, 'A valid invoice is required.');
	}

	const recipientEmail = typeof body?.recipientEmail === 'string' ? body.recipientEmail.trim() : '';
	if (!EMAIL_REGEX.test(recipientEmail)) {
		throw error(400, 'A valid recipient email address is required.');
	}

	const remindAfterDays = parseRemindAfterDays(body?.remindAfterDays);
	if (remindAfterDays === null) {
		throw error(400, `Remind after must be between ${MIN_REMIND_DAYS} and ${MAX_REMIND_DAYS} days.`);
	}

	const result = await createReminder(db, session.user.id, {
		invoiceId,
		recipientEmail,
		remindAfterDays
	});

	if (result === null) {
		throw error(404, 'Invoice not found.');
	}
	if (result === 'duplicate') {
		throw error(409, 'A reminder already exists for this invoice.');
	}

	// Funnel: an overdue reminder config was created.
	trackEvent(event.platform?.env, 'reminder_created', { plan: event.locals.tier });

	return json({ success: true, id: result });
};
