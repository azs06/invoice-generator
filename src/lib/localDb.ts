/**
 * Local IndexedDB storage module (used by ALL users, not just guests)
 *
 * Local-first, cloud-enhanced: Every invoice is always saved here.
 * Logged-in users can additionally sync selected invoices to the cloud.
 *
 * Uses idb-keyval for simple key-value storage in IndexedDB.
 */

import { del as idbDel, get as idbGet, keys as idbKeys, set as idbSet } from 'idb-keyval';
import type { InvoiceData, LocalInvoiceRecord } from './types';

const INVOICE_PREFIX = 'ig.invoice.';
const LEGACY_PREFIX = 'ig.guest.invoice.';

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
 * Prepare invoice data for storage (process logo, strip Svelte proxies)
 */
async function prepareForStorage(invoiceData: InvoiceData): Promise<InvoiceData> {
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
	return JSON.parse(JSON.stringify(objectToSerialize));
}

/**
 * Save an invoice to IndexedDB (used by all users)
 */
export async function saveLocalInvoice(
	id: string,
	invoiceData: InvoiceData,
	meta?: { cloudSynced?: boolean; cloudId?: string | null }
): Promise<void> {
	const plainInvoiceObject = await prepareForStorage(invoiceData);

	const record: LocalInvoiceRecord = {
		id,
		invoice: plainInvoiceObject,
		cloudSynced: meta?.cloudSynced ?? false,
		cloudId: meta?.cloudId ?? null,
		updatedAt: new Date().toISOString()
	};

	await idbSet(`${INVOICE_PREFIX}${id}`, record);
}

/**
 * Get a single invoice from IndexedDB by ID
 */
export async function getLocalInvoice(id: string): Promise<LocalInvoiceRecord | undefined> {
	// Try new prefix first
	let record = await idbGet<LocalInvoiceRecord | InvoiceData>(`${INVOICE_PREFIX}${id}`);

	// Fallback: try legacy prefix
	if (!record) {
		const legacy = await idbGet<InvoiceData>(`${LEGACY_PREFIX}${id}`);
		if (legacy) {
			// Migrate on read: save under new prefix and delete old key
			record = { id, invoice: legacy, cloudSynced: false, cloudId: null, updatedAt: new Date().toISOString() };
			await idbSet(`${INVOICE_PREFIX}${id}`, record);
			await idbDel(`${LEGACY_PREFIX}${id}`);
			return record;
		}
		return undefined;
	}

	// Handle old format where the value was stored as raw InvoiceData (no wrapper)
	if ('invoiceNumber' in record && !('invoice' in record)) {
		const invoice = record as unknown as InvoiceData;
		const wrapped: LocalInvoiceRecord = {
			id,
			invoice,
			cloudSynced: false,
			cloudId: null,
			updatedAt: new Date().toISOString()
		};
		await idbSet(`${INVOICE_PREFIX}${id}`, wrapped);
		return wrapped;
	}

	return record as LocalInvoiceRecord;
}

/**
 * Get just the invoice data (convenience wrapper for compatibility)
 */
export async function getLocalInvoiceData(id: string): Promise<InvoiceData | undefined> {
	const record = await getLocalInvoice(id);
	return record?.invoice;
}

/**
 * Delete a single invoice from IndexedDB
 */
export async function deleteLocalInvoice(id: string): Promise<void> {
	await idbDel(`${INVOICE_PREFIX}${id}`);
	// Also clean up legacy key if it exists
	await idbDel(`${LEGACY_PREFIX}${id}`);
}

/**
 * Get all invoices from IndexedDB, including legacy-prefix entries.
 * Returns array sorted by date descending (most recent first).
 */
export async function getAllLocalInvoices(): Promise<LocalInvoiceRecord[]> {
	const allKeys = await idbKeys();

	// Collect keys from both prefixes
	const newKeys = allKeys.filter(
		(key): key is string => typeof key === 'string' && key.startsWith(INVOICE_PREFIX)
	);
	const legacyKeys = allKeys.filter(
		(key): key is string => typeof key === 'string' && key.startsWith(LEGACY_PREFIX)
	);

	// Track IDs we've already seen (new prefix takes priority)
	const seenIds = new Set<string>();
	const records: LocalInvoiceRecord[] = [];

	// Process new-prefix keys
	for (const key of newKeys) {
		const id = key.replace(INVOICE_PREFIX, '');
		seenIds.add(id);

		const value = await idbGet<LocalInvoiceRecord | InvoiceData>(key);
		if (!value) continue;

		// Handle old raw-InvoiceData format
		if ('invoiceNumber' in value && !('invoice' in value)) {
			const invoice = value as unknown as InvoiceData;
			const wrapped: LocalInvoiceRecord = {
				id,
				invoice,
				cloudSynced: false,
				cloudId: null,
				updatedAt: new Date().toISOString()
			};
			await idbSet(key, wrapped);
			records.push(wrapped);
		} else {
			records.push(value as LocalInvoiceRecord);
		}
	}

	// Process legacy-prefix keys (migrate on read)
	for (const key of legacyKeys) {
		const id = key.replace(LEGACY_PREFIX, '');
		if (seenIds.has(id)) {
			// Already exists under new prefix — just remove legacy key
			await idbDel(key);
			continue;
		}

		const invoice = await idbGet<InvoiceData>(key);
		if (!invoice) continue;

		const record: LocalInvoiceRecord = {
			id,
			invoice,
			cloudSynced: false,
			cloudId: null,
			updatedAt: new Date().toISOString()
		};

		// Migrate: save under new prefix, delete old
		await idbSet(`${INVOICE_PREFIX}${id}`, record);
		await idbDel(key);
		records.push(record);
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
 * Delete all local invoices from IndexedDB
 */
export async function clearAllLocalInvoices(): Promise<void> {
	const allKeys = await idbKeys();
	const invoiceKeys = allKeys.filter(
		(key): key is string =>
			typeof key === 'string' &&
			(key.startsWith(INVOICE_PREFIX) || key.startsWith(LEGACY_PREFIX))
	);

	for (const key of invoiceKeys) {
		await idbDel(key);
	}
}

/**
 * Get the count of local invoices stored in IndexedDB
 */
export async function getLocalInvoiceCount(): Promise<number> {
	const allKeys = await idbKeys();
	const newKeys = new Set(
		allKeys
			.filter((key): key is string => typeof key === 'string' && key.startsWith(INVOICE_PREFIX))
			.map((key) => key.replace(INVOICE_PREFIX, ''))
	);
	const legacyOnlyCount = allKeys.filter(
		(key): key is string =>
			typeof key === 'string' &&
			key.startsWith(LEGACY_PREFIX) &&
			!newKeys.has(key.replace(LEGACY_PREFIX, ''))
	).length;

	return newKeys.size + legacyOnlyCount;
}

/**
 * Update sync metadata for a local invoice
 */
export async function updateLocalInvoiceSyncStatus(
	id: string,
	cloudSynced: boolean,
	cloudId: string | null
): Promise<void> {
	const record = await getLocalInvoice(id);
	if (!record) return;

	record.cloudSynced = cloudSynced;
	record.cloudId = cloudId;
	await idbSet(`${INVOICE_PREFIX}${id}`, record);
}

/**
 * Get count of cloud-synced invoices
 */
export async function getCloudSyncedCount(): Promise<number> {
	const allRecords = await getAllLocalInvoices();
	return allRecords.filter((r) => r.cloudSynced).length;
}

// Re-export with legacy names for backward compatibility during migration
export {
	saveLocalInvoice as saveGuestInvoice,
	deleteLocalInvoice as deleteGuestInvoice,
	clearAllLocalInvoices as clearAllGuestInvoices,
	getLocalInvoiceCount as getGuestInvoiceCount
};

/**
 * Backward-compatible getAllGuestInvoices that returns SavedInvoiceRecord format
 */
export async function getAllGuestInvoices(): Promise<{ id: string; invoice: InvoiceData }[]> {
	const records = await getAllLocalInvoices();
	return records.map((r) => ({ id: r.id, invoice: r.invoice }));
}

/**
 * Backward-compatible getGuestInvoice that returns raw InvoiceData
 */
export async function getGuestInvoice(id: string): Promise<InvoiceData | undefined> {
	return getLocalInvoiceData(id);
}
