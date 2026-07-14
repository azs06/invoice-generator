-- Subscriptions table for Pro entitlements (Polar billing; see docs/MONETIZATION.md §5A).
--
-- Apply to the remote D1 database with:
--   npx wrangler d1 execute invoice-db --remote --file=./migrations/0002_subscriptions.sql
-- Apply to the local dev database with:
--   npx wrangler d1 execute invoice-db --local --file=./migrations/0002_subscriptions.sql
--
-- Table definition lives in src/lib/server/schema.ts (subscriptions).
CREATE TABLE IF NOT EXISTS `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`provider` text NOT NULL,
	`providerCustomerId` text,
	`providerSubscriptionId` text,
	`plan` text NOT NULL,
	`status` text NOT NULL,
	`currentPeriodEnd` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `subscriptions_userId_unique` ON `subscriptions` (`userId`);
