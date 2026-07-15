-- Client address book (Pro; see docs/MONETIZATION.md Phase 3).
--
-- Signed-in users save reusable client contacts (name/email/phone/address/notes)
-- and fill an invoice's "bill to" field from a saved client. Creating a new
-- client is Pro-gated (see src/lib/server/entitlements.ts requirePro); reading
-- and using existing clients is never gated.
--
-- Apply to the remote D1 database with:
--   npx wrangler d1 execute invoice-db --remote --file=./migrations/0004_clients.sql
-- Apply to the local dev database with:
--   npx wrangler d1 execute invoice-db --local --file=./migrations/0004_clients.sql
--
-- Table definition lives in src/lib/server/schema.ts (clients).
CREATE TABLE IF NOT EXISTS `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text,
	`address` text,
	`notes` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
-- Listing a user's clients.
CREATE INDEX IF NOT EXISTS `clients_userId_idx` ON `clients` (`userId`);
