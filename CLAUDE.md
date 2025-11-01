# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a SvelteKit 2.x invoice generator application using Svelte 5 with runes ($state, $effect, $props). The app runs entirely in the browser with client-side storage via IndexedDB.

## Tech Stack

- **Framework**: SvelteKit 2.16+ with Svelte 5.0+
- **Styling**: Tailwind CSS 4.1+
- **Storage**: IndexedDB via `idb-keyval` (client-side only, no backend)
- **PDF Generation**: html2pdf.js
- **Deployment**: Cloudflare Pages (adapter-cloudflare)

## Development Commands

```bash
npm run dev              # Start dev server
npm run dev -- --open    # Start dev server and open browser
npm run build            # Production build
npm run preview          # Preview production build
npm run check            # Type check with svelte-check
npm run check:watch      # Watch mode type checking
npm run format           # Format with Prettier
npm run lint             # Check formatting with Prettier
```

## Architecture

### Data Flow

1. **State Management**: The main invoice state lives in `src/routes/+page.svelte` using Svelte 5's `$state` rune
2. **Auto-save**: `$effect` reactive statement automatically saves invoice to IndexedDB whenever state changes
3. **Calculations**: Pure functions in `src/lib/InvoiceCalculator.js` handle tax, discount, and totals
4. **Storage**: `src/lib/db.js` provides IndexedDB operations with `idb-keyval`

### Invoice Object Structure

```javascript
{
  id: string (UUID),
  invoiceNumber: string,
  logo: File | string (data URL) | null,
  logoFilename: string | null,
  invoiceFrom: string,
  invoiceTo: string,
  date: string (ISO date),
  dueDate: string (ISO date),
  items: Array<{ name, quantity, price, amount }>,
  amountPaid: number,
  terms: string,
  notes: string,
  discount: { type: 'flat' | 'percent', rate: number },
  tax: { type: 'flat' | 'percent', rate: number },
  shipping: { amount: number },
  paid: boolean,
  archived: boolean,
  total: number,
  subTotal: number,
  balanceDue: number
}
```

### Component Structure

- **Main Page** (`src/routes/+page.svelte`): Manages invoice state, auto-save, and PDF export
- **Form Components**: Handle user input and validation
  - `InvoiceFormComponent.svelte`: Main form container
  - `ItemFormComponent.svelte` & `ItemInputComponent.svelte`: Line item management
  - `TotalComponent.svelte`: Tax, discount, shipping inputs
  - `TermsAndNotesComponent.svelte`: Additional text fields
  - `AmountPaidComponent.svelte`: Payment tracking
  - `FilePreviewComponent.svelte`: Logo upload handling
- **Preview Component** (`InvoicePreviewComponent.svelte`): Renders invoice for display and PDF export
- **Routing**:
  - `/` - Main invoice editor
  - `/saved-invoices` - List of saved invoices
  - `/invoice/[id]` - View specific invoice

### Storage Handling

- **Logo Files**: Converted to data URLs before storing in IndexedDB (File objects can't be serialized)
- **Svelte Proxies**: All state is serialized via `JSON.parse(JSON.stringify())` to strip Svelte 5 proxy wrappers
- **Key Prefix**: All invoices stored with `ig.invoice.` prefix

### Path Aliases

Configured in `svelte.config.js`:
- `$components` → `src/components`
- `$services` → `src/services`
- `$lib` → `src/lib` (SvelteKit default)

## Svelte 5 Patterns

This codebase uses Svelte 5's new runes syntax:

- `$state()` for reactive state (replaces `let` for reactive variables)
- `$effect()` for side effects (replaces `$:` reactive statements in many cases)
- `$props()` for component props (replaces `export let`)
- `$derived()` for computed values

When modifying components, maintain this runes-based approach.

## PDF Export

The PDF generation in `src/routes/+page.svelte`:
1. Waits for all images (including logo) to load
2. Uses html2pdf.js with specific settings (scale: 3, CORS enabled)
3. Exports the preview component with 0.5in margins on letter-size page

## Deployment

- Uses `@sveltejs/adapter-cloudflare` for Cloudflare Pages
- Static prerendering enabled (`export const prerender = true` in routes)
- Client-side only - no server-side rendering or API routes
