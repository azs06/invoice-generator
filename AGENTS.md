# Repository Guidelines

## Project Structure & Module Organization

- `src/routes`: Page layouts, actions, and loaders; keep data shaping in `$lib` helpers.
- `src/components` and `src/lib`: Reusable UI building blocks and domain utilities grouped by feature.
- `src/services` and `src/stores`: Browser integrations (e.g., `html2pdf.js`, `idb-keyval`) and shared Svelte stores.
- `static/`: Public assets served verbatim; `build/`: throwaway output from `npm run build` or deployment.

## Build, Test, and Development Commands

- `npm run dev`: Start the Vite dev server with HMR.
- `npm run build`: Generate the production bundle in `build/`.
- `npm run preview`: Smoke-test the built bundle locally.
- `npm run check`: Run `svelte-kit sync` + `svelte-check` for type and template validation.
- `npm run format` / `npm run lint`: Apply or verify the shared Prettier configuration (includes Svelte support).
- `npm run deploy`: Run the Node deploy target with `.env` applied via `dotenv`.

## Coding Style & Naming Conventions

- Default to two-space indentation, kebab-case component filenames (`invoice-summary.svelte`), and camelCase identifiers.
- Prefer named exports from `src/lib` barrels; keep module APIs minimal and typed.
- Run the formatter before committing; Prettier defines whitespace, quote style, and import order.

## Testing Guidelines

- Passing `npm run check` is the minimum gate before pushing.
- Automated tests are not yet provisioned; if you add them, colocate `*.spec.ts` files with the features they cover and document the runner in your PR.
- Manually exercise invoice creation, editing, and PDF export on desktop and mobile; note findings in the PR checklist.
- No coverage target exists—attach screenshots, recordings, or logs that prove the change when applicable.

## Commit & Pull Request Guidelines

- Match existing history: short, imperative subjects under ~60 characters (e.g., `add logo`, `update to svelte 5`).
- Group related work into focused commits; avoid churn-only diffs.
- PRs must link issues, summarize functional changes, list validation steps, and include UI evidence for visible updates.
- Call out configuration or environment changes (new `.env` keys or adapters) in the description before requesting review.

## Configuration & Deployment Notes

- Keep secrets in project-local `.env` files (ignored by git) and load them through the provided scripts.
- Tailwind tokens come from the Vite plugin; extend them centrally rather than scattering ad-hoc colors.
- Treat `build/` as ephemeral output—clean it locally and rely on `npm run build` in CI/CD.

## Multi-Template System (updated 2025-11-03)

- Registry-driven templates live in `src/lib/templates/`.
  - Components: `src/lib/templates/components/{Modern,Classic,Minimal,Atlantic}Template.svelte`
  - Registry: `src/lib/templates/registry.js` (ids: `modern` [default], `classic`, `minimal`, `atlantic`)
  - Docs: `src/lib/templates/README.md`
- Runtime selection
  - UI selector: `src/components/TemplateSelector.svelte`
  - Store: `src/stores/templateStore.js` exports `TEMPLATE_OPTIONS`, `selectedTemplateId`, `setTemplateId`
  - Loader: `src/components/InvoicePreviewWrapper.svelte` dynamically imports the selected component via `getTemplate()` and falls back to `modern` on error; totals are computed there.
  - Persistence: `src/lib/db.js` saves `templateId` with fallback to `modern`.
- Adding a template
  1) Create `src/lib/templates/components/MyTemplate.svelte` (accepts `{ invoice, totals }`, uses i18n keys and `$lib/currency`), include print styles.
  2) Register in `registry.js` with `{ id, name, description, component: () => import('./components/MyTemplate.svelte'), tags, premium, preview }`.
  3) Optional preview image at `static/templates/<id>-preview.png`.
- Notes
  - Premium flag surfaces as “(PRO)” in the selector; access control is UI-only unless enforced elsewhere.
  - i18n strings used by templates are under `src/lib/i18n/{en,bn}.json` (`status.*`, `summary.*`, etc.).
