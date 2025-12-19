import { error } from '@sveltejs/kit';
import { updateInvoicePdfKey } from '$lib/server/db';
import { requirePlatform, getBucket } from '$lib/server/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const session = event.locals.session;
	if (!session) {
		error(401, 'Unauthorized');
	}

	const env = requirePlatform(event);

	const { html, invoiceId } = (await event.request.json()) as { html: string; invoiceId?: string };
	if (!html) {
		error(400, 'Missing HTML content');
	}

	const pdfUrl = env.PDF_GENERATION_URL;
	if (!pdfUrl) {
		console.error('PDF_GENERATION_URL not configured');
		error(500, 'PDF generation service not configured');
	}

	const apiKey = env.PDF_MICROSERVICE_API_KEY;
	if (!apiKey) {
		console.error('PDF_MICROSERVICE_API_KEY not configured');
		error(500, 'PDF generation service not configured');
	}

	try {
		const response = await fetch(pdfUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'X-API-Key': apiKey
			},
			body: new URLSearchParams({ html })
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('PDF generation failed:', response.status, errorText);
			error(502, `PDF generation failed: ${errorText}`);
		}

		// Lambda returns base64-encoded PDF, decode it
		const base64Pdf = await response.text();
		const binaryString = atob(base64Pdf);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		const pdfBuffer = bytes.buffer;

		const bucket = getBucket(event);
		const db = env.DB;

		// If invoiceId is provided and we have a bucket, upload to R2
		if (invoiceId && bucket && db) {
			const pdfKey = `users/${session.user.id}/${invoiceId}.pdf`;
			try {
				await bucket.put(pdfKey, pdfBuffer, {
					httpMetadata: {
						contentType: 'application/pdf'
					}
				});

				// Update DB with the key
				await updateInvoicePdfKey(db, invoiceId, session.user.id, pdfKey);
			} catch (e) {
				console.error('Failed to upload PDF to R2:', e);
				// Continue to return the PDF even if upload fails
			}
		}

		return new Response(pdfBuffer, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': 'attachment; filename="invoice.pdf"'
			}
		});
	} catch (err) {
		console.error('Error calling PDF service:', err);
		error(500, 'Internal Server Error');
	}
};
