import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter({
			// Build-time config: tells the adapter to emit the generated worker to
			// .svelte-kit/cloudflare/_worker.js (NOT to wrangler.toml's `main`, which
			// is our wrapper worker.js that adds the Cron scheduled handler).
			config: 'wrangler.build.toml',
			platformProxy: {
				// Dev/emulate bindings come from the real deploy config.
				configPath: 'wrangler.toml',
				persist: '.wrangler/state'
			}
		}),
		alias: {
			$components: 'src/components',
			$services: 'src/services'
		}
	}
};

export default config;
