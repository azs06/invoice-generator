import { json } from '@sveltejs/kit';
import { isValidInvoiceId } from '$lib/invoiceValidation';
import { clearAllInvoices, getAllInvoices, getInvoiceCount, saveInvoice } from '$lib/server/db';
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

	return json({ invoices, count, limit: 12 });
};

export const POST: RequestHandler = async (event) => {
	const session = event.locals.session;
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const db = requireDB(event);
	const bucket = getBucket(event);

	const invoice = (await event.request.json()) as InvoiceData;
	if (!invoice.id) return json({ error: 'Invoice ID is required' }, { status: 400 });
	if (!isValidInvoiceId(invoice.id)) {
		return json({ error: 'Invalid invoice ID' }, { status: 400 });
	}

	const saved = await saveInvoice(db, bucket, invoice.id, invoice, session.user.id);
	if (!saved) {
		return json({ error: 'Invoice not found' }, { status: 404 });
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
