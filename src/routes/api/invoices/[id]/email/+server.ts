import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { isValidInvoiceId } from '$lib/invoiceValidation';
import { EmailSendError, sendInvoiceEmail } from '$lib/server/email';
import { requirePro } from '$lib/server/entitlements';
import { RATE_LIMITS, checkRateLimit } from '$lib/server/rateLimit';
import { invoices } from '$lib/server/schema';
import { getBucket, requirePlatform } from '$lib/server/session';
import type { InvoiceData } from '$lib/types';
import type { RequestHandler } from './$types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: RequestHandler = async (event) => {
	const session = event.locals.session;
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const env = requirePlatform(event);

	// Sending invoice emails is a Pro feature (no-op until MONETIZATION_ENABLED).
	requirePro(event);

	const { id } = event.params;
	if (!isValidInvoiceId(id)) {
		throw error(400, 'Invalid invoice ID format');
	}

	// Email delivery is metered - cap sends per user per day.
	const rateLimit = await checkRateLimit(env.DB, session.user.id, 'email', RATE_LIMITS.emailSend);
	if (!rateLimit.allowed) {
		throw error(429, 'Too many requests: daily email limit reached. Please try again tomorrow.');
	}

	const body = (await event.request.json().catch(() => null)) as {
		to?: unknown;
		subject?: unknown;
		message?: unknown;
	} | null;

	const to = typeof body?.to === 'string' ? body.to.trim() : '';
	if (!EMAIL_REGEX.test(to)) {
		throw error(400, 'A valid recipient email address is required.');
	}

	// Email sending needs the `send_email` binding, which is only present in the
	// Cloudflare environment. Mirror /api/pdf: return 503 in plain `npm run dev`.
	if (!env.EMAIL) {
		throw error(
			503,
			'Email sending is not available in local development. Deploy to Cloudflare (or use npm run dev:cf) to send invoices.'
		);
	}

	// Load the invoice (with its R2 pdfKey) and verify ownership.
	const d1 = drizzle(env.DB);
	const record = await d1
		.select({ data: invoices.data, pdfKey: invoices.pdfKey })
		.from(invoices)
		.where(and(eq(invoices.id, id), eq(invoices.userId, session.user.id)))
		.get();

	if (!record) {
		throw error(404, 'Invoice not found');
	}

	let invoice: InvoiceData;
	try {
		invoice = JSON.parse(record.data) as InvoiceData;
	} catch {
		throw error(500, 'Invoice data is corrupted');
	}

	const subject = typeof body?.subject === 'string' ? body.subject : undefined;
	const message = typeof body?.message === 'string' ? body.message : undefined;

	try {
		const { attached } = await sendInvoiceEmail({
			email: env.EMAIL,
			bucket: getBucket(event),
			invoice,
			invoiceId: id,
			to,
			pdfKey: record.pdfKey,
			subject,
			message,
			replyTo: session.user.email,
			origin: event.url.origin
		});
		return json({ success: true, attached });
	} catch (err) {
		if (err instanceof EmailSendError) {
			throw error(err.status, err.message);
		}
		throw err;
	}
};
