import { json } from '@sveltejs/kit';
import { getInvoice, saveInvoice, deleteInvoice } from '$lib/server/db';
import { createAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';
import type { InvoiceData } from '$lib/types';

export const GET: RequestHandler = async (event) => {
    const auth = createAuth(event.platform?.env);
    const session = await auth.api.getSession({ headers: event.request.headers });
    if (!session) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = event.platform?.env?.DB;
    if (!db) return json({ error: 'Database not available' }, { status: 500 });

    const { id } = event.params;
    const invoice = await getInvoice(db, id, session.user.id);
    if (!invoice) {
        return json({ error: 'Invoice not found' }, { status: 404 });
    }
    return json(invoice);
};

export const PUT: RequestHandler = async (event) => {
    const auth = createAuth(event.platform?.env);
    const session = await auth.api.getSession({ headers: event.request.headers });
    if (!session) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = event.platform?.env?.DB;
    const bucket = event.platform?.env?.BUCKET;
    if (!db) return json({ error: 'Database not available' }, { status: 500 });

    const { id } = event.params;
    const invoice = (await event.request.json()) as InvoiceData;
    if (invoice.id !== id) {
        return json({ error: 'Invoice ID mismatch' }, { status: 400 });
    }
    await saveInvoice(db, bucket, id, invoice, session.user.id);
    return json({ success: true });
};

export const DELETE: RequestHandler = async (event) => {
    const auth = createAuth(event.platform?.env);
    const session = await auth.api.getSession({ headers: event.request.headers });
    if (!session) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = event.platform?.env?.DB;
    const bucket = event.platform?.env?.BUCKET;
    if (!db) return json({ error: 'Database not available' }, { status: 500 });

    const { id } = event.params;
    await deleteInvoice(db, bucket, id, session.user.id);
    return json({ success: true });
};
