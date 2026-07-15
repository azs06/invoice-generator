import { error, json } from '@sveltejs/kit';
import type { AiModelListType } from '@cloudflare/workers-types';
import {
	AI_INVOICE_MODEL,
	MAX_TEXT_LENGTH,
	MIN_TEXT_LENGTH,
	buildSystemPrompt,
	hasContent,
	parseExtraction,
	sanitizeExtraction
} from '$lib/server/aiInvoice';
import { requirePro } from '$lib/server/entitlements';
import { RATE_LIMITS, checkRateLimit } from '$lib/server/rateLimit';
import { requirePlatform } from '$lib/server/session';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const session = event.locals.session;
	if (!session) {
		throw error(401, 'Unauthorized');
	}

	const env = requirePlatform(event);

	// AI invoice extraction is a Pro feature (no-op until MONETIZATION_ENABLED).
	requirePro(event);

	// Workers AI inference is metered - cap extractions per user per day.
	const rateLimit = await checkRateLimit(env.DB, session.user.id, 'ai-invoice', RATE_LIMITS.aiInvoice);
	if (!rateLimit.allowed) {
		throw error(429, 'Too many requests: daily AI limit reached. Please try again tomorrow.');
	}

	const body = (await event.request.json().catch(() => null)) as { text?: unknown } | null;
	const text = typeof body?.text === 'string' ? body.text.trim() : '';
	if (text.length < MIN_TEXT_LENGTH || text.length > MAX_TEXT_LENGTH) {
		throw error(400, `Please provide between ${MIN_TEXT_LENGTH} and ${MAX_TEXT_LENGTH} characters of text.`);
	}

	// Workers AI needs the `AI` binding, only present in the Cloudflare
	// environment. Mirror /api/pdf: return 503 in plain `npm run dev`.
	if (!env.AI) {
		throw error(
			503,
			'AI invoice extraction is not available in local development. Deploy to Cloudflare (or use npm run dev:cf) to use it.'
		);
	}

	const todayIso = new Date().toISOString().slice(0, 10);

	let rawResponse: string;
	try {
		// Cast to a loose model list: the installed @cloudflare/workers-types
		// predates gemma-4, so its keyed AiModels union rejects the id.
		const ai = env.AI as unknown as import('@cloudflare/workers-types').Ai<AiModelListType>;
		const result = (await ai.run(AI_INVOICE_MODEL, {
			messages: [
				{ role: 'system', content: buildSystemPrompt(todayIso) },
				{ role: 'user', content: text }
			],
			max_tokens: 1024,
			temperature: 0.1
		})) as { response?: unknown };
		rawResponse = typeof result?.response === 'string' ? result.response : '';
	} catch (err) {
		console.error('[ai-invoice] Workers AI call failed:', err);
		throw error(502, 'The AI service could not process this request. Please try again.');
	}

	// Never echo raw model output: parse + sanitize into the trusted schema.
	const extracted = sanitizeExtraction(parseExtraction(rawResponse));

	if (!hasContent(extracted)) {
		throw error(422, 'Could not extract invoice details from that text. Try adding more detail.');
	}

	return json(extracted);
};
