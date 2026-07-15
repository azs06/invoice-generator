-- Recurring invoice schedules (Pro; see docs/MONETIZATION.md Phase 3).
--
-- A Workers Cron trigger (see wrangler.toml [triggers]) runs hourly, finds
-- active schedules whose nextRunAt has passed, clones the source invoice into
-- a fresh invoice, emails it to recipientEmail, and advances nextRunAt.
--
-- Apply to the remote D1 database with:
--   npx wrangler d1 execute invoice-db --remote --file=./migrations/0003_recurring_schedules.sql
-- Apply to the local dev database with:
--   npx wrangler d1 execute invoice-db --local --file=./migrations/0003_recurring_schedules.sql
--
-- Table definition lives in src/lib/server/schema.ts (recurringSchedules).
CREATE TABLE IF NOT EXISTS `recurring_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`sourceInvoiceId` text NOT NULL,
	`frequency` text NOT NULL,
	`nextRunAt` integer NOT NULL,
	`lastRunAt` integer,
	`recipientEmail` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
-- Cron scan: active schedules that are due (active = 1 AND nextRunAt <= now).
CREATE INDEX IF NOT EXISTS `recurring_schedules_due_idx` ON `recurring_schedules` (`active`, `nextRunAt`);
--> statement-breakpoint
-- Listing a user's schedules.
CREATE INDEX IF NOT EXISTS `recurring_schedules_userId_idx` ON `recurring_schedules` (`userId`);
