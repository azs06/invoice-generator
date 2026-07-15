import { and, desc, eq, gt } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import type { InvoiceData } from '$lib/types';
import { trackEvent } from './analytics';
import { APP_ORIGIN, sendReminderEmail } from './email';
import type { CronEnv } from './recurring';
import { invoices, reminderSettings, sharedLinks } from './schema';

/**
 * Overdue-invoice reminder engine, driven by the Workers Cron trigger.
 *
 * This module runs inside the Worker's `scheduled` handler (see worker.js),
 * so it is bundled by wrangler/esbuild — NOT Vite. It must only use relative
 * imports, npm packages, and `import type` for `$lib/*` aliases (type-only
 * imports are stripped at build time and never resolved by esbuild).
 *
 * Semantics (one reminder config per invoice):
 * - A reminder is eligible when the invoice is still unpaid AND `now` is at
 *   least `remindAfterDays` past the invoice due date.
 * - While the invoice stays overdue and unpaid, reminders repeat at most once
 *   every `remindAfterDays` (tracked via `lastSentAt`).
 * - A config whose source invoice has been deleted is deactivated (mirrors the
 *   recurring engine's orphan handling). Paid invoices are skipped but left
 *   active so a reversed/reopened payment resumes reminders.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

interface ReminderRow {
	id: string;
	userId: string;
	invoiceId: string;
	recipientEmail: string;
	remindAfterDays: number;
	lastSentAt: Date | null;
}

/**
 * Decide whether a reminder should be sent for an invoice now.
 * Exported for unit reasoning/testing of the cadence rules.
 */
export function isReminderDue(
	invoice: Pick<InvoiceData, 'paid' | 'dueDate'>,
	remindAfterDays: number,
	lastSentAt: Date | null,
	now: Date
): boolean {
	if (invoice.paid) return false;

	const dueMs = Date.parse(invoice.dueDate);
	if (Number.isNaN(dueMs)) return false;

	const days = Number.isFinite(remindAfterDays) ? Math.max(0, remindAfterDays) : 0;
	const offsetMs = days * DAY_MS;

	// Not yet past the due date + grace window.
	if (now.getTime() < dueMs + offsetMs) return false;

	// Re-send cadence: wait at least remindAfterDays between reminders.
	if (lastSentAt && now.getTime() < lastSentAt.getTime() + offsetMs) return false;

	return true;
}

/**
 * Find active reminder configs and process each one. Wrapped per-config in
 * try/catch so a single failure never aborts the batch.
 *
 * Returns a small summary useful for logging/observability.
 */
export async function runDueReminders(
	env: CronEnv,
	now: Date = new Date()
): Promise<{ sent: number; failed: number }> {
	const db = drizzle(env.DB);

	const configs = (await db
		.select({
			id: reminderSettings.id,
			userId: reminderSettings.userId,
			invoiceId: reminderSettings.invoiceId,
			recipientEmail: reminderSettings.recipientEmail,
			remindAfterDays: reminderSettings.remindAfterDays,
			lastSentAt: reminderSettings.lastSentAt
		})
		.from(reminderSettings)
		.where(eq(reminderSettings.active, true))
		.all()) as ReminderRow[];

	let sent = 0;
	let failed = 0;

	for (const config of configs) {
		try {
			const didSend = await processReminder(env, db, config, now);
			if (didSend) sent++;
		} catch (err) {
			failed++;
			console.error(`[reminders] Config ${config.id} failed:`, err);
		}
	}

	if (configs.length > 0) {
		console.log(`[reminders] Sent ${sent} reminder(s) across ${configs.length} config(s) (${failed} failed).`);
	}

	return { sent, failed };
}

async function processReminder(
	env: CronEnv,
	db: ReturnType<typeof drizzle>,
	config: ReminderRow,
	now: Date
): Promise<boolean> {
	// Load and verify the invoice still exists for this user.
	const row = await db
		.select({ data: invoices.data })
		.from(invoices)
		.where(and(eq(invoices.id, config.invoiceId), eq(invoices.userId, config.userId)))
		.get();

	if (!row) {
		// Source invoice was deleted - deactivate the orphaned config.
		await db
			.update(reminderSettings)
			.set({ active: false, updatedAt: now })
			.where(eq(reminderSettings.id, config.id));
		console.warn(
			`[reminders] Deactivated config ${config.id}: invoice ${config.invoiceId} not found.`
		);
		return false;
	}

	let invoice: InvoiceData;
	try {
		invoice = JSON.parse(row.data) as InvoiceData;
	} catch {
		throw new Error('Invoice data is corrupted');
	}

	if (!isReminderDue(invoice, config.remindAfterDays, config.lastSentAt, now)) {
		return false;
	}

	if (!env.EMAIL) {
		console.warn(`[reminders] EMAIL binding missing; reminder for invoice ${config.invoiceId} skipped.`);
		return false;
	}

	// Link to the public shared page when an active (non-revoked, unexpired)
	// share link exists; otherwise send a link-free reminder.
	const link = await db
		.select({ token: sharedLinks.token })
		.from(sharedLinks)
		.where(
			and(
				eq(sharedLinks.invoiceId, config.invoiceId),
				eq(sharedLinks.revoked, false),
				gt(sharedLinks.expiresAt, now)
			)
		)
		.orderBy(desc(sharedLinks.createdAt))
		.get();

	const shareUrl = link ? `${APP_ORIGIN}/shared/${link.token}` : null;

	await sendReminderEmail({
		email: env.EMAIL,
		invoice,
		to: config.recipientEmail,
		shareUrl,
		origin: APP_ORIGIN
	});

	// Funnel: an overdue-reminder email was sent by the cron.
	trackEvent(env, 'reminder_sent', { source: 'cron' });

	// Record the send only after a successful email so a failure is retried on
	// the next cron tick rather than silently swallowing the reminder.
	await db
		.update(reminderSettings)
		.set({ lastSentAt: now, updatedAt: now })
		.where(eq(reminderSettings.id, config.id));

	return true;
}
