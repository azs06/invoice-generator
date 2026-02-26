/**
 * Guest IndexedDB storage module
 * Uses idb-keyval for simple key-value storage in IndexedDB
 * This is used for guests who aren't logged in - their invoices are stored locally in the browser
 */

import { del as idbDel, get as idbGet, keys as idbKeys, set as idbSet } from 'idb-keyval';
import type { InvoiceData, SavedInvoiceRecord } from './types';

const INVOICE_PREFIX = 'ig.guest.invoice.';

/**
 * Helper function to convert a File object to a Base64 Data URL
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

/**
 * Save an invoice to IndexedDB for guest users
 */
export async function saveGuestInvoice(id: string, invoiceData: InvoiceData): Promise<void> {
	let processedLogo: string | null = null;
	let logoFilename: string | null = invoiceData.logoFilename;

	if (invoiceData.logo instanceof File) {
		try {
			processedLogo = await fileToDataURL(invoiceData.logo);
			logoFilename = invoiceData.logo.name;
		} catch (error) {
			console.error('Failed to convert logo to data URL:', error);
			processedLogo = null;
			logoFilename = null;
		}
	} else if (typeof invoiceData.logo === 'string') {
		processedLogo = invoiceData.logo;
	}

	const objectToSerialize = {
		...invoiceData,
		logo: processedLogo,
		logoFilename: logoFilename,
		templateId: invoiceData.templateId || 'modern'
	};

	// Ensure it's a plain object (strips Svelte 5 proxy wrappers)
	const plainInvoiceObject = JSON.parse(JSON.stringify(objectToSerialize));

	await idbSet(`${INVOICE_PREFIX}${id}`, plainInvoiceObject);
}

/**
 * Get a single invoice from IndexedDB by ID
 */
export async function getGuestInvoice(id: string): Promise<InvoiceData | undefined> {
	try {
		return await idbGet(`${INVOICE_PREFIX}${id}`);
	} catch (e) {
		console.error('Error fetching guest invoice:', e);
		return undefined;
	}
}

/**
 * Delete a single invoice from IndexedDB
 */
export async function deleteGuestInvoice(id: string): Promise<void> {
	await idbDel(`${INVOICE_PREFIX}${id}`);
}

/**
 * Get all guest invoices from IndexedDB
 * Returns array sorted by date descending (most recent first)
 */
export async function getAllGuestInvoices(): Promise<SavedInvoiceRecord[]> {
	const allKeys = await idbKeys();
	const invoiceKeys = allKeys.filter(
		(key): key is string => typeof key === 'string' && key.startsWith(INVOICE_PREFIX)
	);

	const records: SavedInvoiceRecord[] = [];
	for (const key of invoiceKeys) {
		const invoice = await idbGet<InvoiceData>(key);
		if (invoice) {
			const id = key.replace(INVOICE_PREFIX, '');
			records.push({ id, invoice });
		}
	}

	// Sort by date descending (most recent first)
	records.sort((a, b) => {
		const dateA = a.invoice.date ? new Date(a.invoice.date).getTime() : 0;
		const dateB = b.invoice.date ? new Date(b.invoice.date).getTime() : 0;
		return dateB - dateA;
	});

	return records;
}

/**
 * Delete all guest invoices from IndexedDB
 */
export async function clearAllGuestInvoices(): Promise<void> {
	const allKeys = await idbKeys();
	const invoiceKeys = allKeys.filter(
		(key): key is string => typeof key === 'string' && key.startsWith(INVOICE_PREFIX)
	);

	for (const key of invoiceKeys) {
		await idbDel(key);
	}
}

/**
 * Get the count of guest invoices stored in IndexedDB
 */
export async function getGuestInvoiceCount(): Promise<number> {
	const allKeys = await idbKeys();
	return allKeys.filter(
		(key): key is string => typeof key === 'string' && key.startsWith(INVOICE_PREFIX)
	).length;
}
