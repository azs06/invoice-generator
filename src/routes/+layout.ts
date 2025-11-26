// Disable SSR for client-side SPA behavior
export const ssr = false;

// Don't prerender by default - we need runtime access to Cloudflare bindings (D1, R2)
// Individual static pages can opt-in to prerendering if needed
export const prerender = false;
