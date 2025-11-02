import { get, set, del, keys, clear } from 'idb-keyval';

const INVOICE_PREFIX = 'ig.invoice.';

// Helper function to convert a File object to a Base64 Data URL
// This ensures the function is self-contained if needed, though +page.svelte also has similar logic.
async function fileToDataURL(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = (error) => reject(error);
		reader.readAsDataURL(file);
	});
}

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

export async function getInvoice(id) {
  return await get(INVOICE_PREFIX + id);
}

export async function deleteInvoice(id) {
  return await del(INVOICE_PREFIX + id);
}

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

export async function clearAllInvoices() {
  await clear();
}
