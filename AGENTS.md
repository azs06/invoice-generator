# Commands

- `npm run dev`: Start Vite dev server (no Cloudflare bindings)
- `npm run dev:cf`: Build + run Wrangler dev with Cloudflare bindings (D1/R2/Browser)
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run deploy`: Build + deploy to Cloudflare Workers
- `npm run check`: Run type checks (svelte-check)
- `npm run check:watch`: Run type checks in watch mode
- `npm run format`: Format with oxfmt + Prettier (Svelte files)
- `npm run format:check`: Check formatting without writing
- `npm run lint`: Lint with oxlint
- `npm run test`: Run Playwright tests
- `npm run test:ui`: Playwright UI mode
- `npm run test:headed`: Playwright headed mode
- Single test: `playwright test <file>` or `playwright test -g "<test-name>"`

# Code Style

- Use tabs (Prettier config), single quotes, 100 char line width
- Component files are PascalCase (e.g., `InvoiceFormComponent.svelte`)
- Identifiers: camelCase, types: PascalCase
- Prefer named exports from `$lib`/`src/lib` barrels
- Import order: external deps → internal modules → relative imports
- No trailing commas (Prettier)
- Strict TypeScript enabled
- Svelte 5 runes only: `$state`/`$derived`/`$effect`/`$props`, `onclick={...}` handlers

# Structure

- `src/routes`: Page layouts/actions/endpoints; API routes live under `src/routes/api`
- `src/components`: Reusable UI components (PascalCase files; `dashboard/` and `mobile/` subfolders)
- `src/lib`: Domain utilities, helpers, types, auth client, PDF generation, i18n
- `src/lib/server`: Server-only auth/db/session logic (Drizzle + Better Auth)
- `src/lib/templates`: Invoice template registry + template components
- `src/lib/stores`: Svelte stores (currency)
- `src/stores`: Svelte stores for invoice data/page settings/templates
- `src/services`: Reserved for service modules (currently empty)
- `static/`: Public assets
- `tests/`: Playwright specs
- `wrangler.toml`: Cloudflare Worker bindings (D1 `DB`, R2 `BUCKET`, Browser Rendering `BROWSER`)
- Run `npm run check` before pushing; keep it green.
- Monetization roadmap: see `docs/MONETIZATION.md`.
