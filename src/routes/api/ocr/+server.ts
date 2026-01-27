import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Structured invoice data that we want to extract from OCR
interface OcrInvoiceData {
	invoiceNumber?: string;
	invoiceFrom?: string;
	invoiceTo?: string;
	date?: string;
	dueDate?: string;
	items?: Array<{
		name: string;
		quantity: number;
		price: number;
		amount: number;
	}>;
	subTotal?: number;
	tax?: {
		type: 'flat' | 'percent';
		rate: number;
	};
	discount?: {
		type: 'flat' | 'percent';
		rate: number;
	};
	shipping?: number;
	total?: number;
	amountPaid?: number;
	terms?: string;
	notes?: string;
}

// The prompt to extract invoice data in a structured format
const INVOICE_EXTRACTION_PROMPT = `You are an invoice data extraction assistant. Analyze this invoice image and extract the following information in JSON format.

IMPORTANT: Return ONLY valid JSON, no markdown, no explanations, just the JSON object.

Extract these fields (use null if not found):
{
  "invoiceNumber": "string or null - the invoice number/ID",
  "invoiceFrom": "string or null - seller/vendor name and address combined",
  "invoiceTo": "string or null - buyer/client name and address combined",
  "date": "string or null - invoice date in YYYY-MM-DD format",
  "dueDate": "string or null - due date in YYYY-MM-DD format",
  "items": [
    {
      "name": "item description",
      "quantity": number,
      "price": number (unit price),
      "amount": number (total for this line)
    }
  ],
  "subTotal": number or null,
  "taxRate": number or null (as percentage, e.g., 10 for 10%),
  "taxAmount": number or null (flat tax amount if shown),
  "discountRate": number or null (as percentage),
  "discountAmount": number or null (flat discount amount if shown),
  "shipping": number or null,
  "total": number or null,
  "amountPaid": number or null,
  "terms": "string or null - payment terms",
  "notes": "string or null - any notes"
}

Rules:
- Extract all line items you can find
- For prices/amounts, use numbers only (no currency symbols)
- For dates, convert to YYYY-MM-DD format
- Combine name and address for invoiceFrom and invoiceTo fields
- If tax is shown as percentage, use taxRate; if flat amount, use taxAmount
- Same for discount: percentage in discountRate, flat amount in discountAmount`;

export const POST: RequestHandler = async (event) => {
	try {
		const platform = event.platform;
		if (!platform?.env?.AI) {
			return json(
				{
					error: 'AI service not available',
					message: 'Workers AI binding is not configured'
				},
				{ status: 503 }
			);
		}

		const formData = await event.request.formData();
		const file = formData.get('file') as File | null;

		if (!file) {
			return json({ error: 'No file provided' }, { status: 400 });
		}

		// Validate file type
		const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
		if (!validTypes.includes(file.type)) {
			return json(
				{
					error: 'Invalid file type',
					message: 'Please upload an image (JPEG, PNG, WebP, GIF) or PDF'
				},
				{ status: 400 }
			);
		}

		// Check file size (max 10MB)
		const maxSize = 10 * 1024 * 1024;
		if (file.size > maxSize) {
			return json(
				{
					error: 'File too large',
					message: 'Maximum file size is 10MB'
				},
				{ status: 400 }
			);
		}

		// Convert file to array buffer
		const arrayBuffer = await file.arrayBuffer();
		const imageArray = [...new Uint8Array(arrayBuffer)];

		// Use Llama 3.2 Vision model for OCR
		const aiResponse = await platform.env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
			messages: [
				{
					role: 'user',
					content: [
						{
							type: 'text',
							text: INVOICE_EXTRACTION_PROMPT
						},
						{
							type: 'image',
							image: imageArray
						}
					]
				}
			],
			max_tokens: 2048
		});

		// Parse the AI response
		const responseText =
			typeof aiResponse === 'string'
				? aiResponse
				: 'response' in aiResponse
					? (aiResponse as { response: string }).response
					: JSON.stringify(aiResponse);

		// Try to extract JSON from the response
		let extractedData: Record<string, unknown>;
		try {
			// Try to find JSON in the response (sometimes the model adds extra text)
			const jsonMatch = responseText.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				extractedData = JSON.parse(jsonMatch[0]);
			} else {
				throw new Error('No JSON found in response');
			}
		} catch {
			console.error('Failed to parse AI response:', responseText);
			return json(
				{
					error: 'Failed to parse invoice',
					message: 'Could not extract structured data from the invoice',
					rawResponse: responseText
				},
				{ status: 422 }
			);
		}

		// Transform the extracted data into our format
		const invoiceData = transformExtractedData(extractedData);

		return json({
			success: true,
			data: invoiceData,
			raw: extractedData
		});
	} catch (error) {
		console.error('OCR error:', error);
		return json(
			{
				error: 'OCR processing failed',
				message: error instanceof Error ? error.message : 'Unknown error occurred'
			},
			{ status: 500 }
		);
	}
};

function transformExtractedData(raw: Record<string, unknown>): OcrInvoiceData {
	const result: OcrInvoiceData = {};

	// Simple string fields
	if (raw.invoiceNumber) result.invoiceNumber = String(raw.invoiceNumber);
	if (raw.invoiceFrom) result.invoiceFrom = String(raw.invoiceFrom);
	if (raw.invoiceTo) result.invoiceTo = String(raw.invoiceTo);
	if (raw.terms) result.terms = String(raw.terms);
	if (raw.notes) result.notes = String(raw.notes);

	// Date fields - ensure YYYY-MM-DD format
	if (raw.date) result.date = parseDate(String(raw.date));
	if (raw.dueDate) result.dueDate = parseDate(String(raw.dueDate));

	// Numeric fields
	if (raw.subTotal !== null && raw.subTotal !== undefined)
		result.subTotal = parseNumber(raw.subTotal);
	if (raw.total !== null && raw.total !== undefined) result.total = parseNumber(raw.total);
	if (raw.amountPaid !== null && raw.amountPaid !== undefined)
		result.amountPaid = parseNumber(raw.amountPaid);
	if (raw.shipping !== null && raw.shipping !== undefined)
		result.shipping = parseNumber(raw.shipping);

	// Tax handling
	if (raw.taxRate !== null && raw.taxRate !== undefined) {
		result.tax = { type: 'percent', rate: parseNumber(raw.taxRate) };
	} else if (raw.taxAmount !== null && raw.taxAmount !== undefined) {
		result.tax = { type: 'flat', rate: parseNumber(raw.taxAmount) };
	}

	// Discount handling
	if (raw.discountRate !== null && raw.discountRate !== undefined) {
		result.discount = { type: 'percent', rate: parseNumber(raw.discountRate) };
	} else if (raw.discountAmount !== null && raw.discountAmount !== undefined) {
		result.discount = { type: 'flat', rate: parseNumber(raw.discountAmount) };
	}

	// Items array
	if (Array.isArray(raw.items)) {
		result.items = raw.items
			.filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
			.map((item) => ({
				name: item.name ? String(item.name) : '',
				quantity: parseNumber(item.quantity) || 1,
				price: parseNumber(item.price) || 0,
				amount: parseNumber(item.amount) || parseNumber(item.quantity) * parseNumber(item.price)
			}))
			.filter((item) => item.name || item.price > 0);
	}

	return result;
}

function parseNumber(value: unknown): number {
	if (typeof value === 'number') return value;
	if (typeof value === 'string') {
		// Remove currency symbols and commas
		const cleaned = value.replace(/[^0-9.-]/g, '');
		const num = parseFloat(cleaned);
		return isNaN(num) ? 0 : num;
	}
	return 0;
}

function parseDate(value: string): string {
	// If already in YYYY-MM-DD format
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return value;
	}

	// Try to parse various date formats
	const date = new Date(value);
	if (!isNaN(date.getTime())) {
		return date.toISOString().split('T')[0];
	}

	// Return empty string if parsing fails
	return '';
}
