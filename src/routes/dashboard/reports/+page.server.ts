import { redirect } from '@sveltejs/kit';
import { currencies, type CurrencyCode } from '$lib/stores/currency';
import { getAllInvoices, getUserSettings } from '$lib/server/db';
import { requirePro } from '$lib/server/entitlements';
import { requireDB } from '$lib/server/session';
import type { InvoiceData } from '$lib/types';
import type { PageServerLoad } from './$types';

/** How many top clients to surface per currency. */
const TOP_CLIENTS = 8;

export interface MonthlyRevenue {
	/** `YYYY-MM` bucket key. */
	key: string;
	/** Full year, e.g. 2026 (client formats the label with Intl). */
	year: number;
	/** 0-based month index (0 = January). */
	month: number;
	total: number;
}

export interface OutstandingSummary {
	notDue: number;
	notDueCount: number;
	overdue: number;
	overdueCount: number;
	total: number;
	count: number;
}

export interface ClientSummary {
	name: string;
	paid: number;
	outstanding: number;
}

export interface CurrencyReport {
	code: string;
	symbol: string;
	monthly: MonthlyRevenue[];
	revenueTotal: number;
	outstanding: OutstandingSummary;
	clients: ClientSummary[];
}

/** Coerce an unknown numeric field to a finite number, defaulting to 0. */
function toNumber(value: unknown): number {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
}

/**
 * The stored invoice JSON does not carry a currency (currency is an
 * app/user-level setting), but read it defensively in case a record does,
 * then fall back to the user's preferred currency.
 */
function currencyOf(invoice: InvoiceData, fallback: string): string {
	const raw = (invoice as unknown as { currency?: unknown }).currency;
	if (typeof raw === 'string' && raw.trim()) return raw.trim().toUpperCase();
	return fallback;
}

/** Client identity: first non-empty line of the bill-to field, by convention. */
function clientNameOf(invoice: InvoiceData): string {
	const to = typeof invoice.invoiceTo === 'string' ? invoice.invoiceTo : '';
	for (const line of to.split('\n')) {
		const trimmed = line.trim();
		if (trimmed) return trimmed;
	}
	return '';
}

interface CurrencyAccumulator {
	monthly: Map<string, number>;
	revenueTotal: number;
	outstanding: OutstandingSummary;
	clients: Map<string, { paid: number; outstanding: number }>;
}

function emptyAccumulator(): CurrencyAccumulator {
	return {
		monthly: new Map(),
		revenueTotal: 0,
		outstanding: { notDue: 0, notDueCount: 0, overdue: 0, overdueCount: 0, total: 0, count: 0 },
		clients: new Map()
	};
}

/**
 * Build the last-12-months window (oldest first) as `YYYY-MM` keys anchored to
 * `now`. Revenue buckets are keyed off the invoice issue date.
 */
function buildMonthWindow(now: Date): { key: string; year: number; month: number }[] {
	const window: { key: string; year: number; month: number }[] = [];
	const anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
	for (let i = 11; i >= 0; i--) {
		const d = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - i, 1));
		const year = d.getUTCFullYear();
		const month = d.getUTCMonth();
		window.push({ key: `${year}-${String(month + 1).padStart(2, '0')}`, year, month });
	}
	return window;
}

export const load: PageServerLoad = async (event) => {
	const session = event.locals.session;
	if (!session) {
		throw redirect(302, '/');
	}

	// Reports is a Pro feature. No-op while monetization is dark-launched.
	requirePro(event);

	const db = requireDB(event);

	const [records, settings] = await Promise.all([
		getAllInvoices(db, session.user.id),
		getUserSettings(db, session.user.id)
	]);

	const fallbackCurrency = (settings?.preferredCurrency as string) || 'USD';
	const now = new Date();
	const monthWindow = buildMonthWindow(now);
	const windowKeys = new Set(monthWindow.map((m) => m.key));
	const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

	const byCurrency = new Map<string, CurrencyAccumulator>();
	const getAcc = (code: string): CurrencyAccumulator => {
		let acc = byCurrency.get(code);
		if (!acc) {
			acc = emptyAccumulator();
			byCurrency.set(code, acc);
		}
		return acc;
	};

	for (const record of records) {
		// Defensively skip anything that isn't a usable invoice object.
		const invoice = record?.invoice;
		if (!invoice || typeof invoice !== 'object') continue;
		// Drafts and archived invoices are not real issued invoices — exclude.
		if (invoice.draft || invoice.archived) continue;

		const code = currencyOf(invoice, fallbackCurrency);
		const acc = getAcc(code);
		const total = toNumber(invoice.total);
		const client = clientNameOf(invoice);

		if (invoice.paid) {
			// Revenue: paid invoices bucketed by issue-date month (last 12 months).
			const issueMs = Date.parse(invoice.date);
			if (!Number.isNaN(issueMs)) {
				const d = new Date(issueMs);
				const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
				if (windowKeys.has(key)) {
					acc.monthly.set(key, (acc.monthly.get(key) ?? 0) + total);
					acc.revenueTotal += total;
				}
			}
			if (client) {
				const entry = acc.clients.get(client) ?? { paid: 0, outstanding: 0 };
				entry.paid += total;
				acc.clients.set(client, entry);
			}
		} else {
			// Outstanding: unpaid balance, split not-yet-due vs overdue by due date.
			const balanceRaw = Number(invoice.balanceDue);
			const balance = Number.isFinite(balanceRaw) ? balanceRaw : total;
			const dueMs = Date.parse(invoice.dueDate);
			const isOverdue = !Number.isNaN(dueMs) && dueMs < todayMs;

			acc.outstanding.total += balance;
			acc.outstanding.count += 1;
			if (isOverdue) {
				acc.outstanding.overdue += balance;
				acc.outstanding.overdueCount += 1;
			} else {
				acc.outstanding.notDue += balance;
				acc.outstanding.notDueCount += 1;
			}
			if (client) {
				const entry = acc.clients.get(client) ?? { paid: 0, outstanding: 0 };
				entry.outstanding += balance;
				acc.clients.set(client, entry);
			}
		}
	}

	const reports: CurrencyReport[] = [...byCurrency.entries()]
		.map(([code, acc]) => {
			const info = currencies[code as CurrencyCode];
			const monthly: MonthlyRevenue[] = monthWindow.map((m) => ({
				key: m.key,
				year: m.year,
				month: m.month,
				total: acc.monthly.get(m.key) ?? 0
			}));
			const clients: ClientSummary[] = [...acc.clients.entries()]
				.map(([name, v]) => ({ name, paid: v.paid, outstanding: v.outstanding }))
				.sort((a, b) => b.paid - a.paid || b.outstanding - a.outstanding)
				.slice(0, TOP_CLIENTS);

			return {
				code,
				symbol: info?.symbol ?? code,
				monthly,
				revenueTotal: acc.revenueTotal,
				outstanding: acc.outstanding,
				clients
			};
		})
		// Show the busiest currency first.
		.sort((a, b) => b.revenueTotal + b.outstanding.total - (a.revenueTotal + a.outstanding.total));

	return {
		reports,
		hasData: reports.length > 0
	};
};
