import { json } from '@sveltejs/kit';
import { isValidInvoiceId } from '$lib/invoiceValidation';
import { getInvoice, saveInvoice, deleteInvoice } from '$lib/server/db';
import { requireDB, getBucket } from '$lib/server/session';
import type { RequestHandler } from './$types';
import type { InvoiceData } from '$lib/types';

export const GET: RequestHandler = async (event) => {
	const session = event.locals.session;
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const db = requireDB(event);
	const { id } = event.params;
	const invoice = await getInvoice(db, id, session.user.id);
	if (!invoice) {
		return json({ error: 'Invoice not found' }, { status: 404 });
	}
	return json(invoice);
};

export const PUT: RequestHandler = async (event) => {
	const session = event.locals.session;
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const db = requireDB(event);
	const bucket = getBucket(event);

	const { id } = event.params;
	if (!isValidInvoiceId(id)) {
		return json({ error: 'Invalid invoice ID' }, { status: 400 });
	}

	const invoice = (await event.request.json()) as InvoiceData;
	if (!invoice.id || !isValidInvoiceId(invoice.id)) {
		return json({ error: 'Invalid invoice ID' }, { status: 400 });
	}
	if (invoice.id !== id) {
		return json({ error: 'Invoice ID mismatch' }, { status: 400 });
	}

	const saved = await saveInvoice(db, bucket, id, invoice, session.user.id);
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

	const { id } = event.params;
	if (!isValidInvoiceId(id)) {
		return json({ error: 'Invalid invoice ID' }, { status: 400 });
	}
	await deleteInvoice(db, bucket, id, session.user.id);
	return json({ success: true });
};
