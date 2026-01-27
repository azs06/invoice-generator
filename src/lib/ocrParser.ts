import type { InvoiceData, InvoiceItem, MonetaryAdjustment, ShippingInfo } from './types';

// Response from the OCR API
export interface OcrResponse {
	success: boolean;
	data?: OcrInvoiceData;
	error?: string;
	message?: string;
	raw?: Record<string, unknown>;
}

// Structured data extracted from OCR
export interface OcrInvoiceData {
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

/**
 * Upload a file to the OCR API and get parsed invoice data
 */
export async function parseInvoiceFromFile(file: File): Promise<OcrResponse> {
	const formData = new FormData();
	formData.append('file', file);

	const response = await fetch('/api/ocr', {
		method: 'POST',
		body: formData
	});

	const result = await response.json();

	if (!response.ok) {
		return {
			success: false,
			error: result.error || 'OCR failed',
			message: result.message || 'Failed to parse invoice'
		};
	}

	return result as OcrResponse;
}

/**
 * Apply OCR-extracted data to an invoice object
 * Returns a partial InvoiceData with only the fields that were extracted
 */
export function applyOcrDataToInvoice(
	ocrData: OcrInvoiceData,
	existingInvoice: InvoiceData
): Partial<InvoiceData> {
	const updates: Partial<InvoiceData> = {};

	// String fields - only update if OCR found a value
	if (ocrData.invoiceNumber) {
		updates.invoiceNumber = ocrData.invoiceNumber;
	}
	if (ocrData.invoiceFrom) {
		updates.invoiceFrom = ocrData.invoiceFrom;
	}
	if (ocrData.invoiceTo) {
		updates.invoiceTo = ocrData.invoiceTo;
	}
	if (ocrData.date) {
		updates.date = ocrData.date;
	}
	if (ocrData.dueDate) {
		updates.dueDate = ocrData.dueDate;
	}
	if (ocrData.terms) {
		updates.terms = ocrData.terms;
	}
	if (ocrData.notes) {
		updates.notes = ocrData.notes;
	}

	// Items - merge with existing if we have new items
	if (ocrData.items && ocrData.items.length > 0) {
		// Filter out the default empty item if it exists
		const existingItems = existingInvoice.items.filter(
			(item) => item.name || item.price > 0 || item.quantity > 1
		);

		// Create new items from OCR data
		const newItems: InvoiceItem[] = ocrData.items.map((item) => ({
			name: item.name,
			quantity: item.quantity || 1,
			price: item.price || 0,
			amount: item.amount || (item.quantity || 1) * (item.price || 0)
		}));

		// Use OCR items, keeping any non-empty existing items at the end
		updates.items = existingItems.length > 0 ? [...newItems, ...existingItems] : newItems;

		// Ensure at least one item
		if (updates.items.length === 0) {
			updates.items = [{ name: '', quantity: 1, price: 0, amount: 0 }];
		}
	}

	// Tax
	if (ocrData.tax && ocrData.tax.rate > 0) {
		updates.tax = {
			type: ocrData.tax.type,
			rate: ocrData.tax.rate
		} as MonetaryAdjustment;
	}

	// Discount
	if (ocrData.discount && ocrData.discount.rate > 0) {
		updates.discount = {
			type: ocrData.discount.type,
			rate: ocrData.discount.rate
		} as MonetaryAdjustment;
	}

	// Shipping
	if (ocrData.shipping && ocrData.shipping > 0) {
		updates.shipping = { amount: ocrData.shipping } as ShippingInfo;
	}

	// Amount paid
	if (ocrData.amountPaid && ocrData.amountPaid > 0) {
		updates.amountPaid = ocrData.amountPaid;
	}

	return updates;
}

/**
 * Validate that a file is suitable for OCR processing
 */
export function validateOcrFile(file: File): { valid: boolean; error?: string } {
	const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

	if (!validTypes.includes(file.type)) {
		return {
			valid: false,
			error: 'Please upload an image (JPEG, PNG, WebP, GIF) or PDF file'
		};
	}

	const maxSize = 10 * 1024 * 1024; // 10MB
	if (file.size > maxSize) {
		return {
			valid: false,
			error: 'File size must be less than 10MB'
		};
	}

	return { valid: true };
}
