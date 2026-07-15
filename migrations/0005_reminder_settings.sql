-- Overdue invoice reminders (Pro; see docs/MONETIZATION.md Phase 3).
--
-- A Workers Cron trigger (see wrangler.toml [triggers]) runs hourly, finds
-- active reminder configs whose invoice is past its due date + remindAfterDays
-- and still unpaid, emails the recipient a reminder, and records lastSentAt.
-- While the invoice stays overdue and unpaid, reminders repeat at most once
-- every remindAfterDays. Configs whose source invoice is gone are deactivated.
--
-- Apply to the remote D1 database with:
--   npx wrangler d1 execute invoice-db --remote --file=./migrations/0005_reminder_settings.sql
-- Apply to the local dev database with:
--   npx wrangler d1 execute invoice-db --local --file=./migrations/0005_reminder_settings.sql
--
-- Table definition lives in src/lib/server/schema.ts (reminderSettings).
CREATE TABLE IF NOT EXISTS `reminder_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`invoiceId` text NOT NULL,
	`recipientEmail` text NOT NULL,
	`remindAfterDays` integer DEFAULT 3 NOT NULL,
	`lastSentAt` integer,
	`active` integer DEFAULT true NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
-- Cron scan: active reminder configs (active = 1).
CREATE INDEX IF NOT EXISTS `reminder_settings_active_idx` ON `reminder_settings` (`active`);
--> statement-breakpoint
-- Listing a user's reminders and enforcing one config per invoice per user.
CREATE UNIQUE INDEX IF NOT EXISTS `reminder_settings_user_invoice_idx` ON `reminder_settings` (`userId`, `invoiceId`);
