import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { v4 as uuidv4 } from 'uuid';
import type { InvoiceData, SavedInvoiceRecord } from '$lib/types';
import { invoices, linkViews, sharedLinks, userSettings } from './schema';

const INVOICE_LIMIT = 12;
const SHARE_LINK_DEFAULT_DAYS = 30;
const SHARE_LINK_MAX_DAYS = 90;
const SHARE_LINK_TOKEN_BYTES = 32;
const SHARE_LINK_TOKEN_RETRIES = 5;

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
): Promise<boolean> {
	const d1 = drizzle(db);
	const data = JSON.stringify(invoiceData);
	const now = new Date();

	// Check if invoice exists
	const existing = await d1
		.select({ id: invoices.id, userId: invoices.userId })
		.from(invoices)
		.where(eq(invoices.id, id))
		.get();

	if (existing) {
		if (existing.userId !== userId) {
			return false;
		}

		await d1
			.update(invoices)
			.set({
				data,
				updatedAt: now
			})
			.where(and(eq(invoices.id, id), eq(invoices.userId, userId)));

		return true;
	}

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

	await d1.insert(invoices).values({
		id,
		data,
		userId,
		createdAt: now,
		updatedAt: now
	});

	return true;
}

export async function deleteInvoice(
	db: D1Database,
	bucket: R2Bucket | undefined,
	id: string,
	userId: string
): Promise<void> {
	const d1 = drizzle(db);

	// Get invoice to check for PDF key and verify ownership
	const invoice = await d1
		.select()
		.from(invoices)
		.where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
		.get();

	if (!invoice) {
		return;
	}

	// Delete PDF from R2 if it exists (outside transaction - R2 ops can't be rolled back anyway)
	if (invoice.pdfKey && bucket) {
		try {
			await bucket.delete(invoice.pdfKey);
		} catch (e) {
			console.error('Failed to delete PDF from R2:', e);
		}
	}

	// Get all shared links for this invoice to delete their views
	const links = await d1
		.select({ id: sharedLinks.id })
		.from(sharedLinks)
		.where(eq(sharedLinks.invoiceId, id));

	const linkIds = links.map((l) => l.id);

	// Execute all deletes as a single atomic batch (if any fails, all roll back)
	if (linkIds.length > 0) {
		// Has link views to delete
		await d1.batch([
			d1.delete(linkViews).where(inArray(linkViews.linkId, linkIds)),
			d1.delete(sharedLinks).where(eq(sharedLinks.invoiceId, id)),
			d1.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
		]);
	} else {
		// No link views, just delete shared links and invoice
		await d1.batch([
			d1.delete(sharedLinks).where(eq(sharedLinks.invoiceId, id)),
			d1.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
		]);
	}
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

	if (allInvoices.length === 0) {
		return;
	}

	// Delete PDFs from R2 (outside transaction - R2 ops can't be rolled back anyway)
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

	// Get all shared links for user's invoices
	const invoiceIds = allInvoices.map((i) => i.id);
	const links = await d1
		.select({ id: sharedLinks.id })
		.from(sharedLinks)
		.where(inArray(sharedLinks.invoiceId, invoiceIds));

	const linkIds = links.map((l) => l.id);

	// Execute all deletes as a single atomic batch (if any fails, all roll back)
	if (linkIds.length > 0) {
		// Has link views to delete
		await d1.batch([
			d1.delete(linkViews).where(inArray(linkViews.linkId, linkIds)),
			d1.delete(sharedLinks).where(inArray(sharedLinks.invoiceId, invoiceIds)),
			d1.delete(invoices).where(eq(invoices.userId, userId))
		]);
	} else {
		// No link views, just delete shared links and invoices
		await d1.batch([
			d1.delete(sharedLinks).where(inArray(sharedLinks.invoiceId, invoiceIds)),
			d1.delete(invoices).where(eq(invoices.userId, userId))
		]);
	}
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
		.set({ pdfKey, pdfGeneratedAt: new Date() })
		.where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
}

// =====================================================
// Share Link Management Functions
// =====================================================

export interface ShareLinkData {
	id: string;
	token: string;
	createdAt: Date;
	expiresAt: Date;
	revoked: boolean;
	viewCount: number;
	lastViewedAt: Date | null;
}

/**
 * Calculate smart expiration date: min(30 days, dueDate, 90 days max)
 */
function calculateExpirationDate(dueDate: string | null): Date {
	const now = new Date();
	const defaultExpiry = new Date(now.getTime() + SHARE_LINK_DEFAULT_DAYS * 24 * 60 * 60 * 1000);
	const maxExpiry = new Date(now.getTime() + SHARE_LINK_MAX_DAYS * 24 * 60 * 60 * 1000);

	let expiryDate = defaultExpiry;

	if (dueDate) {
		const dueDateObj = new Date(dueDate);
		if (!isNaN(dueDateObj.getTime()) && dueDateObj > now) {
			// Use due date if it's earlier than default 30 days
			expiryDate = dueDateObj < defaultExpiry ? dueDateObj : defaultExpiry;
		}
	}

	// Cap at max expiry (90 days)
	return expiryDate > maxExpiry ? maxExpiry : expiryDate;
}

/**
 * Generate a secure random token for share links
 */
function generateShareToken(): string {
	const cryptoObj = globalThis.crypto;
	if (!cryptoObj?.getRandomValues) {
		throw new Error('Crypto API not available for token generation');
	}

	const bytes = new Uint8Array(SHARE_LINK_TOKEN_BYTES);
	cryptoObj.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function isUniqueConstraintError(error: unknown): boolean {
	if (!error || typeof error !== 'object' || !('message' in error)) return false;
	const message = (error as { message?: unknown }).message;
	return typeof message === 'string' && message.toLowerCase().includes('unique constraint');
}

/**
 * Create a new share link for an invoice
 */
export async function createShareLink(
	db: D1Database,
	invoiceId: string,
	userId: string,
	dueDate: string | null
): Promise<ShareLinkData | null> {
	const d1 = drizzle(db);

	// Verify the invoice belongs to the user
	const invoice = await d1
		.select()
		.from(invoices)
		.where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
		.get();

	if (!invoice) {
		return null;
	}

	const id = uuidv4();
	const now = new Date();
	const expiresAt = calculateExpirationDate(dueDate);

	for (let attempt = 0; attempt < SHARE_LINK_TOKEN_RETRIES; attempt++) {
		const token = generateShareToken();
		try {
			await d1.insert(sharedLinks).values({
				id,
				invoiceId,
				token,
				createdAt: now,
				expiresAt,
				revoked: false,
				viewCount: 0,
				lastViewedAt: null
			});

			return {
				id,
				token,
				createdAt: now,
				expiresAt,
				revoked: false,
				viewCount: 0,
				lastViewedAt: null
			};
		} catch (err) {
			if (!isUniqueConstraintError(err)) {
				throw err;
			}
		}
	}

	return null;
}

/**
 * Get all share links for an invoice
 */
export async function getShareLinks(
	db: D1Database,
	invoiceId: string,
	userId: string
): Promise<ShareLinkData[]> {
	const d1 = drizzle(db);

	// Verify the invoice belongs to the user
	const invoice = await d1
		.select()
		.from(invoices)
		.where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
		.get();

	if (!invoice) {
		return [];
	}

	const results = await d1
		.select()
		.from(sharedLinks)
		.where(eq(sharedLinks.invoiceId, invoiceId))
		.orderBy(desc(sharedLinks.createdAt));

	return results.map((row) => ({
		id: row.id,
		token: row.token,
		createdAt: row.createdAt,
		expiresAt: row.expiresAt,
		revoked: row.revoked ?? false,
		viewCount: row.viewCount ?? 0,
		lastViewedAt: row.lastViewedAt ?? null
	}));
}

/**
 * Revoke a share link
 */
export async function revokeShareLink(
	db: D1Database,
	linkId: string,
	userId: string
): Promise<boolean> {
	const d1 = drizzle(db);

	// Get the share link and verify ownership
	const link = await d1
		.select({
			linkId: sharedLinks.id,
			invoiceId: sharedLinks.invoiceId
		})
		.from(sharedLinks)
		.where(eq(sharedLinks.id, linkId))
		.get();

	if (!link) {
		return false;
	}

	// Verify the invoice belongs to the user
	const invoice = await d1
		.select()
		.from(invoices)
		.where(and(eq(invoices.id, link.invoiceId), eq(invoices.userId, userId)))
		.get();

	if (!invoice) {
		return false;
	}

	await d1.update(sharedLinks).set({ revoked: true }).where(eq(sharedLinks.id, linkId));

	return true;
}

/**
 * Get invoice data by share token (for public viewing)
 */
export async function getInvoiceByShareToken(
	db: D1Database,
	token: string
): Promise<{ invoice: InvoiceData; linkId: string } | null> {
	const d1 = drizzle(db);

	const link = await d1.select().from(sharedLinks).where(eq(sharedLinks.token, token)).get();

	if (!link) {
		return null;
	}

	// Check if revoked
	if (link.revoked) {
		return null;
	}

	// Check if expired
	if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
		return null;
	}

	const invoice = await d1.select().from(invoices).where(eq(invoices.id, link.invoiceId)).get();

	if (!invoice) {
		return null;
	}

	return {
		invoice: JSON.parse(invoice.data) as InvoiceData,
		linkId: link.id
	};
}

/**
 * Record a view for a share link
 */
export async function recordLinkView(
	db: D1Database,
	linkId: string,
	ipAddress: string | null,
	userAgent: string | null
): Promise<void> {
	const d1 = drizzle(db);
	const now = new Date();

	// Insert view record
	await d1.insert(linkViews).values({
		id: uuidv4(),
		linkId,
		viewedAt: now,
		ipAddress,
		userAgent
	});

	// Update view count and last viewed time on the share link
	await d1
		.update(sharedLinks)
		.set({
			viewCount: sql`${sharedLinks.viewCount} + 1`,
			lastViewedAt: now
		})
		.where(eq(sharedLinks.id, linkId));
}

// =====================================================
// User Settings Functions
// =====================================================

export interface UserSettingsData {
	invoicePrefix: string;
	preferredCurrency: string;
}

/**
 * Get user settings
 */
export async function getUserSettings(
	db: D1Database,
	userId: string
): Promise<UserSettingsData | null> {
	const d1 = drizzle(db);

	const result = await d1
		.select({
			invoicePrefix: userSettings.invoicePrefix,
			preferredCurrency: userSettings.preferredCurrency
		})
		.from(userSettings)
		.where(eq(userSettings.userId, userId))
		.get();

	return result ?? null;
}

/**
 * Create or update user settings
 */
export async function upsertUserSettings(
	db: D1Database,
	userId: string,
	settings: Partial<UserSettingsData>
): Promise<void> {
	const d1 = drizzle(db);
	const now = new Date();

	const existing = await d1
		.select({ id: userSettings.id })
		.from(userSettings)
		.where(eq(userSettings.userId, userId))
		.get();

	if (existing) {
		await d1
			.update(userSettings)
			.set({
				...settings,
				updatedAt: now
			})
			.where(eq(userSettings.userId, userId));
	} else {
		await d1.insert(userSettings).values({
			id: uuidv4(),
			userId,
			invoicePrefix: settings.invoicePrefix ?? 'INV-',
			preferredCurrency: settings.preferredCurrency ?? 'USD',
			createdAt: now,
			updatedAt: now
		});
	}
}
