import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { and, eq, lte } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { v4 as uuidv4 } from 'uuid';
import type { InvoiceData } from '$lib/types';
import { type EmailBinding, APP_ORIGIN, sendInvoiceEmail } from './email';
import { invoices, recurringSchedules, userSettings } from './schema';

/**
 * Recurring-invoices engine, driven by the Workers Cron trigger.
 *
 * This module runs inside the Worker's `scheduled` handler (see worker.js),
 * so it is bundled by wrangler/esbuild — NOT Vite. It must only use relative
 * imports, npm packages, and `import type` for `$lib/*` aliases (type-only
 * imports are stripped at build time and never resolved by esbuild).
 */

export type Frequency = 'weekly' | 'monthly' | 'yearly';

export const FREQUENCIES: readonly Frequency[] = ['weekly', 'monthly', 'yearly'];

export function isFrequency(value: unknown): value is Frequency {
	return typeof value === 'string' && (FREQUENCIES as readonly string[]).includes(value);
}

/** Bindings the cron path needs. Subset of the Worker `Env`. */
export interface CronEnv {
	DB: D1Database;
	BUCKET?: R2Bucket;
	EMAIL?: EmailBinding;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DUE_OFFSET_DAYS = 30;

/** Advance a date by one interval of the given frequency. */
export function advanceDate(from: Date, frequency: Frequency): Date {
	const next = new Date(from.getTime());
	if (frequency === 'weekly') {
		next.setUTCDate(next.getUTCDate() + 7);
	} else if (frequency === 'monthly') {
		next.setUTCMonth(next.getUTCMonth() + 1);
	} else {
		next.setUTCFullYear(next.getUTCFullYear() + 1);
	}
	return next;
}

/**
 * Compute the next run strictly after `now`, advancing from `from` by whole
 * intervals. This skips any windows missed while the Worker was down so a
 * single run fires (and a single invoice is generated) instead of a burst.
 */
function computeNextRun(from: Date, frequency: Frequency, now: Date): Date {
	let next = advanceDate(from, frequency);
	// Bound the loop defensively (e.g. weekly schedule idle for years).
	for (let i = 0; i < 1000 && next.getTime() <= now.getTime(); i++) {
		next = advanceDate(next, frequency);
	}
	return next;
}

const toDateString = (date: Date): string => date.toISOString().slice(0, 10);

/** Generate a fresh invoice number mirroring the client-side format. */
function generateInvoiceNumber(prefix: string): string {
	const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
	const random = Math.floor(1000 + Math.random() * 9000);
	return `${prefix}${datePart}-${random}`;
}

/**
 * Clone a source invoice into a fresh, unpaid invoice for a new billing cycle:
 * new id + invoice number, today's issue date, due date shifted by the same
 * delta as the source, and paid state cleared.
 */
export function cloneInvoiceForRun(
	source: InvoiceData,
	newId: string,
	invoiceNumber: string,
	issueDate: Date
): InvoiceData {
	const newDateStr = toDateString(issueDate);

	// Preserve the original issue -> due gap; fall back to a 30-day due window.
	const sourceDate = Date.parse(source.date);
	const sourceDue = Date.parse(source.dueDate);
	const deltaMs =
		Number.isNaN(sourceDate) || Number.isNaN(sourceDue)
			? DEFAULT_DUE_OFFSET_DAYS * DAY_MS
			: Math.max(0, sourceDue - sourceDate);
	const newDueStr = toDateString(new Date(Date.parse(newDateStr) + deltaMs));

	const total = Number(source.total) || 0;

	return {
		...source,
		id: newId,
		invoiceNumber,
		date: newDateStr,
		dueDate: newDueStr,
		amountPaid: 0,
		paid: false,
		archived: false,
		draft: false,
		balanceDue: total
	};
}

interface ScheduleRow {
	id: string;
	userId: string;
	sourceInvoiceId: string;
	frequency: string;
	nextRunAt: Date;
}

/**
 * Find due active schedules and process each one. Wrapped per-schedule in
 * try/catch so a single failure never aborts the batch.
 *
 * Returns a small summary useful for logging/observability.
 */
export async function runDueSchedules(
	env: CronEnv,
	now: Date = new Date()
): Promise<{ processed: number; failed: number }> {
	const db = drizzle(env.DB);

	const due = (await db
		.select({
			id: recurringSchedules.id,
			userId: recurringSchedules.userId,
			sourceInvoiceId: recurringSchedules.sourceInvoiceId,
			frequency: recurringSchedules.frequency,
			nextRunAt: recurringSchedules.nextRunAt
		})
		.from(recurringSchedules)
		.where(and(eq(recurringSchedules.active, true), lte(recurringSchedules.nextRunAt, now)))
		.all()) as ScheduleRow[];

	let processed = 0;
	let failed = 0;

	for (const schedule of due) {
		try {
			await processSchedule(env, db, schedule, now);
			processed++;
		} catch (err) {
			failed++;
			console.error(`[recurring] Schedule ${schedule.id} failed:`, err);
		}
	}

	if (due.length > 0) {
		console.log(`[recurring] Processed ${processed}/${due.length} due schedules (${failed} failed).`);
	}

	return { processed, failed };
}

async function processSchedule(
	env: CronEnv,
	db: ReturnType<typeof drizzle>,
	schedule: ScheduleRow,
	now: Date
): Promise<void> {
	if (!isFrequency(schedule.frequency)) {
		throw new Error(`Unknown frequency "${schedule.frequency}"`);
	}

	// Load and verify the source invoice still exists for this user.
	const source = await db
		.select({ data: invoices.data, recipientEmail: recurringSchedules.recipientEmail })
		.from(invoices)
		.innerJoin(recurringSchedules, eq(recurringSchedules.id, schedule.id))
		.where(and(eq(invoices.id, schedule.sourceInvoiceId), eq(invoices.userId, schedule.userId)))
		.get();

	if (!source) {
		// Source invoice was deleted - deactivate the orphaned schedule.
		await db
			.update(recurringSchedules)
			.set({ active: false, updatedAt: now })
			.where(eq(recurringSchedules.id, schedule.id));
		console.warn(
			`[recurring] Deactivated schedule ${schedule.id}: source invoice ${schedule.sourceInvoiceId} not found.`
		);
		return;
	}

	let sourceInvoice: InvoiceData;
	try {
		sourceInvoice = JSON.parse(source.data) as InvoiceData;
	} catch {
		throw new Error('Source invoice data is corrupted');
	}

	// Resolve the user's invoice prefix for a well-formed number.
	const settings = await db
		.select({ invoicePrefix: userSettings.invoicePrefix })
		.from(userSettings)
		.where(eq(userSettings.userId, schedule.userId))
		.get();
	const prefix = settings?.invoicePrefix || 'INV-';

	const newId = uuidv4();
	const cloned = cloneInvoiceForRun(
		sourceInvoice,
		newId,
		generateInvoiceNumber(prefix),
		now
	);

	// Persist the new invoice for the user.
	await db.insert(invoices).values({
		id: newId,
		data: JSON.stringify(cloned),
		userId: schedule.userId,
		createdAt: now,
		updatedAt: now
	});

	// Advance the schedule immediately so a downstream email failure never
	// causes a duplicate invoice on the next cron tick.
	await db
		.update(recurringSchedules)
		.set({
			nextRunAt: computeNextRun(schedule.nextRunAt, schedule.frequency, now),
			lastRunAt: now,
			updatedAt: now
		})
		.where(eq(recurringSchedules.id, schedule.id));

	// Email the fresh invoice (link only - do NOT invoke Browser Rendering from
	// cron, so there is no PDF to attach). Best-effort: log but don't rethrow.
	if (!env.EMAIL) {
		console.warn(`[recurring] EMAIL binding missing; invoice ${newId} generated but not emailed.`);
		return;
	}
	try {
		await sendInvoiceEmail({
			email: env.EMAIL,
			bucket: env.BUCKET,
			invoice: cloned,
			invoiceId: newId,
			to: source.recipientEmail,
			pdfKey: null,
			origin: APP_ORIGIN
		});
	} catch (err) {
		console.error(`[recurring] Failed to email invoice ${newId} for schedule ${schedule.id}:`, err);
	}
}
