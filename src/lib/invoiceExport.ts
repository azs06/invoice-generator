/**
 * Invoice Export/Import utilities
 * Handles exporting invoices to JSON and importing from JSON files
 */

import type { InvoiceData, SavedInvoiceRecord } from './types';
import { v4 as uuidv4 } from 'uuid';

// Export file format version for future compatibility
const EXPORT_FORMAT_VERSION = '1.0';

export interface InvoiceExportData {
	version: string;
	exportDate: string;
	invoices: InvoiceData[];
}

export interface ImportResult {
	success: boolean;
	imported: number;
	skipped: number;
	errors: string[];
}

/**
 * Export invoices to a JSON file and trigger download
 */
export function exportInvoicesToFile(
	invoices: InvoiceData[] | SavedInvoiceRecord[],
	filename?: string
): void {
	// Normalize to InvoiceData array, filtering out null/undefined invoices
	const invoiceData: InvoiceData[] = invoices
		.map((item) => {
			if ('invoice' in item) {
				return item.invoice;
			}
			return item;
		})
		.filter((invoice): invoice is InvoiceData => invoice != null);

	const exportData: InvoiceExportData = {
		version: EXPORT_FORMAT_VERSION,
		exportDate: new Date().toISOString(),
		invoices: invoiceData
	};

	const jsonString = JSON.stringify(exportData, null, 2);
	const blob = new Blob([jsonString], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const defaultFilename = generateExportFilename(invoiceData.length);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename || defaultFilename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Export a single invoice to a JSON file
 */
export function exportSingleInvoice(invoice: InvoiceData): void {
	const clientName = invoice.invoiceTo?.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 30) || 'invoice';
	const invoiceNumber = invoice.invoiceNumber?.replace(/[^a-zA-Z0-9]/g, '-') || '';
	const filename = invoiceNumber
		? `invoice-${clientName}-${invoiceNumber}.json`
		: `invoice-${clientName}.json`;

	exportInvoicesToFile([invoice], filename);
}

/**
 * Generate a filename for the export
 */
function generateExportFilename(count: number): string {
	const date = new Date().toISOString().split('T')[0];
	if (count === 1) {
		return `invoice-export-${date}.json`;
	}
	return `invoices-export-${count}-${date}.json`;
}

/**
 * Read and parse an invoice export file
 */
export async function readExportFile(file: File): Promise<InvoiceExportData> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = (event) => {
			try {
				const content = event.target?.result as string;
				const data = JSON.parse(content);

				// Validate the structure
				if (!isValidExportData(data)) {
					reject(new Error('Invalid export file format'));
					return;
				}

				resolve(data as InvoiceExportData);
			} catch (error) {
				reject(new Error('Failed to parse export file. Please ensure it is a valid JSON file.'));
			}
		};

		reader.onerror = () => {
			reject(new Error('Failed to read file'));
		};

		reader.readAsText(file);
	});
}

/**
 * Validate export data structure
 */
function isValidExportData(data: unknown): data is InvoiceExportData {
	if (!data || typeof data !== 'object') return false;

	const obj = data as Record<string, unknown>;

	// Check for required fields
	if (!obj.version || typeof obj.version !== 'string') return false;
	if (!obj.invoices || !Array.isArray(obj.invoices)) return false;

	// Validate each invoice has required fields
	for (const invoice of obj.invoices) {
		if (!isValidInvoice(invoice)) return false;
	}

	return true;
}

/**
 * Validate individual invoice structure
 */
function isValidInvoice(invoice: unknown): invoice is InvoiceData {
	if (!invoice || typeof invoice !== 'object') return false;

	const obj = invoice as Record<string, unknown>;

	// Check for essential invoice fields
	if (typeof obj.id !== 'string') return false;
	if (!Array.isArray(obj.items)) return false;

	return true;
}

/**
 * Prepare invoices for import by generating new IDs to avoid conflicts
 */
export function prepareInvoicesForImport(
	invoices: InvoiceData[],
	generateNewIds: boolean = true
): InvoiceData[] {
	return invoices.map((invoice) => {
		const prepared = { ...invoice };

		if (generateNewIds) {
			// Generate a new ID to avoid conflicts
			prepared.id = uuidv4();
		}

		// Reset any server-specific fields
		prepared.archived = false;

		// Ensure required fields have defaults
		prepared.templateId = prepared.templateId || 'modern';
		prepared.items = prepared.items || [];
		prepared.discount = prepared.discount || { type: 'flat', rate: 0 };
		prepared.tax = prepared.tax || { type: 'flat', rate: 0 };
		prepared.shipping = prepared.shipping || { amount: 0 };
		prepared.subTotal = prepared.subTotal || 0;
		prepared.total = prepared.total || 0;
		prepared.balanceDue = prepared.balanceDue || 0;
		prepared.amountPaid = prepared.amountPaid || 0;
		prepared.paid = prepared.paid || false;
		prepared.draft = prepared.draft !== false; // Default to draft for imported invoices

		return prepared;
	});
}

/**
 * Import invoices using the provided save function
 * Works with both guest (IndexedDB) and logged-in (API) save functions
 */
export async function importInvoices(
	invoices: InvoiceData[],
	saveFn: (id: string, invoice: InvoiceData) => Promise<void>,
	options: { generateNewIds?: boolean } = {}
): Promise<ImportResult> {
	const { generateNewIds = true } = options;
	const preparedInvoices = prepareInvoicesForImport(invoices, generateNewIds);

	const result: ImportResult = {
		success: true,
		imported: 0,
		skipped: 0,
		errors: []
	};

	for (const invoice of preparedInvoices) {
		try {
			await saveFn(invoice.id, invoice);
			result.imported++;
		} catch (error) {
			result.errors.push(
				`Failed to import invoice ${invoice.invoiceNumber || invoice.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
			result.skipped++;
		}
	}

	result.success = result.errors.length === 0;
	return result;
}
