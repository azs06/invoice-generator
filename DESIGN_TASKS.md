# Design Task List

Checklist derived from DESIGN_FEEDBACK.md. Use GitHub checkboxes to track progress.

## Quick Wins
- [ ] Unify date formats across form and preview using locale-aware formatting from the language selector (`src/components/InvoiceFormComponent.svelte`, `src/components/InvoicePreviewComponent.svelte`).
- [ ] Add tooltips and `aria-label`s to floating action buttons (e.g., “Add item”, “Export PDF”) and ensure keyboard focus states (`src/components/IndexComponent.svelte`, `src/components/Header.svelte`).
- [ ] Fix helper text copy and typos for date logic; keep text concise (`src/components/InvoiceFormComponent.svelte`).
- [ ] Make “Saved Invoices” visually interactive (button/link style with icon) (`src/components/Header.svelte`).
- [ ] Replace “UNPAID $0.00” with a neutral empty state when total is zero (`src/components/InvoicePreviewComponent.svelte`).

## Layout & Visual Hierarchy
- [ ] Group form fields into sub-sections: From/To, Dates/Terms, Items/Totals (`src/components/InvoiceFormComponent.svelte`).
- [ ] Reorder preview summary: show Balance Due above status chip; put due date directly under amount (`src/components/InvoicePreviewComponent.svelte`).
- [ ] Add a clear logo upload affordance with accepted formats and size guidance (`src/components/InvoiceFormComponent.svelte`).
- [ ] Add explicit Net terms control (Net 15/30/45/Custom) and wire to due date calculation (`src/components/InvoiceFormComponent.svelte`, `src/lib/InvoiceCalculator.js`).

## Copy & Labels
- [ ] Replace long helper paragraphs with concise labels + inline hints (e.g., Due Date + Net selector) (`src/components/InvoiceFormComponent.svelte`).
- [ ] Ensure nomenclature consistency between form and preview (exact “From/To” labels and casing) (`src/components/InvoiceFormComponent.svelte`, `src/components/InvoicePreviewComponent.svelte`).
- [ ] Add microcopy for invoice number (auto-generated pattern; editable on click) (`src/components/InvoicePreviewComponent.svelte`).

## Accessibility
- [ ] Verify color contrast for the orange “UNPAID” chip and adjust to meet WCAG AA (`app.css`, component styles).
- [ ] Ensure visible focus states on all interactive controls, including icon-only buttons (`app.css`, component styles).
- [ ] Provide descriptive `aria-label`s for icon-only buttons (e.g., Export PDF, Add Item) (`src/components/*`).
- [ ] Enable keyboard-friendly date entry and announce expected format to screen readers (`src/components/InvoiceFormComponent.svelte`).

## Data & Formatting
- [ ] Centralize locale-aware date helpers (new `src/lib/date.js`) and apply consistently to form and preview.
- [ ] Respect selected locale for currency formatting; persist preference via store (`src/lib/currency.js`, settings store if applicable).
- [ ] Show currency code when ambiguous (e.g., `$0.00 USD`) or add a currency selector in settings (`src/components/Header.svelte` or settings component).
- [ ] Add thousand separators and non-breaking space between currency symbol and amount in preview totals (`src/lib/currency.js`, `src/components/InvoicePreviewComponent.svelte`).

## Interactions
- [ ] Add “Mark as paid” quick action; when fully paid, switch chip to PAID and show optional receipt stamp (`src/components/InvoicePreviewComponent.svelte`, `src/components/AmountPaidComponent.svelte`).
- [ ] Replace placeholder em-dashes in preview with friendly empty states (“Add your company”, “Add a client”) (`src/components/InvoicePreviewComponent.svelte`).
- [ ] Make Due Date reactive to Net terms but unlocked on manual edit; show subtle “manual override” indicator (`src/components/InvoiceFormComponent.svelte`).

## Mobile/Responsive
- [ ] Add a sticky summary on small screens (amount + status + export) for quick access (`src/components/InvoicePreviewComponent.svelte` or a mobile footer component).
- [ ] Prevent FAB overlap on mobile; consider a fixed footer with labeled buttons instead of floating icons (`src/components/IndexComponent.svelte`, styles).
- [ ] Verify stacked layout grouping and tap targets for comfort on touch devices (global review of `src/components/*`).

## Future Enhancements
- [ ] Support taxes and discounts (per-line and summary); clarify inclusion/exclusion in totals (`src/components/ItemFormComponent.svelte`, `src/components/SubTotalComponent.svelte`, `src/lib/InvoiceCalculator.js`).
- [ ] Add inline validation for required fields and invalid date ranges; surface near fields and echo critical errors in the preview header (`src/components/*`).
- [ ] Show autosave status near “Saved Invoices” and provide basic undo/redo for recent edits (`src/components/Header.svelte`, `src/lib/db.js`).

## Utilities To Create/Update
- [ ] Create `src/lib/date.js` for `formatDate(value, locale)` and `calcDueDate(invoiceDate, netTerms)`.
- [ ] Extend `src/lib/currency.js` to accept locale + currency code and return formatted strings with grouping and non-breaking spaces.
