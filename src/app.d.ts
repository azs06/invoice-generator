// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { Session, User } from 'better-auth';

// Web Speech API types (not included in lib.dom.d.ts by default)
interface SpeechRecognitionEvent extends Event {
	results: SpeechRecognitionResultList;
	resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
	error: string;
	message: string;
}

interface SpeechRecognition extends EventTarget {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	onresult: ((event: SpeechRecognitionEvent) => void) | null;
	onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
	onend: (() => void) | null;
	start(): void;
	stop(): void;
	abort(): void;
}

interface SpeechRecognitionConstructor {
	new (): SpeechRecognition;
}

declare global {
	interface Window {
		SpeechRecognition?: SpeechRecognitionConstructor;
		webkitSpeechRecognition?: SpeechRecognitionConstructor;
	}

	namespace App {
		// interface Error {}
		interface Locals {
			session: { session: Session; user: User } | null;
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
		// Cloudflare Workers AI
		AI: Ai;
		// Environment variables (set in wrangler.toml [vars])
		PDF_GENERATION_URL: string;
		SUPER_ADMIN_EMAILS: string;
		// PDF Microservice API Key (set via wrangler secret put)
		PDF_MICROSERVICE_API_KEY: string;
		// Auth secrets (set via wrangler secret put)
		GOOGLE_CLIENT_ID: string;
		GOOGLE_CLIENT_SECRET: string;
		BETTER_AUTH_SECRET: string;
	}
}

export {};
