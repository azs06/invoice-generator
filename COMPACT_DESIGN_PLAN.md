# Plan: Make Edit View More Compact (Inspired by Invoice-Generator.com)

## Overview
Transform the invoice form into a more compact, space-efficient design while maintaining readability and usability, inspired by the reference design.

## Changes to Implement

### 1. **InvoiceFormComponent.svelte** - Main Form Container
- Reduce gap between panels: `1.15rem` → `0.75rem`
- Reduce panel padding: `1rem 1.35rem 1.35rem` → `0.75rem 1rem 1rem`
- Reduce panel gap: `1.15rem` → `0.75rem`
- Reduce field grid gap: `1rem` → `0.65rem`
- Reduce individual field gap: `0.4rem` → `0.3rem`
- Update mobile responsive padding values proportionally

### 2. **Panel Headers** - Simplify Typography
- Reduce eyebrow label: `0.7rem` → `0.65rem`
- Reduce H2 title: `1.35rem` → `1.1rem`
- Reduce subtitle: `0.9rem` → `0.825rem`
- Reduce panel-header gap: `0.35rem` → `0.25rem`

### 3. **Form Labels & Inputs** - Tighten Spacing
- Reduce label font size: `0.85rem` → `0.8rem`
- Reduce input padding: `0.65rem 0.85rem` → `0.5rem 0.75rem`
- Reduce input font size: `0.95rem` → `0.9rem`

### 4. **ItemFormComponent.svelte** - Compact Line Items
- Reduce container padding: `1rem` → `0.75rem`
- Reduce gap: `0.8rem` → `0.6rem`
- Reduce item-grid gap: `0.8rem` → `0.6rem`
- Reduce label font size: `0.8rem` → `0.75rem`
- Reduce input padding: `0.6rem 0.8rem` → `0.5rem 0.65rem`
- Reduce line total padding: `0.65rem 0.9rem` → `0.5rem 0.75rem`
- Reduce items-stack gap: `0.9rem` → `0.65rem`

### 5. **TotalComponent.svelte** - Optimize Summary Section
- Reduce container padding: `1.05rem` → `0.75rem`
- Reduce gap: `1.1rem` → `0.7rem`
- Reduce H3 font size: `1.2rem` → `1rem`
- Reduce controls grid gap: `0.7rem` → `0.5rem`
- Reduce control padding: `0.75rem` → `0.6rem`
- Reduce control gap: `0.5rem` → `0.4rem`
- Reduce summary line padding: `0.85rem` → `0.65rem`
- Reduce summary callout padding: `0.85rem` → `0.65rem`
- Reduce total value font size: `1.25rem` → `1.1rem`

### 6. **TermsAndNotesComponent.svelte** - Compact Text Areas
- Reduce field gap: `0.4rem` → `0.3rem`
- Reduce grid gap: `1rem` → `0.65rem`
- Reduce textarea min-height: `130px` → `100px`
- Reduce textarea padding: `0.7rem 0.9rem` → `0.55rem 0.75rem`
- Reduce textarea font size: `0.93rem` → `0.875rem`

### 7. **AmountPaidComponent.svelte** - Tighten Paid Amount Section
- Reduce container padding: `1.05rem` → `0.75rem`
- Reduce gap: `0.55rem` → `0.4rem`
- Reduce title font size: `1.05rem` → `0.95rem`
- Reduce hint font size: `0.85rem` → `0.8rem`

### 8. **Global Form Adjustments** - Consistency
- Update summary-section gap: `1rem` → `0.7rem`
- Ensure consistent spacing across all mobile breakpoints
- Maintain touch-friendly tap targets (minimum 44px for buttons)

## Expected Outcome
- ~20-25% reduction in vertical space usage
- More content visible without scrolling
- Cleaner, more professional appearance matching reference design
- Maintained readability and usability
- Responsive design preserved for mobile/tablet

## Files to Modify
1. `src/components/InvoiceFormComponent.svelte`
2. `src/components/ItemFormComponent.svelte` or `ItemInputComponent.svelte`
3. `src/components/TotalComponent.svelte`
4. `src/components/TermsAndNotesComponent.svelte`
5. `src/components/AmountPaidComponent.svelte`
