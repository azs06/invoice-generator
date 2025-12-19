import { createAuth } from '$lib/server/auth';
import { requirePlatform } from '$lib/server/session';
import { toSvelteKitHandler } from 'better-auth/svelte-kit';
import type { RequestHandler } from '@sveltejs/kit';

const handler: RequestHandler = async (event) => {
	const env = requirePlatform(event);
	const auth = createAuth(env);
	return toSvelteKitHandler(auth)(event);
};

export const GET = handler;
export const POST = handler;
