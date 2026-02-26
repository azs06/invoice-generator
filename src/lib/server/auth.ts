import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import { account, session, user, verification } from './schema';

// Only pass auth-related tables to better-auth
const authSchema = { user, session, account, verification };

/**
 * Create a better-auth instance with the given Cloudflare environment.
 *
 * Required secrets (set via wrangler secret put):
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - BETTER_AUTH_SECRET
 */
export const createAuth = (env: Env) =>
	betterAuth({
		database: drizzleAdapter(drizzle(env.DB), {
			provider: 'sqlite',
			schema: authSchema
		}),
		socialProviders: {
			google: {
				clientId: env.GOOGLE_CLIENT_ID,
				clientSecret: env.GOOGLE_CLIENT_SECRET
			}
		},
		secret: env.BETTER_AUTH_SECRET,
		trustedOrigins: [
			'https://freeinvoice.info',
			'https://www.freeinvoice.info',
			// Add localhost for development
			'http://localhost:5173',
			'http://localhost:4173'
		]
	});
