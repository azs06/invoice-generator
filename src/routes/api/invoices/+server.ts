import { json } from '@sveltejs/kit';
import { getAllInvoices, saveInvoice, clearAllInvoices, getInvoiceCount } from '$lib/server/db';
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

    const invoices = await getAllInvoices(db, session.user.id);
    const count = await getInvoiceCount(db, session.user.id);

    return json({ invoices, count, limit: 12 });
};

export const POST: RequestHandler = async (event) => {
    const auth = createAuth(event.platform?.env);
    const session = await auth.api.getSession({ headers: event.request.headers });
    if (!session) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = event.platform?.env?.DB;
    const bucket = event.platform?.env?.BUCKET;
    if (!db) return json({ error: 'Database not available' }, { status: 500 });

    const invoice = (await event.request.json()) as InvoiceData;
    if (!invoice.id) return json({ error: 'Invoice ID is required' }, { status: 400 });

    await saveInvoice(db, bucket, invoice.id, invoice, session.user.id);
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

    await clearAllInvoices(db, bucket, session.user.id);
    return json({ success: true });
};
