import puppeteer from '@cloudflare/puppeteer';
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

    // Check if Browser Rendering is available (only in Cloudflare environment)
    if (!env.BROWSER) {
        console.error('Browser Rendering not available - this endpoint requires Cloudflare environment');
        error(503, 'PDF generation is not available in local development. Please use the client-side download instead.');
    }

    try {
        // Use Cloudflare Browser Rendering
        const browser = await puppeteer.launch(env.BROWSER);
        const page = await browser.newPage();

        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'letter',
            margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
            printBackground: true
        });

        await browser.close();

        const bucket = getBucket(event);
        const db = env.DB;

        // If invoiceId is provided and we have a bucket, upload to R2
        if (invoiceId && bucket && db) {
            const pdfKey = `users/${session.user.id}/${invoiceId}.pdf`;
            try {
                await bucket.put(pdfKey, new Uint8Array(pdfBuffer), {
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

        // Convert Buffer to Uint8Array for Response compatibility
        return new Response(new Uint8Array(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="invoice.pdf"'
            }
        });
    } catch (err) {
        console.error('PDF generation failed:', err);
        error(500, 'PDF generation failed');
    }
};
