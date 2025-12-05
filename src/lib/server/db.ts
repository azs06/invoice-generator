import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, asc, count } from 'drizzle-orm';
import { invoices } from './schema';
import type { InvoiceData, SavedInvoiceRecord } from '$lib/types';

const INVOICE_LIMIT = 12;

export async function getInvoice(
	db: D1Database,
	id: string,
	userId?: string
): Promise<InvoiceData | null> {
	const d1 = drizzle(db);
	const conditions = [eq(invoices.id, id)];
	if (userId) {
		conditions.push(eq(invoices.userId, userId));
	}

	const result = await d1
		.select()
		.from(invoices)
		.where(and(...conditions))
		.get();

	if (!result) return null;
	return JSON.parse(result.data) as InvoiceData;
}

export async function saveInvoice(
	db: D1Database,
	bucket: R2Bucket | undefined,
	id: string,
	invoiceData: InvoiceData,
	userId: string
): Promise<void> {
	const d1 = drizzle(db);
	const data = JSON.stringify(invoiceData);
	const now = new Date();

	// Check if invoice exists
	const existing = await d1
		.select({ id: invoices.id })
		.from(invoices)
		.where(eq(invoices.id, id))
		.get();

	if (!existing) {
		// Check limit
		const countResult = await d1
			.select({ count: count() })
			.from(invoices)
			.where(eq(invoices.userId, userId))
			.get();
		const currentCount = countResult?.count ?? 0;

		if (currentCount >= INVOICE_LIMIT) {
			// Find oldest invoice
			const oldest = await d1
				.select()
				.from(invoices)
				.where(eq(invoices.userId, userId))
				.orderBy(asc(invoices.updatedAt))
				.limit(1)
				.get();

			if (oldest) {
				// Delete oldest invoice and its PDF
				await deleteInvoice(db, bucket, oldest.id, userId);
			}
		}
	}

	await d1
		.insert(invoices)
		.values({
			id,
			data,
			userId,
			createdAt: now,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: invoices.id,
			set: {
				data,
				updatedAt: now
			}
		});
}

export async function deleteInvoice(
	db: D1Database,
	bucket: R2Bucket | undefined,
	id: string,
	userId: string
): Promise<void> {
	const d1 = drizzle(db);

	// Get invoice to check for PDF key
	const invoice = await d1
		.select()
		.from(invoices)
		.where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
		.get();

	if (invoice && invoice.pdfKey && bucket) {
		try {
			await bucket.delete(invoice.pdfKey);
		} catch (e) {
			console.error('Failed to delete PDF from R2:', e);
		}
	}

	await d1.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
}

export async function getAllInvoices(
	db: D1Database,
	userId: string
): Promise<SavedInvoiceRecord[]> {
	const d1 = drizzle(db);
	const results = await d1
		.select()
		.from(invoices)
		.where(eq(invoices.userId, userId))
		.orderBy(desc(invoices.updatedAt));

	return results.map((row) => ({
		id: row.id,
		invoice: JSON.parse(row.data) as InvoiceData
	}));
}

export async function clearAllInvoices(
	db: D1Database,
	bucket: R2Bucket | undefined,
	userId: string
): Promise<void> {
	const d1 = drizzle(db);

	// Get all invoices to delete PDFs
	const allInvoices = await d1.select().from(invoices).where(eq(invoices.userId, userId)).all();

	if (bucket) {
		const keys = allInvoices.map((i) => i.pdfKey).filter((k) => k !== null) as string[];
		if (keys.length > 0) {
			try {
				await bucket.delete(keys);
			} catch (e) {
				console.error('Failed to delete PDFs from R2:', e);
			}
		}
	}

	await d1.delete(invoices).where(eq(invoices.userId, userId));
}

export async function getInvoiceCount(db: D1Database, userId: string): Promise<number> {
	const d1 = drizzle(db);
	const result = await d1
		.select({ count: count() })
		.from(invoices)
		.where(eq(invoices.userId, userId))
		.get();
	return result?.count ?? 0;
}

export async function updateInvoicePdfKey(
	db: D1Database,
	id: string,
	userId: string,
	pdfKey: string
): Promise<void> {
	const d1 = drizzle(db);
	await d1
		.update(invoices)
		.set({ pdfKey })
		.where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
}
