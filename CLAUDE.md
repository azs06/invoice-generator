# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a SvelteKit 2.x invoice generator application using Svelte 5 with runes ($state, $effect, $props). The app runs entirely in the browser with client-side storage via IndexedDB.

## Tech Stack

- **Framework**: SvelteKit 2.16+ with Svelte 5.0+
- **Styling**: Tailwind CSS 4.1+
- **Storage**: IndexedDB via `idb-keyval` (client-side only, no backend)
- **PDF Generation**: html2pdf.js
- **Internationalization**: svelte-i18n (English and Bengali support)
- **Utilities**: uuid (ID generation), dotenv (config)
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
5. **Stores**: Svelte stores in `src/lib/stores/` and `src/stores/` manage global state for:
   - Currency selection (`currency.js`)
   - Template selection (`templateStore.js`)
   - Theme/dark mode (`$lib/theme.js`)
   - Invoice state (`invoiceStore.js`)

### Invoice Object Structure

```javascript
{
  id: string (UUID),
  invoiceLabel: string (default: 'INVOICE', customizable title),
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
  draft: boolean,
  draftName: string,
  total: number,
  subTotal: number,
  balanceDue: number,
  templateId: string (default: 'modern')
}
```

### Component Structure

- **Main Page** (`src/routes/+page.svelte`): Manages invoice state, auto-save, PDF export, and tab navigation (edit/preview)
- **Layout Components**:
  - `Header.svelte`: Top navigation with logo and links
  - `AppFooter.svelte` & `FooterComponent.svelte`: Footer with social links and info
  - `ThemeToggle.svelte`: Dark/light mode switcher
  - `LanguageSelector.svelte`: i18n language picker (English/Bengali)
  - `CurrencySelector.svelte`: Currency selection (8 currencies supported)
- **Form Components**: Handle user input and validation
  - `InvoiceFormComponent.svelte`: Main form container
  - `ItemFormComponent.svelte` & `ItemInputComponent.svelte`: Line item management
  - `TotalComponent.svelte`: Tax, discount, shipping inputs
  - `SubTotalComponent.svelte`: Subtotal display
  - `TermsAndNotesComponent.svelte`: Additional text fields
  - `AmountPaidComponent.svelte`: Payment tracking
  - `AdditionalPaymentsComponent.svelte`: Additional payment entries
  - `FilePreviewComponent.svelte`: Logo upload handling
- **Preview Components**:
  - `InvoicePreviewWrapper.svelte`: Wrapper for template rendering
  - `InvoicePreviewComponent.svelte`: Legacy preview component
  - `TemplateSelector.svelte`: Template picker UI
- **Template System** (`src/lib/templates/`):
  - Template registry in `registry.js` with metadata and dynamic imports
  - Four templates: Modern, Classic, Minimal, Atlantic
  - Template components in `components/` directory
  - Migration system in `migration.js` for template updates
- **Utility Components**:
  - `ModalComponent.svelte`: Reusable modal dialog
  - `SEOContent.svelte`: SEO-friendly content sections
  - `IndexComponent.svelte`: Main index/landing page content
- **Routing**:
  - `/` - Main invoice editor with edit/preview tabs
  - `/saved-invoices` - List of saved invoices
  - `/invoice/[id]` - View specific invoice
  - `/about` - About page
  - `/features` - Features page
  - `/how-it-works` - How it works page

### Storage Handling

- **Logo Files**: Converted to data URLs before storing in IndexedDB (File objects can't be serialized)
- **Svelte Proxies**: All state is serialized via `JSON.parse(JSON.stringify())` to strip Svelte 5 proxy wrappers
- **Key Prefixes**:
  - Invoices: `ig.invoice.` prefix
  - Currency preference: `ig.currency` in localStorage
  - Theme preference: `theme` in localStorage
- **Template ID**: Stored with each invoice for consistent rendering

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

## Features

### Internationalization (i18n)

- **Implementation**: `svelte-i18n` library with JSON locale files
- **Setup**: `src/lib/i18n/setup.js` configures available locales
- **Locales**: English (`en.json`) and Bengali (`bn.json`)
- **Auto-detection**: Falls back to browser language preference
- **Usage**: Import `_` from 'svelte-i18n' and use `$_('key')` syntax

### Currency Support

- **Store**: `src/lib/stores/currency.js` manages currency state
- **Supported Currencies**: USD, EUR, GBP, JPY, INR, BDT, CAD, AUD
- **Formatting**: `src/lib/currency.js` provides derived stores for formatting
  - `formatCurrency`: Format numbers as currency strings
  - `currencySymbol`: Current currency symbol
  - `currencyFormatter`: Intl.NumberFormat instance
- **Persistence**: Selected currency saved to localStorage

### Template System

- **Registry**: `src/lib/templates/registry.js` manages available templates
- **Templates**:
  - **Modern**: Clean, contemporary design (default)
  - **Classic**: Traditional, formal business layout
  - **Minimal**: Simple, focused design
  - **Atlantic**: Editorial serif with warm palette
- **Template Components**: Located in `src/lib/templates/components/`
- **Dynamic Loading**: Templates lazy-loaded via dynamic imports
- **Migration**: `migration.js` handles template version updates
- **Metadata**: Each template has name, description, tags, preview image

### Theme Support

- **Dark Mode**: Toggle between light and dark themes
- **Store**: `src/lib/theme.js` with `theme` writable store
- **System Integration**: Respects `prefers-color-scheme` media query
- **Persistence**: Theme preference saved to localStorage
- **DOM Updates**: Automatically adds/removes `dark` class on `<html>`

### Mobile-Responsive Design

- **Tab-Based UI**: Edit and Preview tabs for mobile view
- **URL Hash Navigation**: Tabs sync with `#edit` / `#preview` URL hash
- **Responsive Components**: All components adapt to screen size
- **Touch-Friendly**: Optimized for touch interactions

### Draft System

- **Draft Flag**: Invoices can be marked as drafts
- **Draft Names**: Custom names for organizing draft invoices
- **State Management**: Draft status persisted in IndexedDB

## Deployment

- Uses `@sveltejs/adapter-cloudflare` for Cloudflare Pages
- Static prerendering enabled (`export const prerender = true` in routes)
- Client-side only - no server-side rendering or API routes
- Multiple adapter options available: auto, static, node, cloudflare
