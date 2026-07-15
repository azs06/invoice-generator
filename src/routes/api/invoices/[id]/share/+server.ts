import { error, json } from '@sveltejs/kit';
import { trackEvent } from '$lib/server/analytics';
import { isValidInvoiceId } from '$lib/invoiceValidation';
import {
	countActiveShareLinks,
	createShareLink,
	getInvoice,
	getShareLinks,
	revokeShareLink
} from '$lib/server/db';
import { FREE_LIMITS, isMonetizationEnabled } from '$lib/server/entitlements';
import { RATE_LIMITS, checkRateLimit } from '$lib/server/rateLimit';
import { requireDB, requireSession } from '$lib/server/session';
import type { RequestHandler } from './$types';

/**
 * POST - Create a new share link for an invoice
 */
export const POST: RequestHandler = async (event) => {
	const session = await requireSession(event);
	const db = requireDB(event);
	const invoiceId = event.params.id;
	if (!isValidInvoiceId(invoiceId)) {
		throw error(400, 'Invalid invoice ID');
	}

	// Cap share-link creation per user per day
	const rateLimit = await checkRateLimit(db, session.user.id, 'share', RATE_LIMITS.shareLinkCreate);
	if (!rateLimit.allowed) {
		throw error(429, 'Too many requests: share link limit reached. Please try again later.');
	}

	// Free tier: cap concurrent active share links (no-op until MONETIZATION_ENABLED)
	if (isMonetizationEnabled(event) && event.locals.tier !== 'pro') {
		const activeLinks = await countActiveShareLinks(db, session.user.id);
		if (activeLinks >= FREE_LIMITS.activeShareLinks) {
			trackEvent(event.platform?.env, 'gate_blocked', {
				plan: 'free',
				gate: 'active_share_links'
			});
			throw error(
				402,
				`Free accounts can have up to ${FREE_LIMITS.activeShareLinks} active share links. Upgrade to Pro for unlimited sharing.`
			);
		}
	}

	// Get the invoice to extract due date
	const invoice = await getInvoice(db, invoiceId, session.user.id);
	if (!invoice) {
		throw error(404, 'Invoice not found');
	}

	const shareLink = await createShareLink(db, invoiceId, session.user.id, invoice.dueDate || null);

	if (!shareLink) {
		throw error(500, 'Failed to create share link');
	}

	// Funnel: a share link was created.
	trackEvent(event.platform?.env, 'share_created', { plan: event.locals.tier });

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
	const linksWithUrls = links.map((link) => ({
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
		throw error(400, 'Missing linkId parameter');
	}

	const success = await revokeShareLink(db, linkId, session.user.id);

	if (!success) {
		throw error(404, 'Share link not found or unauthorized');
	}

	return json({ success: true });
};
