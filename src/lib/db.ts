import type { InvoiceData, SavedInvoiceRecord } from './types';

const API_BASE = '/api/invoices';

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

export async function saveInvoice(id: string, invoiceData: InvoiceData): Promise<void> {
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

	// We don't need to stringify here, fetch will do it.
	// But we need to make sure it's a plain object.
	const plainInvoiceObject = JSON.parse(JSON.stringify(objectToSerialize));

	if (id) {
		// Update existing
		await fetch(`${API_BASE}/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(plainInvoiceObject)
		});
	} else {
		// Create new (though id is usually passed)
		await fetch(API_BASE, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(plainInvoiceObject)
		});
	}
}

export async function getInvoice(id: string): Promise<InvoiceData | undefined> {
	try {
		const res = await fetch(`${API_BASE}/${id}`);
		if (!res.ok) return undefined;
		return await res.json();
	} catch (e) {
		console.error('Error fetching invoice:', e);
		return undefined;
	}
}

export async function deleteInvoice(id: string): Promise<void> {
	await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
}

export async function getAllInvoices(): Promise<SavedInvoiceRecord[]> {
	const response = await fetch('/api/invoices');
	if (response.ok) {
		const data = await response.json();
		// Handle both old array format (if any cached) and new object format
		if (Array.isArray(data)) return data;
		return data.invoices || [];
	}
	return [];
}

export async function getInvoiceUsage(): Promise<{ count: number; limit: number }> {
	const response = await fetch('/api/invoices');
	if (response.ok) {
		const data = await response.json();
		if (!Array.isArray(data)) {
			return { count: data.count || 0, limit: data.limit || 12 };
		}
	}
	return { count: 0, limit: 12 };
}

export async function clearAllInvoices(): Promise<void> {
	await fetch(API_BASE, { method: 'DELETE' });
}
