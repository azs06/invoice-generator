// Worker entry wrapper (wrangler.toml `main`).
//
// @sveltejs/adapter-cloudflare only emits a `fetch` handler. To also run the
// recurring-invoices Cron trigger we wrap the adapter's generated worker:
// re-export all of its handlers (currently just `fetch`) and add `scheduled`.
//
// The adapter is pointed at wrangler.build.toml (see svelte.config.js), so it
// emits its worker to `.svelte-kit/cloudflare/_worker.js` — the path imported
// below — rather than overwriting this file.
//
// wrangler bundles this file with esbuild (not Vite), so the recurring engine
// and everything it imports must avoid Vite-only runtime aliases ($lib as a
// value import, $app/*, $components). See src/lib/server/recurring.ts.
import worker from './.svelte-kit/cloudflare/_worker.js';
import { runDueSchedules } from './src/lib/server/recurring';
import { runDueReminders } from './src/lib/server/reminders';

export default {
	...worker,
	/**
	 * Cron trigger handler (see wrangler.toml [triggers]). Runs hourly:
	 * generates + emails due recurring invoices, then emails overdue-invoice
	 * reminders. Each engine is independent so one failing never blocks the other.
	 * @param {ScheduledController} _event
	 * @param {import('./src/lib/server/recurring').CronEnv} env
	 * @param {ExecutionContext} ctx
	 */
	async scheduled(_event, env, ctx) {
		ctx.waitUntil(
			runDueSchedules(env).catch((err) => {
				console.error('[cron] runDueSchedules crashed:', err);
			})
		);
		ctx.waitUntil(
			runDueReminders(env).catch((err) => {
				console.error('[cron] runDueReminders crashed:', err);
			})
		);
	}
};
