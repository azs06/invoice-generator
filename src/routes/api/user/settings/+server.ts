import { json } from '@sveltejs/kit';
import { getUserSettings, upsertUserSettings } from '$lib/server/db';
import { requireDB } from '$lib/server/session';
import type { RequestHandler } from './$types';

const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'INR', 'BDT', 'CAD', 'AUD'];

export const GET: RequestHandler = async (event) => {
	const session = event.locals.session;

	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const db = requireDB(event);

	try {
		const settings = await getUserSettings(db, session.user.id);
		return json(
			settings ?? {
				invoicePrefix: 'INV-',
				preferredCurrency: 'USD'
			}
		);
	} catch (error) {
		console.error('Failed to get user settings:', error);
		return json({ error: 'Failed to get settings' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async (event) => {
	const session = event.locals.session;

	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const db = requireDB(event);

	try {
		const { invoicePrefix, preferredCurrency } = await event.request.json();

		// Validate invoice prefix
		if (invoicePrefix !== undefined) {
			if (typeof invoicePrefix !== 'string' || !/^[A-Za-z0-9-]{1,10}$/.test(invoicePrefix)) {
				return json(
					{ error: 'Invalid invoice prefix. Must be 1-10 alphanumeric characters or dashes.' },
					{ status: 400 }
				);
			}
		}

		// Validate currency
		if (preferredCurrency !== undefined) {
			if (!VALID_CURRENCIES.includes(preferredCurrency)) {
				return json({ error: 'Invalid currency code' }, { status: 400 });
			}
		}

		await upsertUserSettings(db, session.user.id, {
			...(invoicePrefix !== undefined && { invoicePrefix }),
			...(preferredCurrency !== undefined && { preferredCurrency })
		});

		return json({ success: true });
	} catch (error) {
		console.error('Failed to save user settings:', error);
		return json({ error: 'Failed to save settings' }, { status: 500 });
	}
};
