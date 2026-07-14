import { error, json } from '@sveltejs/kit';
import { isValidInvoiceId } from '$lib/invoiceValidation';
import {
	clearAllInvoices,
	getAllInvoices,
	getInvoice,
	getInvoiceCount,
	saveInvoice
} from '$lib/server/db';
import { enforceInvoiceSaveGates } from '$lib/server/entitlements';
import { RATE_LIMITS, checkRateLimit } from '$lib/server/rateLimit';
import { getBucket, requireDB } from '$lib/server/session';
import type { InvoiceData } from '$lib/types';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const session = event.locals.session;
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const db = requireDB(event);
	const invoices = await getAllInvoices(db, session.user.id);
	const count = await getInvoiceCount(db, session.user.id);

	return json({ invoices, count, limit: 10 });
};

export const POST: RequestHandler = async (event) => {
	const session = event.locals.session;
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const db = requireDB(event);
	const bucket = getBucket(event);

	// Cap invoice saves (D1/R2 writes) per user per hour
	const rateLimit = await checkRateLimit(db, session.user.id, 'save', RATE_LIMITS.invoiceSave);
	if (!rateLimit.allowed) {
		throw error(429, 'Too many requests: invoice save limit reached. Please try again later.');
	}

	const invoice = (await event.request.json()) as InvoiceData;
	if (!invoice.id) return json({ error: 'Invoice ID is required' }, { status: 400 });
	if (!isValidInvoiceId(invoice.id)) {
		return json({ error: 'Invalid invoice ID' }, { status: 400 });
	}

	// Free-tier gates: premium templates + cloud invoice quota
	// (no-ops until MONETIZATION_ENABLED; both grandfather existing data)
	const stored = await getInvoice(db, invoice.id, session.user.id);
	await enforceInvoiceSaveGates(event, db, session.user.id, invoice, stored);

	const saved = await saveInvoice(db, bucket, invoice.id, invoice, session.user.id);
	if (!saved) {
		return json(
			{ error: 'Cloud sync limit reached. Remove a synced invoice to free a slot.' },
			{ status: 409 }
		);
	}
	return json({ success: true });
};

export const DELETE: RequestHandler = async (event) => {
	const session = event.locals.session;
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const db = requireDB(event);
	const bucket = getBucket(event);

	await clearAllInvoices(db, bucket, session.user.id);
	return json({ success: true });
};
