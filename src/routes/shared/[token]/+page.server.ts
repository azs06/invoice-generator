import { error } from '@sveltejs/kit';
import { getInvoiceByShareToken, recordLinkView } from '$lib/server/db';
import { requireDB } from '$lib/server/session';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
    const db = requireDB(event);
    const token = event.params.token;

    const result = await getInvoiceByShareToken(db, token);

    if (!result) {
        error(404, 'This shared invoice link is invalid, expired, or has been revoked.');
    }

    // Record the view (async, don't wait for it)
    const ipAddress = event.getClientAddress();
    const userAgent = event.request.headers.get('user-agent');

    // Fire and forget - don't block the page load
    recordLinkView(db, result.linkId, ipAddress, userAgent).catch(err => {
        console.error('Failed to record link view:', err);
    });

    return {
        invoice: result.invoice
    };
};
