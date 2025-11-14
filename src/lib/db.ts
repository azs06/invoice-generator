import { get, set, del, keys, clear } from 'idb-keyval';
import type { InvoiceData, SavedInvoiceRecord } from './types';

const INVOICE_PREFIX = 'ig.invoice.';

/**
 * Helper function to convert a File object to a Base64 Data URL
 * This ensures the function is self-contained if needed, though +page.svelte also has similar logic.
 */
async function fileToDataURL(file: File): Promise<string | null> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result;
			if (typeof result === 'string') {
				resolve(result);
			} else {
				resolve(null);
			}
		};
		reader.onerror = (error) => reject(error);
		reader.readAsDataURL(file);
	});
}

export async function saveInvoice(id: string, invoiceData: InvoiceData): Promise<void> {
	// invoiceData is likely a Svelte $state proxy.
	// We need to convert it to a plain JavaScript object for IndexedDB.

	let processedLogo: string | null = null;
	let logoFilename: string | null = invoiceData.logoFilename; // Preserve existing filename

	// Handle logo: if it's a File object, convert to data URL.
	// JSON.stringify would turn a File into {}.
	if (invoiceData.logo instanceof File) {
		try {
			processedLogo = await fileToDataURL(invoiceData.logo);
			logoFilename = invoiceData.logo.name; // Update filename from the File object
		} catch (error) {
			console.error('Failed to convert logo to data URL in db.ts:', error);
			processedLogo = null; // Default to null if conversion fails
			logoFilename = null;
		}
	} else if (typeof invoiceData.logo === 'string') {
		processedLogo = invoiceData.logo;
	}

	// Create an intermediate object with the (potentially) processed logo
	// and spread the rest of the invoiceData (which might have nested proxies).
	const objectToSerialize = {
		...invoiceData,
		logo: processedLogo,
		logoFilename: logoFilename, // Ensure logoFilename is included
		templateId: invoiceData.templateId || 'modern' // Include templateId with fallback
	};

	// Convert the entire object (including any nested proxies) to a plain JavaScript object.
	const plainInvoiceObject = JSON.parse(JSON.stringify(objectToSerialize));
	await set(INVOICE_PREFIX + id, plainInvoiceObject);
}

export async function getInvoice(id: string): Promise<InvoiceData | undefined> {
	return await get(INVOICE_PREFIX + id);
}

export async function deleteInvoice(id: string): Promise<void> {
	await del(INVOICE_PREFIX + id);
}

export async function getAllInvoices(): Promise<SavedInvoiceRecord[]> {
	const allKeys = await keys();
	const invoices: SavedInvoiceRecord[] = [];
	for (const key of allKeys) {
		if (typeof key === 'string' && key.startsWith(INVOICE_PREFIX)) {
			const invoice = await get<InvoiceData>(key);
			if (invoice) {
				const id = key.replace(INVOICE_PREFIX, '');
				invoices.push({ id, invoice });
			}
		}
	}
	return invoices;
}

export async function clearAllInvoices(): Promise<void> {
	await clear();
}
