-- Rate limit counters for cost-protection on expensive endpoints
-- (PDF generation via Browser Rendering, share-link creation, invoice saves).
--
-- Apply to the remote D1 database with:
--   npx wrangler d1 execute invoice-db --remote --file=./migrations/0001_rate_limits.sql
-- Apply to the local dev database with:
--   npx wrangler d1 execute invoice-db --local --file=./migrations/0001_rate_limits.sql
--
-- Table definition lives in src/lib/server/rateLimitSchema.ts (kept out of
-- src/lib/server/schema.ts intentionally).
CREATE TABLE IF NOT EXISTS `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`windowStart` integer NOT NULL
);
