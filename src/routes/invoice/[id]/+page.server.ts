import { error, redirect } from '@sveltejs/kit';
import { getInvoice } from '$lib/server/db';
import { createAuth } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const auth = createAuth(event.platform?.env);
    const session = await auth.api.getSession({ headers: event.request.headers });

    // Optional: redirect to login if not authenticated?
    // Or allow public access if shared? For now, let's assume private.
    if (!session) {
        // For now, maybe just return null invoice or redirect
        // throw redirect(302, '/login'); // If we had a login page
        // Or just error
        error(401, 'Unauthorized');
    }

    const db = event.platform?.env?.DB;
    if (!db) {
        error(500, 'Database not available');
    }

    const invoice = await getInvoice(db, event.params.id, session.user.id);
    if (!invoice) {
        error(404, 'Invoice not found');
    }

    return {
        invoice,
        user: session.user
    };
};
