import { json } from '@sveltejs/kit';
import { isValidInvoiceId } from '$lib/invoiceValidation';
import { requireDB } from '$lib/server/session';
import { getInvoice, saveInvoice } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async (event) => {
	const session = event.locals.session;

	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const db = requireDB(event);
	const bucket = event.platform?.env?.BUCKET;
	const invoiceId = event.params.id;

	if (!invoiceId) {
		return json({ error: 'Invoice ID required' }, { status: 400 });
	}
	if (!isValidInvoiceId(invoiceId)) {
		return json({ error: 'Invalid invoice ID' }, { status: 400 });
	}

	try {
		// Get the invoice (returns InvoiceData directly, not SavedInvoiceRecord)
		const invoiceData = await getInvoice(db, invoiceId, session.user.id);

		if (!invoiceData) {
			return json({ error: 'Invoice not found' }, { status: 404 });
		}

		// Toggle archive status
		const updatedInvoice = {
			...invoiceData,
			archived: !invoiceData.archived
		};

		// Save the updated invoice with correct parameter order
		const saved = await saveInvoice(db, bucket, invoiceId, updatedInvoice, session.user.id);
		if (!saved) {
			return json({ error: 'Invoice not found' }, { status: 404 });
		}

		return json({
			success: true,
			archived: updatedInvoice.archived
		});
	} catch (error) {
		console.error('Archive toggle failed:', error);
		return json({ error: 'Failed to toggle archive status' }, { status: 500 });
	}
};
