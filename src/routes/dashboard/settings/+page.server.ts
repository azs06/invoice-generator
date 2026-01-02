import { redirect } from '@sveltejs/kit';
import { getUserSettings } from '$lib/server/db';
import { requireDB } from '$lib/server/session';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const session = event.locals.session;

	if (!session) {
		redirect(302, '/');
	}

	const db = requireDB(event);
	const settings = await getUserSettings(db, session.user.id);

	return {
		user: {
			name: session.user.name,
			email: session.user.email,
			image: session.user.image
		},
		settings: settings ?? {
			invoicePrefix: 'INV-',
			preferredCurrency: 'USD'
		}
	};
};
