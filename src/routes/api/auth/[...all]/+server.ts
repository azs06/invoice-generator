import { createAuth } from "$lib/server/auth";
import { toSvelteKitHandler } from "better-auth/svelte-kit";
import type { RequestHandler } from "@sveltejs/kit";

const handler: RequestHandler = async (event) => {
    const auth = createAuth(event.platform?.env);
    return toSvelteKitHandler(auth)(event);
}

export const GET = handler;
export const POST = handler;
