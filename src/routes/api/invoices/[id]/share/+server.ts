import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireDB, requireSession } from '$lib/server/session';
import { createShareLink, getShareLinks, revokeShareLink, getInvoice } from '$lib/server/db';

/**
 * POST - Create a new share link for an invoice
 */
export const POST: RequestHandler = async (event) => {
    const session = await requireSession(event);
    const db = requireDB(event);
    const invoiceId = event.params.id;

    // Get the invoice to extract due date
    const invoice = await getInvoice(db, invoiceId, session.user.id);
    if (!invoice) {
        error(404, 'Invoice not found');
    }

    const shareLink = await createShareLink(db, invoiceId, session.user.id, invoice.dueDate || null);

    if (!shareLink) {
        error(500, 'Failed to create share link');
    }

    // Build the full share URL
    const origin = event.url.origin;
    const shareUrl = `${origin}/shared/${shareLink.token}`;

    return json({
        ...shareLink,
        url: shareUrl
    });
};

/**
 * GET - List all share links for an invoice
 */
export const GET: RequestHandler = async (event) => {
    const session = await requireSession(event);
    const db = requireDB(event);
    const invoiceId = event.params.id;

    const links = await getShareLinks(db, invoiceId, session.user.id);

    // Build full URLs for each link
    const origin = event.url.origin;
    const linksWithUrls = links.map(link => ({
        ...link,
        url: `${origin}/shared/${link.token}`
    }));

    return json({ links: linksWithUrls });
};

/**
 * DELETE - Revoke a share link
 */
export const DELETE: RequestHandler = async (event) => {
    const session = await requireSession(event);
    const db = requireDB(event);

    // Get the link ID from query params
    const linkId = event.url.searchParams.get('linkId');

    if (!linkId) {
        error(400, 'Missing linkId parameter');
    }

    const success = await revokeShareLink(db, linkId, session.user.id);

    if (!success) {
        error(404, 'Share link not found or unauthorized');
    }

    return json({ success: true });
};

