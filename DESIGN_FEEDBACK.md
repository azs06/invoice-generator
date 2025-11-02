# UI Design Feedback

A concise, actionable list based on the current FreeInvoice.info layout (edit pane left, preview right).

## What Works
- Clear two‑column model: edit on left, live preview on right.
- Strong hierarchy: section label, title, helper text, and generous spacing.
- Status chip and balance summary surface the financial state quickly.
- Language and theme controls are easily discoverable.
- ✅ From/To alignment fixed: now uses flexbox with `space-between` for proper edge alignment.
- ✅ "Saved Invoices" is already clickable and interactive in the header.
- ✅ Discount/Tax toggle UI (Flat/%) is well-implemented.
- ✅ Invoice number format (e.g., "INV-20251101-4029") is clear and auto-generated.
- ✅ Theme toggle and language selector are discoverable in the header.

## Quick Wins (Priority Order)

### High Priority

1. **Unify date formats** – Inputs show `MM/DD/YYYY` while preview shows `YYYY‑MM‑DD`. Use locale‑aware formatting from the language selector.
   - Status: ❌ Not started
   - Impact: High (visible inconsistency in every invoice)

2. **Add tooltips/labels to floating action buttons** – Current buttons (+, download) lack context; add descriptive labels (e.g., "Add item", "Export PDF").
   - Status: ❌ Not started
   - Impact: High (improves discoverability)

3. **Tighten helper text copy** – Simplify "Changing Invoice Date auto‑adjusts Due Date (+30 days) unless you set it manually" to inline hints.
   - Status: ❌ Not started
   - Impact: Medium (cleans up form UI)

### Medium Priority

4. **Improve empty state messaging** – Replace em‑dashes (—) with friendly prompts ("Add your company", "Add a client") in From/To fields.
   - Status: ❌ Not started
   - Impact: Medium (better UX for blank invoices)

5. **Handle $0.00 total state gracefully** – When total is `$0.00`, show a neutral empty state instead of "UNPAID $0.00".
   - Status: ❌ Not started
   - Impact: Low (edge case but improves polish)

### Low Priority

6. **Add currency code/symbol display** – Show currency code when ambiguous (e.g., `$0.00 USD`) or provide a currency selector; ensure thousand separators for large amounts.
   - Status: ❌ Not started
   - Impact: Low (edge case but increases professionalism)

## Layout & Visual Hierarchy

- Group fields into clearer sub‑sections: From/To, Dates/Terms, Items/Totals.
- In the preview, place "Balance Due" above the status chip; show due date directly beneath the amount as secondary text.
- Logo upload needs a visible affordance ("Upload logo") with format guidance.
- Provide an explicit `Net terms` control (Net 15/30/45/Custom) rather than implicit +30 logic.

## Copy & Labels

- Replace long helper paragraphs with concise labels + inline hints (e.g., `Due Date` + `Net` selector communicates behavior without text blocks).
- Keep nomenclature consistent between form and preview ("From/To", casing, punctuation).
- Add microcopy for invoice number (auto‑generated pattern; editable on click).

## Accessibility

- Check color contrast for the orange "UNPAID" chip on white (aim for WCAG AA minimums).
- Preserve visible focus states on all interactive controls, including icon‑only buttons.
- Ensure icon‑only buttons have descriptive `aria-label`s (e.g., "Export PDF").
- Date inputs should support keyboard entry and announce the expected format to screen readers.

## Data & Formatting

- Respect the selected locale for dates and currency; persist the preference.
- Show currency code when ambiguous (e.g., `$0.00 USD`) or provide a currency selector in settings.
- Use thousand separators and non‑breaking spaces between currency symbol and amount for readability.

## Interactions

- Add a "Mark as paid" quick action; when fully paid, change the chip to "PAID" and optionally show a receipt stamp in the preview.
- Provide friendly empty states in the preview ("Add your company", "Add a client") instead of em‑dashes.
- Make `Due Date` reactive to `Net` changes but unlocked when manually edited; show a subtle "manual override" indicator.

## Mobile/Responsive

- On small screens, keep a sticky summary (amount + status + export) for quick access.
- Prevent FABs from overlapping content; consider a fixed footer with labeled buttons on mobile.
- Ensure stacked layout maintains clear grouping and comfortable tap targets.

## Future Enhancements

- Taxes and discounts: support per‑line and summary rows with clear inclusion/exclusion in totals.
- Inline validation for missing client details or invalid date ranges; surface errors near fields and echo critical ones in the preview header.
- Autosave feedback near "Saved Invoices"; consider undo/redo for recent edits.

