# TypeScript Migration Plan - Sprint Breakdown

## Overview
Your codebase is **already well-positioned** for TypeScript migration with comprehensive type definitions in `types.d.ts` and TypeScript configured. The migration will convert 16 JavaScript files and add types to 32 Svelte components (~10,386 lines total).

**Estimated Timeline**: 13 sprints (26 weeks / ~6 months)
**Aggressive Timeline**: 8-10 sprints (4-5 months)

---

## **Sprint 1-2: Foundation & Core Utilities** (10-20 hours)

### Goals
- Set up TypeScript infrastructure
- Migrate pure utility functions (lowest risk, highest value)
- Get immediate type safety for critical calculations

### Tasks
1. **Setup** (1-2 hours)
   - Rename `jsconfig.json` → `tsconfig.json`
   - Install `@types/html2pdf.js`
   - Verify `npm run check` and `npm run build` work

2. **Migrate Core Utilities** (4-6 hours)
   - `src/lib/InvoiceCalculator.js` → `.ts` (49 lines) ⭐ **CRITICAL - calculation logic**
   - `src/lib/currency.js` → `.ts` (25 lines)
   - `src/lib/index.js` → `.ts` (36 lines)
   - `src/lib/i18n/setup.js` → `.ts` (16 lines)

3. **Migrate Route Configs** (30 min)
   - All 4 `+page.js` and `+layout.js` → `.ts` (7 lines total)

**Deliverables**: 8 files migrated, foundation established

---

## **Sprint 3: Database Layer** (3-5 hours)

### Goals
- Type-safe data persistence
- Critical data integrity

### Tasks
1. **Database Migration** (3-5 hours)
   - `src/lib/db.js` → `.ts` (102 lines) ⭐⭐ **CRITICAL**
   - Handle `File | string | null` union types carefully
   - Type IndexedDB operations
   - Add proper error types

**Deliverables**: Type-safe database layer

---

## **Sprint 4: State Management (Stores)** (3-4 hours)

### Goals
- Type-safe global state
- Proper store typing

### Tasks
1. **Migrate Stores** (3-4 hours)
   - `src/lib/stores/currency.js` → `.ts` (37 lines)
   - `src/lib/theme.js` → `.ts` (46 lines)
   - `src/stores/templateStore.js` → `.ts` (42 lines)
   - `src/stores/invoiceStore.js` → `.ts` (2 lines)

**Deliverables**: 4 stores with full type safety

---

## **Sprint 5: Template System** (4-6 hours)

### Goals
- Type-safe template operations
- Proper dynamic import types

### Tasks
1. **Migrate Template System** (4-6 hours)
   - `src/lib/templates/registry.js` → `.ts` (108 lines)
   - `src/lib/templates/migration.js` → `.ts` (118 lines)
   - `src/lib/templates/index.js` → `.ts` (18 lines)
   - Handle dynamic import types for Svelte components

**Deliverables**: Type-safe template system

---

## **Sprint 6-7: Simple Components** (11-22 hours)

### Goals
- Migrate smaller components (<150 lines)
- Establish component typing patterns

### Tasks
1. **Migrate 11 Simple Components** (1-2 hours each)
   - `ThemeToggle.svelte` (44 lines)
   - `FooterComponent.svelte` (19 lines)
   - `FilePreviewComponent.svelte` (56 lines)
   - `SubTotalComponent.svelte` (64 lines)
   - `TemplateSelector.svelte` (78 lines)
   - `ModalComponent.svelte` (79 lines)
   - `TermsAndNotesComponent.svelte` (101 lines)
   - `ItemInputComponent.svelte` (105 lines)
   - `InvoicePreviewWrapper.svelte` (104 lines)
   - `CurrencySelector.svelte` (107 lines)
   - `AppFooter.svelte` (109 lines)

**Deliverables**: 11 components with typed props and events

---

## **Sprint 8-9: Medium Complexity Components** (12-18 hours)

### Goals
- Migrate medium-sized components (150-300 lines)
- Handle more complex prop interfaces

### Tasks
1. **Migrate 6 Medium Components** (2-3 hours each)
   - `Header.svelte` (115 lines)
   - `AmountPaidComponent.svelte` (127 lines)
   - `LanguageSelector.svelte` (132 lines)
   - `IndexComponent.svelte` (136 lines)
   - `ItemFormComponent.svelte` (214 lines)
   - `TotalComponent.svelte` (255 lines)
   - `AdditionalPaymentsComponent.svelte` (305 lines)

**Deliverables**: 7 components with complex typing

---

## **Sprint 10: Complex Form Component** (6-8 hours)

### Goals
- Migrate largest form component
- Handle 19 prop type definitions

### Tasks
1. **Migrate Complex Form** (6-8 hours)
   - `InvoiceFormComponent.svelte` (607 lines) ⭐⭐⭐
   - Define comprehensive prop interfaces
   - Type all event handlers
   - Add validation types

**Deliverables**: Fully typed invoice form

---

## **Sprint 11: Preview Components** (8-12 hours)

### Goals
- Migrate preview and content components

### Tasks
1. **Migrate Preview Components** (4-6 hours each)
   - `InvoicePreviewComponent.svelte` (525 lines)
   - `SEOContent.svelte` (538 lines)

**Deliverables**: 2 large components migrated

---

## **Sprint 12: Template Components** (16-24 hours)

### Goals
- Migrate all template rendering components
- Ensure consistent prop interfaces

### Tasks
1. **Migrate 4 Templates** (4-6 hours each)
   - `AtlanticTemplate.svelte` (455 lines)
   - `MinimalTemplate.svelte` (479 lines)
   - `ClassicTemplate.svelte` (516 lines)
   - `ModernTemplate.svelte` (570 lines)

**Deliverables**: All templates fully typed

---

## **Sprint 13: Simple Route Pages** (10-20 hours)

### Goals
- Migrate smaller route pages

### Tasks
1. **Migrate 5 Route Pages** (2-4 hours each)
   - `src/routes/+layout.svelte` (39 lines)
   - `src/routes/invoice/[id]/+page.svelte` (53 lines)
   - `src/routes/how-it-works/+page.svelte` (443 lines)
   - `src/routes/about/+page.svelte` (527 lines)
   - `src/routes/features/+page.svelte` (545 lines)

**Deliverables**: 5 route pages migrated

---

## **Sprint 14-15: Complex Route Pages** (28-40 hours)

### Goals
- Migrate most complex pages
- Handle complex state management

### Tasks
1. **Saved Invoices Page** (12-16 hours)
   - `src/routes/saved-invoices/+page.svelte` (1,058 lines) ⭐⭐⭐
   - Type filtering logic
   - Type list management functions

2. **Main Invoice Page** (16-24 hours)
   - `src/routes/+page.svelte` (1,125 lines) ⭐⭐⭐⭐ **MOST COMPLEX**
   - Type all Svelte 5 runes (`$state`, `$effect`, `$derived`)
   - Type PDF generation logic
   - Type auto-save functionality
   - Type tab navigation
   - Comprehensive testing required

**Deliverables**: Both complex pages fully typed

---

## **Sprint 16: Testing & Refinement** (8-16 hours)

### Goals
- Ensure complete type safety
- Enable strict mode
- Final testing

### Tasks
1. **Type Safety Audit** (4-8 hours)
   - Run `npm run check` - fix all errors
   - Enable stricter TypeScript options:
     - `noImplicitAny: true`
     - `strictNullChecks: true`
     - `strictFunctionTypes: true`
   - Eliminate remaining `any` types
   - Add type guards where needed

2. **Testing & Documentation** (4-8 hours)
   - Full functionality testing
   - Verify all features work
   - Update documentation
   - Create migration summary

**Deliverables**: 100% TypeScript coverage, strict mode enabled

---

## Summary

- **Total Sprints**: 16 (can be compressed to 10-12 with aggressive timeline)
- **Total Files**: 47 (16 JS → TS, 32 Svelte components)
- **Total Lines**: ~10,386 lines
- **Estimated Hours**: 112-181 hours
- **Risk Level**: Low-Medium (good foundation already exists)

---

## Key Success Factors

✅ Migrate one file at a time
✅ Test after each file (`npm run check`)
✅ Start with utilities, end with complex routes
✅ Commit after each successful migration
✅ Keep JSDoc during transition if helpful

---

## Migration Best Practices

1. **One File at a Time**: Don't migrate multiple files in parallel
2. **Test After Each File**: Run `npm run check` after each conversion
3. **Incremental Strictness**: Don't enable all strict flags immediately
4. **Keep JSDoc Temporarily**: Can coexist during transition
5. **Branch per Phase**: Create separate branches for each phase
6. **Regular Commits**: Commit after each successful file migration

---

## Current Status

### ✅ Already Complete
- TypeScript installed (v5.0.0)
- `jsconfig.json` configured with strict checking
- Comprehensive type definitions in `src/lib/types.d.ts`:
  - `InvoiceData` interface
  - `InvoiceItem` interface
  - `MonetaryAdjustment` type
  - `ShippingInfo` interface
  - `AdditionalPayment` interface
  - `InvoiceTotals` interface
  - `SavedInvoiceRecord` interface
  - `SavedInvoicesFilterMode` type

### 📋 To Do
- Rename `jsconfig.json` → `tsconfig.json`
- Install `@types/html2pdf.js`
- Begin Sprint 1-2 tasks

---

## Quick Wins (Can be done in first 2-3 hours)

Files that are **easy to migrate** and provide **immediate value**:

1. ⭐ `src/lib/InvoiceCalculator.js` (49 lines)
   - Pure functions, well-documented
   - Critical calculation logic
   - **Estimated: 1 hour**

2. ⭐ `src/lib/currency.js` (25 lines)
   - Simple derived stores
   - **Estimated: 30 minutes**

3. ⭐ `src/lib/i18n/setup.js` (16 lines)
   - Minimal logic
   - **Estimated: 15 minutes**

4. ⭐ All 4 route config files (7 lines total)
   - Just export statements
   - **Estimated: 15 minutes**

**Total Quick Wins**: 4-5 files in 2-3 hours

---

## Risk Areas

### High Risk ⚠️

1. **Svelte 5 Runes with TypeScript**
   - Documentation still evolving
   - Generic type syntax for `$props()` needs verification
   - May encounter edge cases

2. **Large File Migration**
   - `/src/routes/+page.svelte` (1,125 lines)
   - High risk of introducing bugs
   - Recommend thorough testing

3. **Dynamic Imports**
   - Template component loading needs careful typing
   - May need SvelteComponent type definitions

### Medium Risk ⚠️

1. **File Upload Handling**
   - Union types `File | string | null` need proper narrowing
   - Multiple conversion points

2. **Store Type Inference**
   - Svelte's store types can be tricky
   - Derived stores with complex transformations

3. **Event Handler Types**
   - Many event handlers need specific types
   - Generic `Event` types may need refinement

---

## Dependencies Status

### ✅ Already Have TypeScript Support
- `@tailwindcss/vite` (^4.1.4) - Built-in types
- `idb-keyval` (^6.2.1) - Built-in types
- `svelte-i18n` (^4.0.1) - Built-in types
- `tailwindcss` (^4.1.4) - Built-in types
- `uuid` (^11.1.0) - Built-in types
- All SvelteKit packages - Built-in types

### 📦 Need to Install
- `@types/html2pdf.js` - For PDF generation
- `@types/node` (optional) - For dotenv (if needed)

---

## Svelte 5 Runes with TypeScript Examples

### Current (JavaScript with JSDoc)
```javascript
let invoice = $state(/** @type {InvoiceData | null} */ (null));
let items = $state(/** @type {InvoiceItem[]} */ ([]));
```

### Target (TypeScript)
```typescript
let invoice = $state<InvoiceData | null>(null);
let items = $state<InvoiceItem[]>([]);
```

### Component Props
```typescript
// Current
let { invoice, onUpdate } = $props();

// Target
interface Props {
  invoice: InvoiceData;
  onUpdate: (invoice: InvoiceData) => void;
}
let { invoice, onUpdate } = $props<Props>();
```

---

## Progress Tracking

Create a checklist to track progress:

### Sprint 1-2: Foundation & Core Utilities
- [ ] Rename jsconfig.json → tsconfig.json
- [ ] Install @types/html2pdf.js
- [ ] Migrate InvoiceCalculator.js
- [ ] Migrate currency.js
- [ ] Migrate index.js (lib)
- [ ] Migrate i18n/setup.js
- [ ] Migrate all route config files (4 files)

### Sprint 3: Database Layer
- [ ] Migrate db.js

### Sprint 4: State Management
- [ ] Migrate stores/currency.js
- [ ] Migrate lib/theme.js
- [ ] Migrate stores/templateStore.js
- [ ] Migrate stores/invoiceStore.js

### Sprint 5: Template System
- [ ] Migrate templates/registry.js
- [ ] Migrate templates/migration.js
- [ ] Migrate templates/index.js

### Sprint 6-7: Simple Components
- [ ] ThemeToggle.svelte
- [ ] FooterComponent.svelte
- [ ] FilePreviewComponent.svelte
- [ ] SubTotalComponent.svelte
- [ ] TemplateSelector.svelte
- [ ] ModalComponent.svelte
- [ ] TermsAndNotesComponent.svelte
- [ ] ItemInputComponent.svelte
- [ ] InvoicePreviewWrapper.svelte
- [ ] CurrencySelector.svelte
- [ ] AppFooter.svelte

### Sprint 8-9: Medium Components
- [ ] Header.svelte
- [ ] AmountPaidComponent.svelte
- [ ] LanguageSelector.svelte
- [ ] IndexComponent.svelte
- [ ] ItemFormComponent.svelte
- [ ] TotalComponent.svelte
- [ ] AdditionalPaymentsComponent.svelte

### Sprint 10: Complex Form
- [ ] InvoiceFormComponent.svelte

### Sprint 11: Preview Components
- [ ] InvoicePreviewComponent.svelte
- [ ] SEOContent.svelte

### Sprint 12: Template Components
- [ ] AtlanticTemplate.svelte
- [ ] MinimalTemplate.svelte
- [ ] ClassicTemplate.svelte
- [ ] ModernTemplate.svelte

### Sprint 13: Simple Routes
- [ ] routes/+layout.svelte
- [ ] routes/invoice/[id]/+page.svelte
- [ ] routes/how-it-works/+page.svelte
- [ ] routes/about/+page.svelte
- [ ] routes/features/+page.svelte

### Sprint 14-15: Complex Routes
- [ ] routes/saved-invoices/+page.svelte
- [ ] routes/+page.svelte

### Sprint 16: Testing & Refinement
- [ ] Run npm run check
- [ ] Enable noImplicitAny
- [ ] Enable strictNullChecks
- [ ] Enable strictFunctionTypes
- [ ] Eliminate any types
- [ ] Full functionality testing
- [ ] Update documentation
