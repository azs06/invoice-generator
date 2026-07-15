import type { D1Database } from '@cloudflare/workers-types';

export interface RateLimitConfig {
	limit: number;
	windowSeconds: number;
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
}

/**
 * Tunable per-action limits for expensive endpoints.
 */
export const RATE_LIMITS = {
	/** Browser Rendering is billed per use - cap PDF generations per user. */
	pdfGeneration: { limit: 20, windowSeconds: 60 * 60 } satisfies RateLimitConfig,
	/**
	 * Monthly ceiling on top of the hourly PDF cap. The hourly cap alone
	 * allows 14,400 renders/mo, whose Browser Rendering cost can exceed a
	 * Pro subscription's net revenue (docs/COST_ANALYSIS.md). 250/mo caps
	 * worst-case exposure at ~$0.30-0.40 while staying ~10x real usage.
	 */
	pdfGenerationMonthly: { limit: 250, windowSeconds: 30 * 24 * 60 * 60 } satisfies RateLimitConfig,
	/** Share-link creation writes to D1 - cap per user per day. */
	shareLinkCreate: { limit: 30, windowSeconds: 24 * 60 * 60 } satisfies RateLimitConfig,
	/** Invoice saves write to D1 (and R2 for logos) - cap per user per hour. */
	invoiceSave: { limit: 100, windowSeconds: 60 * 60 } satisfies RateLimitConfig,
	/** Email delivery is metered (Cloudflare Email Sending) - cap per user per day. */
	emailSend: { limit: 20, windowSeconds: 24 * 60 * 60 } satisfies RateLimitConfig,
	/** Workers AI inference is metered - cap "AI invoice from text" per user per day. */
	aiInvoice: { limit: 30, windowSeconds: 24 * 60 * 60 } satisfies RateLimitConfig
} as const;

/**
 * Fixed-window rate limiter backed by D1 (table: rate_limits, see
 * src/lib/server/rateLimitSchema.ts and migrations/0001_rate_limits.sql).
 *
 * Increments the counter for the current window atomically via
 * INSERT ... ON CONFLICT DO UPDATE ... RETURNING, then compares to the limit.
 *
 * Fails open (allows the request) if the DB binding is unavailable or the
 * query fails (e.g. local dev without Cloudflare bindings or before the
 * migration has been applied), logging a warning instead of blocking.
 */
export async function checkRateLimit(
	db: D1Database | undefined,
	userId: string,
	action: string,
	{ limit, windowSeconds }: RateLimitConfig
): Promise<RateLimitResult> {
	if (!db) {
		console.warn(`[rateLimit] DB binding missing - failing open for ${action}`);
		return { allowed: true, remaining: limit };
	}

	const nowSeconds = Math.floor(Date.now() / 1000);
	const windowStart = nowSeconds - (nowSeconds % windowSeconds);
	const key = `${userId}:${action}:${windowStart}`;

	try {
		const row = await db
			.prepare(
				`INSERT INTO rate_limits (key, count, windowStart) VALUES (?1, 1, ?2)
				 ON CONFLICT(key) DO UPDATE SET count = count + 1
				 RETURNING count`
			)
			.bind(key, windowStart)
			.first<{ count: number }>();

		const count = row?.count ?? 1;
		return {
			allowed: count <= limit,
			remaining: Math.max(0, limit - count)
		};
	} catch (err) {
		console.warn(`[rateLimit] Failed to check rate limit for ${action} - failing open:`, err);
		return { allowed: true, remaining: limit };
	}
}
