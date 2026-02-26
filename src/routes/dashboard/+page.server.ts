import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { getAllInvoices, getInvoiceCount } from '$lib/server/db';
import { invoices } from '$lib/server/schema';
import { requireDB } from '$lib/server/session';
import type { PageServerLoad } from './$types';

export interface DashboardInvoice {
	id: string;
	invoiceNumber: string;
	invoiceTo: string;
	invoiceFrom: string;
	date: string;
	total: number;
	balanceDue: number;
	paid: boolean;
	hasPdf: boolean;
	isPdfStale: boolean;
	updatedAt: Date;
	archived: boolean;
	draft: boolean;
	draftName: string;
	invoiceLabel: string;
}

export const load: PageServerLoad = async (event) => {
	const session = event.locals.session;

	if (!session) {
		throw redirect(302, '/');
	}

	const db = requireDB(event);
	const d1 = drizzle(db);

	// Get all invoices with pdfKey info
	const rawInvoices = await d1
		.select()
		.from(invoices)
		.where(eq(invoices.userId, session.user.id))
		.orderBy(invoices.updatedAt)
		.all();

	// Transform to dashboard format
	const dashboardInvoices: DashboardInvoice[] = rawInvoices
		.map((row) => {
			const data = JSON.parse(row.data);
			// PDF is stale if it was generated before the last update
			const isPdfStale =
				!!row.pdfKey &&
				!!row.pdfGeneratedAt &&
				row.updatedAt.getTime() > row.pdfGeneratedAt.getTime();
			return {
				id: row.id,
				invoiceNumber: data.invoiceNumber || 'N/A',
				invoiceTo: data.invoiceTo || 'Unknown Client',
				invoiceFrom: data.invoiceFrom || '',
				date: data.date || 'N/A',
				total: data.total || 0,
				balanceDue: data.balanceDue || data.total || 0,
				paid: data.paid || false,
				hasPdf: !!row.pdfKey,
				isPdfStale,
				updatedAt: row.updatedAt,
				archived: data.archived || false,
				draft: data.draft || false,
				draftName: data.draftName || '',
				invoiceLabel: data.invoiceLabel || 'INVOICE'
			};
		})
		.reverse(); // Most recent first

	const count = await getInvoiceCount(db, session.user.id);

	return {
		invoices: dashboardInvoices,
		count,
		limit: 12,
		user: {
			name: session.user.name,
			email: session.user.email
		}
	};
};
