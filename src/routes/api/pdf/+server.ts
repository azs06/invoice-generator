import { error } from '@sveltejs/kit';
import { createAuth } from '$lib/server/auth';
import { updateInvoicePdfKey } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
    const auth = createAuth(event.platform?.env);
    const session = await auth.api.getSession({ headers: event.request.headers });

    if (!session) {
        error(401, 'Unauthorized');
    }

    const { html, invoiceId } = (await event.request.json()) as { html: string; invoiceId?: string };
    if (!html) {
        error(400, 'Missing HTML content');
    }

    const pdfUrl = event.platform?.env?.PDF_GENERATION_URL;
    if (!pdfUrl) {
        console.error('PDF_GENERATION_URL not configured');
        error(500, 'PDF generation service not configured');
    }

    try {
        const response = await fetch(pdfUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({ html })
        });

        if (!response.ok) {
            console.error('PDF generation failed:', await response.text());
            error(502, 'PDF generation failed');
        }

        const pdfBuffer = await response.arrayBuffer();
        const bucket = event.platform?.env?.BUCKET;
        const db = event.platform?.env?.DB;

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
