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
