import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseInvoiceFromText, isAIAvailable } from '$lib/server/ai';

export const POST: RequestHandler = async (event) => {
	// Check authentication
	const session = event.locals.session;
	if (!session) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	// Check AI availability
	if (!isAIAvailable(event.platform)) {
		return json({ success: false, error: 'AI service is not available' }, { status: 503 });
	}

	try {
		const body = await event.request.json();
		const { message } = body as { message?: string };

		if (!message || typeof message !== 'string' || message.trim().length === 0) {
			return json({ success: false, error: 'Message is required' }, { status: 400 });
		}

		if (message.length > 2000) {
			return json(
				{ success: false, error: 'Message is too long (max 2000 characters)' },
				{ status: 400 }
			);
		}

		const ai = event.platform!.env.AI;
		const result = await parseInvoiceFromText(ai, message.trim());

		if (!result.success) {
			return json({ success: false, error: result.error }, { status: 400 });
		}

		return json({ success: true, data: result.data });
	} catch (error) {
		console.error('Parse invoice API error:', error);
		return json({ success: false, error: 'Failed to process request' }, { status: 500 });
	}
};
