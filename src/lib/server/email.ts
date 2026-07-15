import type { R2Bucket } from '@cloudflare/workers-types';
import type { InvoiceData } from '$lib/types';

/**
 * Shared invoice-email sending logic.
 *
 * Used by both the HTTP endpoint (POST /api/invoices/[id]/email) and the
 * recurring-invoices cron path (src/lib/server/recurring.ts). Kept free of
 * SvelteKit `RequestEvent` dependencies so it can run inside the Worker's
 * `scheduled` handler where no request exists.
 *
 * IMPORTANT for the cron path: this module (and everything it imports) is
 * bundled by wrangler/esbuild, not Vite, so it must only use relative imports,
 * npm packages, and `import type` for `$lib/*` aliases (type-only imports are
 * stripped at build time and never resolved).
 */

// The `from` address must use a domain that has been onboarded to Cloudflare
// Email Sending (see the manual DNS/onboarding steps in docs). Sending from an
// un-onboarded domain fails with E_SENDER_NOT_VERIFIED.
export const FROM_ADDRESS = 'invoices@freeinvoice.info';

// Fallback origin for links when no request origin is available (cron path).
export const APP_ORIGIN = 'https://freeinvoice.info';

/**
 * Minimal shape of the Cloudflare Email Sending binding used here. Mirrors the
 * EmailSendBinding declared in src/app.d.ts, redeclared locally so this module
 * has no dependency on the ambient global types.
 */
export interface EmailBinding {
	send(message: {
		to: string | string[];
		from: string | { email: string; name?: string };
		replyTo?: string | string[];
		subject: string;
		html?: string;
		text?: string;
		attachments?: {
			content: string | ArrayBuffer | ArrayBufferView;
			filename: string;
			type?: string;
			disposition?: 'attachment' | 'inline';
		}[];
	}): Promise<{ messageId?: string } | void>;
}

/**
 * Error thrown when sending fails. `status` maps to an appropriate HTTP status
 * so the HTTP endpoint can rethrow it via SvelteKit's `error()`; the cron path
 * just logs it.
 */
export class EmailSendError extends Error {
	status: number;
	constructor(status: number, message: string) {
		super(message);
		this.name = 'EmailSendError';
		this.status = status;
	}
}

const escapeHtml = (value: string): string =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

// Sanitize an invoice number into a safe PDF filename fragment.
const safeFilenamePart = (value: string): string =>
	value.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 50) || 'invoice';

export interface SendInvoiceEmailParams {
	/** Cloudflare Email Sending binding (env.EMAIL). */
	email: EmailBinding;
	/** R2 bucket for stored PDFs; when omitted no attachment is fetched. */
	bucket?: R2Bucket;
	/** Persisted invoice data. */
	invoice: InvoiceData;
	/** Cloud invoice id (used to build the /invoice/[id] link). */
	invoiceId: string;
	/** Recipient address (already validated by the caller). */
	to: string;
	/** R2 key of a stored PDF to attach, if any. */
	pdfKey?: string | null;
	/** Optional custom subject; falls back to "Invoice <number>". */
	subject?: string;
	/** Optional personal message included in the body. */
	message?: string;
	/** Reply-To address (e.g. the sending user's email). */
	replyTo?: string;
	/** Origin for the invoice link; defaults to APP_ORIGIN. */
	origin?: string;
}

/**
 * Build the email bodies and send the invoice.
 *
 * Attaches the stored PDF from R2 when `pdfKey` resolves to an object;
 * otherwise the email links back to the invoice. Throws {@link EmailSendError}
 * on failure.
 */
export async function sendInvoiceEmail(
	params: SendInvoiceEmailParams
): Promise<{ attached: boolean }> {
	const { email, bucket, invoice, invoiceId, to, pdfKey, replyTo } = params;
	const origin = params.origin || APP_ORIGIN;

	const invoiceNumber = (invoice.invoiceNumber || '').trim();
	const invoiceLabel = invoiceNumber ? `Invoice ${invoiceNumber}` : 'Invoice';

	const subject = (params.subject || '').trim() || invoiceLabel;
	const rawMessage = (params.message || '').trim();

	// Attach the stored PDF from R2 when one has been generated for this invoice.
	let attachment:
		| { content: ArrayBuffer; filename: string; type: string; disposition: 'attachment' }
		| undefined;
	if (pdfKey && bucket) {
		const pdfObject = await bucket.get(pdfKey);
		if (pdfObject) {
			attachment = {
				content: await pdfObject.arrayBuffer(),
				filename: `invoice-${safeFilenamePart(invoiceNumber)}.pdf`,
				type: 'application/pdf',
				disposition: 'attachment'
			};
		}
	}

	const invoiceLink = `${origin}/invoice/${invoiceId}`;
	const senderName = (invoice.invoiceFrom || '').trim();

	// Build text + HTML bodies. When no PDF is attached, point the recipient at
	// the app so they can still view the invoice.
	const greetingLines: string[] = [];
	if (rawMessage) greetingLines.push(rawMessage);
	if (!attachment) {
		greetingLines.push(`You can view the invoice here: ${invoiceLink}`);
	}
	greetingLines.push(
		attachment ? 'The invoice is attached to this email as a PDF.' : 'Sent with FreeInvoice.info'
	);
	const textBody = greetingLines.join('\n\n');

	const htmlMessage = rawMessage
		? `<p style="margin:0 0 16px;white-space:pre-wrap;">${escapeHtml(rawMessage)}</p>`
		: '';
	const htmlBody = `<!doctype html>
<html>
	<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
		<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
			<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px 28px 32px;">
				<h1 style="margin:0 0 4px;font-size:20px;color:#111827;">${escapeHtml(invoiceLabel)}</h1>
				${senderName ? `<p style="margin:0 0 20px;font-size:14px;color:#6b7280;">From ${escapeHtml(senderName)}</p>` : '<div style="height:12px;"></div>'}
				${htmlMessage}
				${
					attachment
						? `<p style="margin:0 0 16px;font-size:14px;">The invoice is attached to this email as a PDF.</p>`
						: `<p style="margin:0 0 20px;font-size:14px;">You can view the invoice online using the button below.</p>
				<p style="margin:0 0 8px;"><a href="${escapeHtml(invoiceLink)}" style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;">View Invoice</a></p>`
				}
			</div>
			<p style="margin:20px 0 0;font-size:12px;color:#9ca3af;text-align:center;">Sent with <a href="${escapeHtml(origin)}" style="color:#6b7280;">FreeInvoice.info</a></p>
		</div>
	</body>
</html>`;

	try {
		await email.send({
			to,
			from: {
				email: FROM_ADDRESS,
				name: senderName ? `${senderName} via FreeInvoice` : 'FreeInvoice'
			},
			...(replyTo ? { replyTo } : {}),
			subject,
			html: htmlBody,
			text: textBody,
			...(attachment ? { attachments: [attachment] } : {})
		});
	} catch (err) {
		const code = (err as { code?: string })?.code ?? '';
		console.error('[email] Failed to send invoice email:', err);
		if (code === 'E_RATE_LIMIT_EXCEEDED' || code === 'E_DAILY_LIMIT_EXCEEDED') {
			throw new EmailSendError(429, 'Email service is temporarily rate limited. Please try again later.');
		}
		if (code === 'E_SENDER_NOT_VERIFIED' || code === 'E_SENDER_DOMAIN_NOT_AVAILABLE') {
			throw new EmailSendError(503, 'Email sending is not fully configured yet. Please try again later.');
		}
		throw new EmailSendError(502, 'Failed to send the email. Please try again.');
	}

	return { attached: Boolean(attachment) };
}
