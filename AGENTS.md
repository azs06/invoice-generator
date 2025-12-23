# Commands

- `npm run dev`: Start dev server
- `npm run build`: Build for production
- `npm run check`: Run type checks
- `npm run format`: Format with Prettier
- `npm run lint`: Check formatting
- `npm run test`: Run Playwright tests
- `npm run test:ui`: Playwright UI mode
- Single test: `playwright test <file>` or `playwright test -g "<test-name>"`

# Code Style

- Use tabs (Prettier config), single quotes, 100 char line width
- Component files: kebab-case (e.g., `invoice-form.svelte`)
- Identifiers: camelCase, types: PascalCase
- Prefer named exports from `src/lib` barrels
- Import order: external deps → internal modules → relative imports
- No trailing commas (Prettier)
- Strict TypeScript enabled

# Structure

- `src/routes`: Page layouts/actions; keep data logic in `$lib`
- `src/components`: Reusable UI components
- `src/lib`: Domain utilities, helpers, types
- `static/`: Public assets
- Run `npm run check` before pushing
