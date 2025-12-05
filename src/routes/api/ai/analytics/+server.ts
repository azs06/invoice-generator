import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { analyzeInvoices, isAIAvailable, type InvoiceSummary } from '$lib/server/ai';

export const POST: RequestHandler = async (event) => {
	// Check authentication
	const session = event.locals.session;
	if (!session) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	// Check AI availability
	if (!isAIAvailable(event.platform)) {
		return json(
			{ success: false, error: 'AI service is not available' },
			{ status: 503 }
		);
	}

	try {
		const body = await event.request.json();
		const { query, invoiceSummary } = body as {
			query?: string;
			invoiceSummary?: InvoiceSummary;
		};

		if (!query || typeof query !== 'string' || query.trim().length === 0) {
			return json(
				{ success: false, error: 'Query is required' },
				{ status: 400 }
			);
		}

		if (query.length > 500) {
			return json(
				{ success: false, error: 'Query is too long (max 500 characters)' },
				{ status: 400 }
			);
		}

		if (!invoiceSummary || typeof invoiceSummary !== 'object') {
			return json(
				{ success: false, error: 'Invoice summary is required' },
				{ status: 400 }
			);
		}

		// Validate summary structure
		const validatedSummary: InvoiceSummary = {
			totalInvoices: Number(invoiceSummary.totalInvoices) || 0,
			totalRevenue: Number(invoiceSummary.totalRevenue) || 0,
			paidCount: Number(invoiceSummary.paidCount) || 0,
			unpaidCount: Number(invoiceSummary.unpaidCount) || 0,
			averageAmount: Number(invoiceSummary.averageAmount) || 0,
			topClients: Array.isArray(invoiceSummary.topClients)
				? invoiceSummary.topClients.slice(0, 10).map(c => ({
						name: String(c.name || 'Unknown'),
						total: Number(c.total) || 0,
						count: Number(c.count) || 0
					}))
				: [],
			monthlyBreakdown: Array.isArray(invoiceSummary.monthlyBreakdown)
				? invoiceSummary.monthlyBreakdown.slice(0, 12).map(m => ({
						month: String(m.month || ''),
						total: Number(m.total) || 0,
						count: Number(m.count) || 0
					}))
				: undefined
		};

		const ai = event.platform!.env.AI;
		const result = await analyzeInvoices(ai, query.trim(), validatedSummary);

		if (!result.success) {
			return json({ success: false, error: result.error }, { status: 400 });
		}

		return json({ success: true, analysis: result.data });
	} catch (error) {
		console.error('Analytics API error:', error);
		return json(
			{ success: false, error: 'Failed to process request' },
			{ status: 500 }
		);
	}
};
