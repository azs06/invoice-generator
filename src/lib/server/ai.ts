/**
 * Cloudflare Workers AI Service Layer
 * Wrapper for Cloudflare AI with error handling
 */

import type { Ai } from '@cloudflare/workers-types';

export interface ParsedInvoice {
	invoiceTo: string;
	invoiceFrom?: string;
	items: Array<{
		name: string;
		quantity: number;
		price: number;
	}>;
	dueDate?: string;
	tax?: {
		type: 'flat' | 'percent';
		rate: number;
	};
	discount?: {
		type: 'flat' | 'percent';
		rate: number;
	};
	notes?: string;
	terms?: string;
}

export interface AIResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
}

export interface InvoiceSummary {
	totalInvoices: number;
	totalRevenue: number;
	paidCount: number;
	unpaidCount: number;
	averageAmount: number;
	topClients: Array<{ name: string; total: number; count: number }>;
	monthlyBreakdown?: Array<{ month: string; total: number; count: number }>;
}

const MODEL_ID = '@cf/mistral/mistral-7b-instruct-v0.1';

/**
 * Parse natural language invoice description into structured data
 */
export async function parseInvoiceFromText(
	ai: Ai,
	message: string
): Promise<AIResponse<ParsedInvoice>> {
	const systemPrompt = `You are an invoice parsing assistant. Parse the user's natural language invoice description into a structured JSON format.

Extract the following fields if mentioned:
- invoiceTo: The client/customer name and company
- invoiceFrom: The sender/your company name (if mentioned)
- items: Array of line items with name, quantity, and price
- dueDate: Due date in YYYY-MM-DD format (if mentioned, calculate from "due in X days")
- tax: Tax information with type ("flat" for fixed amount, "percent" for percentage) and rate (the number)
- discount: Discount information with type and rate
- notes: Any additional notes
- terms: Payment terms

For relative dates like "due in 30 days", calculate from today's date: ${new Date().toISOString().split('T')[0]}

IMPORTANT: Respond ONLY with valid JSON, no additional text or markdown. Use this exact structure:
{
  "invoiceTo": "client name",
  "invoiceFrom": "your company",
  "items": [{"name": "item description", "quantity": 1, "price": 100}],
  "dueDate": "YYYY-MM-DD",
  "tax": {"type": "percent", "rate": 10},
  "discount": {"type": "flat", "rate": 0},
  "notes": "",
  "terms": ""
}`;

	try {
		const response = await ai.run(MODEL_ID, {
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: message }
			],
			max_tokens: 500,
			temperature: 0.1
		});

		if (!response || typeof response !== 'object' || !('response' in response)) {
			return { success: false, error: 'Invalid AI response format' };
		}

		const responseText = (response as { response: string }).response;

		// Try to extract JSON from the response
		let parsed: ParsedInvoice;
		try {
			// First, try to parse directly
			parsed = JSON.parse(responseText);
		} catch {
			// Try to find JSON in the response
			const jsonMatch = responseText.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				parsed = JSON.parse(jsonMatch[0]);
			} else {
				return { success: false, error: 'Could not parse AI response as JSON' };
			}
		}

		// Validate required fields
		if (!parsed.invoiceTo && !parsed.items) {
			return { success: false, error: 'Could not extract invoice information from the description' };
		}

		// Ensure items array exists and has valid structure
		if (!Array.isArray(parsed.items)) {
			parsed.items = [];
		}

		parsed.items = parsed.items.map(item => ({
			name: item.name || 'Item',
			quantity: Number(item.quantity) || 1,
			price: Number(item.price) || 0
		}));

		return { success: true, data: parsed };
	} catch (error) {
		console.error('AI parse invoice error:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to parse invoice description'
		};
	}
}

/**
 * Generate analytics response from invoice data
 */
export async function analyzeInvoices(
	ai: Ai,
	query: string,
	summary: InvoiceSummary
): Promise<AIResponse<string>> {
	const systemPrompt = `You are an invoice analytics assistant. Answer questions about the user's invoice data based on the provided summary.

Invoice Summary:
- Total Invoices: ${summary.totalInvoices}
- Total Revenue: $${summary.totalRevenue.toFixed(2)}
- Paid Invoices: ${summary.paidCount}
- Unpaid Invoices: ${summary.unpaidCount}
- Average Invoice Amount: $${summary.averageAmount.toFixed(2)}
- Top Clients: ${summary.topClients.map(c => `${c.name} ($${c.total.toFixed(2)}, ${c.count} invoices)`).join('; ')}
${summary.monthlyBreakdown ? `- Monthly Breakdown: ${summary.monthlyBreakdown.map(m => `${m.month}: $${m.total.toFixed(2)} (${m.count} invoices)`).join('; ')}` : ''}

Provide helpful, concise answers. Use specific numbers from the data when relevant. Format currency values with dollar signs and two decimal places.`;

	try {
		const response = await ai.run(MODEL_ID, {
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: query }
			],
			max_tokens: 800,
			temperature: 0.3
		});

		if (!response || typeof response !== 'object' || !('response' in response)) {
			return { success: false, error: 'Invalid AI response format' };
		}

		const responseText = (response as { response: string }).response;

		if (!responseText || responseText.trim().length === 0) {
			return { success: false, error: 'Empty response from AI' };
		}

		return { success: true, data: responseText.trim() };
	} catch (error) {
		console.error('AI analytics error:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to analyze invoice data'
		};
	}
}

/**
 * Check if AI binding is available
 */
export function isAIAvailable(platform: App.Platform | undefined): boolean {
	return !!(platform?.env?.AI);
}
