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
