import { redirect } from '@sveltejs/kit';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { invoices } from '$lib/server/schema';
import { requireDB } from '$lib/server/session';
import type { PageServerLoad } from './$types';

export interface InvoiceSummary {
	totalInvoices: number;
	totalRevenue: number;
	paidCount: number;
	unpaidCount: number;
	averageAmount: number;
	topClients: Array<{ name: string; total: number; count: number }>;
	monthlyBreakdown: Array<{ month: string; total: number; count: number }>;
}

export const load: PageServerLoad = async (event) => {
	const session = event.locals.session;

	if (!session) {
		redirect(302, '/');
	}

	const db = requireDB(event);
	const d1 = drizzle(db);

	// Get all invoices for the user
	const rawInvoices = await d1
		.select()
		.from(invoices)
		.where(eq(invoices.userId, session.user.id))
		.all();

	// Parse invoice data and calculate summary
	const parsedInvoices = rawInvoices.map((row) => {
		const data = JSON.parse(row.data);
		return {
			id: row.id,
			invoiceTo: data.invoiceTo || 'Unknown Client',
			date: data.date || '',
			total: Number(data.total) || 0,
			paid: Boolean(data.paid)
		};
	});

	// Calculate totals
	const totalInvoices = parsedInvoices.length;
	const totalRevenue = parsedInvoices.reduce((sum, inv) => sum + inv.total, 0);
	const paidCount = parsedInvoices.filter((inv) => inv.paid).length;
	const unpaidCount = totalInvoices - paidCount;
	const averageAmount = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

	// Calculate top clients
	const clientMap = new Map<string, { total: number; count: number }>();
	for (const inv of parsedInvoices) {
		const client = inv.invoiceTo;
		const existing = clientMap.get(client) || { total: 0, count: 0 };
		clientMap.set(client, {
			total: existing.total + inv.total,
			count: existing.count + 1
		});
	}
	const topClients = Array.from(clientMap.entries())
		.map(([name, data]) => ({ name, ...data }))
		.sort((a, b) => b.total - a.total)
		.slice(0, 5);

	// Calculate monthly breakdown
	const monthMap = new Map<string, { total: number; count: number }>();
	for (const inv of parsedInvoices) {
		if (inv.date) {
			const date = new Date(inv.date);
			const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
			const existing = monthMap.get(monthKey) || { total: 0, count: 0 };
			monthMap.set(monthKey, {
				total: existing.total + inv.total,
				count: existing.count + 1
			});
		}
	}
	const monthlyBreakdown = Array.from(monthMap.entries())
		.map(([month, data]) => ({ month, ...data }))
		.sort((a, b) => b.month.localeCompare(a.month))
		.slice(0, 12);

	const summary: InvoiceSummary = {
		totalInvoices,
		totalRevenue,
		paidCount,
		unpaidCount,
		averageAmount,
		topClients,
		monthlyBreakdown
	};

	return {
		summary,
		user: {
			name: session.user.name,
			email: session.user.email
		}
	};
};
