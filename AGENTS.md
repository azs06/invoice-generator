# Commands

- `npm run dev`: Start Vite dev server (no Cloudflare bindings)
- `npm run dev:cf`: Build + run Wrangler dev with Cloudflare bindings (D1/R2/Browser)
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run deploy`: Build + deploy to Cloudflare Workers
- `npm run check`: Run type checks
- `npm run check:watch`: Run type checks in watch mode
- `npm run format`: Format with Prettier
- `npm run lint`: Check formatting
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

# Structure

- `src/routes`: Page layouts/actions/endpoints; API routes live under `src/routes/api`
- `src/components`: Reusable UI components (PascalCase files)
- `src/lib`: Domain utilities, helpers, types, auth client, PDF generation, i18n
- `src/lib/server`: Server-only auth/db/session logic (Drizzle + Better Auth)
- `src/lib/templates`: Invoice template registry + template components
- `src/services`: Reserved for service modules (currently empty)
- `src/stores`: Svelte stores for invoice data/page settings/templates
- `static/`: Public assets
- `tests/`: Playwright specs
- `wrangler.toml`: Cloudflare Worker bindings (D1, R2, Browser)
- Run `npm run check` before pushing

# Current Check Status

- `npm run check` currently fails
- Errors:
	- `src/routes/dashboard/+page.svelte`: comma operator used for reactive triggers (line ~99)
- Warnings (high level):
	- A11y click handlers on non-interactive elements in `src/components/Header.svelte`
	- A11y missing labels on icon-only buttons in `src/components/dashboard/InvoiceCardGrid.svelte`,
	  `src/components/dashboard/InvoiceTableView.svelte`, `src/routes/admin/+page.svelte`
	- A11y click handlers on modal overlay/div in `src/routes/admin/+page.svelte`,
	  `src/routes/admin/deleted/+page.svelte`
	- Invalid SSR markup: `ul` inside `p` in `src/routes/admin/deleted/+page.svelte`
	- Unused CSS selectors in `src/routes/shared/[token]/+page.svelte`
	- CSS compatibility note for `appearance` in `src/components/PageSettingsSelector.svelte`
