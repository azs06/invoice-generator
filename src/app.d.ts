// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { Session, User } from 'better-auth';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session: { session: Session; user: User } | null;
			tier: 'pro' | 'free';
		}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env: Env;
			context: {
				waitUntil(promise: Promise<any>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
	}

	/**
	 * Cloudflare Email Sending binding (`send_email` in wrangler.toml).
	 * Optional so plain `npm run dev` (no bindings) can return 503, mirroring
	 * BROWSER. Typed against the object-form send() API documented at
	 * https://developers.cloudflare.com/email-service/ (the installed
	 * @cloudflare/workers-types predates the object form).
	 */
	interface EmailSendAttachment {
		content: string | ArrayBuffer | ArrayBufferView;
		filename: string;
		type?: string;
		disposition?: 'attachment' | 'inline';
		contentId?: string;
	}
	interface EmailSendMessage {
		to: string | string[];
		from: string | { email: string; name?: string };
		replyTo?: string | string[];
		cc?: string | string[];
		bcc?: string | string[];
		subject: string;
		html?: string;
		text?: string;
		attachments?: EmailSendAttachment[];
		headers?: Record<string, string>;
	}
	interface EmailSendBinding {
		send(message: EmailSendMessage): Promise<{ messageId?: string } | void>;
	}

	/**
	 * Cloudflare Worker environment bindings.
	 * Secrets should be set via: wrangler secret put <SECRET_NAME>
	 */
	interface Env {
		// D1 Database
		DB: D1Database;
		// R2 Bucket for PDF storage
		BUCKET: R2Bucket;
		// Browser Rendering for PDF generation
		BROWSER: Fetcher;
		// Workers AI (POST /api/ai/invoice-from-text); absent in plain dev.
		// `Ai` is a global from @cloudflare/workers-types.
		AI: Ai;
		// Cloudflare Email Sending (send_email binding); absent in plain dev
		EMAIL?: EmailSendBinding;
		// Workers Analytics Engine - privacy-friendly funnel/conversion events
		// (analytics_engine_datasets binding in wrangler.toml, dataset
		// `invoice_events`). Optional so plain `npm run dev` (no bindings) no-ops
		// via src/lib/server/analytics.ts. `AnalyticsEngineDataset` is a global
		// from @cloudflare/workers-types.
		METRICS?: AnalyticsEngineDataset;
		// Environment variables (set in wrangler.toml [vars])
		SUPER_ADMIN_EMAILS: string;
		// Pro gating feature flag ("true" | "false"); see docs/MONETIZATION.md
		MONETIZATION_ENABLED: string;
		// Auth secrets (set via wrangler secret put)
		GOOGLE_CLIENT_ID: string;
		GOOGLE_CLIENT_SECRET: string;
		BETTER_AUTH_SECRET: string;
		// Polar billing (set via wrangler secret put); inert until provisioned
		POLAR_ACCESS_TOKEN?: string;
		POLAR_WEBHOOK_SECRET?: string;
		POLAR_SERVER?: string; // 'sandbox' | 'production'
		POLAR_PRODUCT_PRO_MONTHLY?: string;
		POLAR_PRODUCT_PRO_ANNUAL?: string;
		POLAR_PRODUCT_LIFETIME?: string;
	}
}
