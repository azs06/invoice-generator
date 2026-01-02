import puppeteer, { type PaperFormat } from '@cloudflare/puppeteer';
import { error } from '@sveltejs/kit';
import { updateInvoicePdfKey } from '$lib/server/db';
import { requirePlatform, getBucket } from '$lib/server/session';
import type { RequestHandler } from './$types';

// Map page sizes to Puppeteer format
const PAGE_FORMAT_MAP: Record<string, PaperFormat> = {
	a4: 'a4',
	letter: 'letter',
	legal: 'legal',
	a5: 'a5'
};

// Convert mm to inches string
const mmToInches = (mm: number): string => `${mm / 25.4}in`;

// Validate invoice ID format (UUID: alphanumeric with hyphens, max 36 chars)
const isValidInvoiceId = (id: string): boolean => {
	return /^[a-zA-Z0-9-]{1,36}$/.test(id);
};

export const POST: RequestHandler = async (event) => {
	const session = event.locals.session;
	if (!session) {
		error(401, 'Unauthorized');
	}

	const env = requirePlatform(event);

	const { html, invoiceId, invoiceTo, pageSize, margins } = (await event.request.json()) as {
		html: string;
		invoiceId?: string;
		invoiceTo?: string;
		pageSize?: string;
		margins?: { top: number; right: number; bottom: number; left: number };
	};
	if (!html) {
		error(400, 'Missing HTML content');
	}

	// Validate invoice ID to prevent path traversal
	if (invoiceId && !isValidInvoiceId(invoiceId)) {
		error(400, 'Invalid invoice ID format');
	}

	// Check if Browser Rendering is available (only in Cloudflare environment)
	if (!env.BROWSER) {
		console.error(
			'Browser Rendering not available - this endpoint requires Cloudflare environment'
		);
		error(
			503,
			'PDF generation is not available in local development. Please use the client-side download instead.'
		);
	}

	try {
		// Use Cloudflare Browser Rendering
		const browser = await puppeteer.launch(env.BROWSER);
		const page = await browser.newPage();

		await page.setViewport({ width: 1200, height: 800 });

		await page.setContent(html, {
			waitUntil: 'networkidle0',
			timeout: 10000 // 10 second timeout
		});

		// Use dynamic page format (default to letter)
		const pdfFormat = PAGE_FORMAT_MAP[pageSize || 'letter'] || 'letter';

		// Use dynamic margins (default to 10mm = ~0.4in)
		const pdfMargins = margins
			? {
					top: mmToInches(margins.top),
					right: mmToInches(margins.right),
					bottom: mmToInches(margins.bottom),
					left: mmToInches(margins.left)
				}
			: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' };

		const pdfBuffer = await page.pdf({
			format: pdfFormat,
			margin: pdfMargins,
			printBackground: true,
			timeout: 15000 // 15 second timeout
		});

		await browser.close();

		const bucket = getBucket(event);
		const db = env.DB;
		let storageSuccess = true;

		// If invoiceId is provided and we have a bucket, upload to R2
		if (invoiceId && bucket && db) {
			const pdfKey = `users/${session.user.id}/${invoiceId}.pdf`;
			try {
				console.log(`[PDF] Uploading to R2: ${pdfKey}`);
				await bucket.put(pdfKey, new Uint8Array(pdfBuffer), {
					httpMetadata: {
						contentType: 'application/pdf'
					}
				});
				console.log(`[PDF] R2 upload successful, updating DB...`);

				// Update DB with the key and timestamp
				await updateInvoicePdfKey(db, invoiceId, session.user.id, pdfKey);
				console.log(`[PDF] DB updated with pdfKey: ${pdfKey}`);
			} catch (e) {
				console.error('[PDF] Failed to upload PDF to R2:', {
					error: e,
					invoiceId,
					pdfKey,
					hasBucket: !!bucket,
					hasDb: !!db
				});
				storageSuccess = false;
				// Continue to return the PDF even if upload fails
			}
		} else {
			console.warn('[PDF] Skipping R2 upload:', {
				hasInvoiceId: !!invoiceId,
				hasBucket: !!bucket,
				hasDb: !!db
			});
			storageSuccess = false;
		}

		// Generate dynamic filename from invoiceTo
		const filename = invoiceTo
			? `invoice-${invoiceTo.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 50)}.pdf`
			: 'invoice.pdf';

		// Convert Buffer to Uint8Array for Response compatibility
		return new Response(new Uint8Array(pdfBuffer), {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': `attachment; filename="${filename}"`,
				'X-Storage-Status': storageSuccess ? 'saved' : 'local-only'
			}
		});
	} catch (err) {
		console.error('PDF generation failed:', err);
		error(500, 'PDF generation failed');
	}
};
