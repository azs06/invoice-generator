import { error } from '@sveltejs/kit';
import { getInvoice } from '$lib/server/db';
import { requireDB } from '$lib/server/session';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const session = event.locals.session;

	// Optional: redirect to login if not authenticated?
	// Or allow public access if shared? For now, let's assume private.
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const db = requireDB(event);
	const invoice = await getInvoice(db, event.params.id, session.user.id);
	if (!invoice) {
		throw error(404, 'Invoice not found');
	}

	return {
		invoice,
		user: session.user
	};
};
