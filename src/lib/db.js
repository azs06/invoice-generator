import { get, set, del, keys, clear } from 'idb-keyval';

const INVOICE_PREFIX = 'ig.invoice.';

// Helper function to convert a File object to a Base64 Data URL
// This ensures the function is self-contained if needed, though +page.svelte also has similar logic.
/**
 * @param {any} file - File object to convert
 * @returns {Promise<string | null>} Base64 data URL or null if failed
 */
async function fileToDataURL(file) {
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
 * @param {any} id - Invoice ID
 * @param {any} invoiceData - Invoice data object
 * @returns {Promise<void>}
 */
export async function saveInvoice(id, invoiceData) {
	// invoiceData is likely a Svelte $state proxy.
	// We need to convert it to a plain JavaScript object for IndexedDB.

	let processedLogo = invoiceData.logo;
	let logoFilename = invoiceData.logoFilename; // Preserve existing filename

	// Handle logo: if it's a File object, convert to data URL.
	// JSON.stringify would turn a File into {}.
	if (invoiceData.logo instanceof File) {
		try {
			processedLogo = await fileToDataURL(invoiceData.logo);
			logoFilename = invoiceData.logo.name; // Update filename from the File object
		} catch (error) {
			console.error('Failed to convert logo to data URL in db.js:', error);
			processedLogo = null; // Default to null if conversion fails
			logoFilename = null;
		}
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
	return await set(INVOICE_PREFIX + id, plainInvoiceObject);
}

/**
 * @param {any} id - Invoice ID
 * @returns {Promise<any>} Invoice data
 */
export async function getInvoice(id) {
	return await get(INVOICE_PREFIX + id);
}

/**
 * @param {any} id - Invoice ID
 * @returns {Promise<void>}
 */
export async function deleteInvoice(id) {
	return await del(INVOICE_PREFIX + id);
}

/**
 * @returns {Promise<Array<{id: string, invoice: any}>>} Array of invoices with IDs
 */
export async function getAllInvoices() {
	const allKeys = await keys();
	const invoices = [];
	for (const key of allKeys) {
		if (typeof key === 'string' && key.startsWith(INVOICE_PREFIX)) {
			const invoice = await get(key);
			const id = key.replace(INVOICE_PREFIX, '');
			invoices.push({ id, invoice });
		}
	}
	return invoices;
}

/**
 * @returns {Promise<void>}
 */
export async function clearAllInvoices() {
	await clear();
}
