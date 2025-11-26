import { error } from '@sveltejs/kit';
import { requireDB, getBucket } from '$lib/server/session';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { invoices } from '$lib/server/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
    const session = event.locals.session;
    if (!session) {
        error(401, 'Unauthorized');
    }

    const db = requireDB(event);
    const bucket = getBucket(event);

    if (!bucket) {
        error(503, 'Storage service unavailable');
    }

    const { id } = event.params;
    const d1 = drizzle(db);

    // Get invoice record with pdfKey
    const invoice = await d1
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, id), eq(invoices.userId, session.user.id)))
        .get();

    if (!invoice) {
        error(404, 'Invoice not found');
    }

    if (!invoice.pdfKey) {
        error(404, 'PDF not available for this invoice');
    }

    // Fetch PDF from R2
    const pdfObject = await bucket.get(invoice.pdfKey);

    if (!pdfObject) {
        error(404, 'PDF file not found in storage');
    }

    // Parse invoice data for filename
    let filename = 'invoice.pdf';
    try {
        const invoiceData = JSON.parse(invoice.data);
        const clientName = invoiceData.invoiceTo?.replace(/[^a-zA-Z0-9]/g, '-') || 'unknown';
        const invoiceNumber = invoiceData.invoiceNumber?.replace(/[^a-zA-Z0-9-]/g, '') || id;
        filename = `invoice-${clientName}-${invoiceNumber}.pdf`;
    } catch {
        // Use default filename if parsing fails
    }

    // Stream the PDF back to the client
    const pdfBody = await pdfObject.arrayBuffer();
    return new Response(pdfBody, {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'private, max-age=3600'
        }
    });
};
