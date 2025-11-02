# Invoice Template System

This directory contains the template system for the invoice generator, allowing for multiple invoice layouts and styles.

## Structure

```
src/lib/templates/
├── components/          # Template Svelte components
│   ├── ModernTemplate.svelte
│   ├── ClassicTemplate.svelte
│   └── MinimalTemplate.svelte
├── registry.js          # Template registry and metadata
├── migration.js         # Template migration utilities
└── README.md           # This file
```

## Creating a New Template

### 1. Create the Template Component

Create a new Svelte component in `src/lib/templates/components/`. The component should:

1. Accept these props:
   ```javascript
   let { invoice, totals = {} } = $props();
   ```

2. Use the invoice data structure:
   ```javascript
   // Basic invoice info
   invoice.invoiceLabel    // "INVOICE", "RECEIPT", etc.
   invoice.invoiceNumber   // "INV-12345"
   invoice.date          // "2023-12-01"
   invoice.dueDate       // "2023-12-31"
   invoice.invoiceFrom    // Company details
   invoice.invoiceTo      // Client details
   invoice.terms         // Payment terms
   invoice.notes          // Additional notes
   
   // Items array
   invoice.items = [
     {
       name: "Item description",
       quantity: 2,
       price: 100,
       amount: 200
     }
   ]
   
   // Financial calculations
   totals.subTotal       // Calculated subtotal
   totals.total         // Calculated total with tax/shipping
   totals.balanceDue    // Balance after payments
   ```

3. Include currency formatting:
   ```javascript
   import { toUSCurrency } from '$lib/currency.js';
   
   // Usage: toUSCurrency(amount)
   ```

### 2. Add Template Styles

All styles should be defined in the `<style>` block within your component.

#### CSS Guidelines

1. Define CSS custom properties at the component root for consistency:
   ```css
   .my-template {
     --primary-color: #2563eb;
     --text-color: #1f2937;
     --border-color: #e5e7eb;
     --background-color: #ffffff;
   }
   ```

2. Include print-specific styles for PDF exports:
   ```css
   @media print {
     .my-template {
       --text-color: #000000 !important;
       --background-color: #ffffff !important;
       color: #000 !important;
       background: #fff !important;
     }
   }
   ```

3. Follow responsive design patterns:
   ```css
   @media (max-width: 768px) {
     .my-template {
       padding: 1rem;
     }
   }
   ```

### 3. Register the Template

Add your template to `src/lib/templates/registry.js`:

```javascript
export const TEMPLATES = {
  // ... existing templates
  mytemplate: {
    id: 'mytemplate',
    name: 'My Template',
    description: 'A custom invoice template',
    component: () => import('./components/MyTemplate.svelte'),
    tags: ['custom', 'modern'],
    premium: false,
    preview: '/templates/mytemplate-preview.png'
  }
};
```

#### Template Properties

- `id`: Unique identifier (used in URLs and storage)
- `name`: Display name for the template selector
- `description`: Brief description of the template
- `component`: Dynamic import function for the Svelte component
- `tags`: Array of tags for filtering and search
- `premium`: Boolean indicating if this is a premium template
- `preview`: Path to preview image (optional)

## Design Guidelines

### Typography

- Use system fonts for better compatibility
- Maintain readable font sizes (minimum 12px for body text)
- Use appropriate font weights for hierarchy

### Color Scheme

- Ensure sufficient contrast for accessibility
- Use colors that work well in both light and dark modes
- Test print appearance (convert to grayscale)

### Layout

- Maintain logical reading order
- Ensure all important information is visible
- Consider mobile responsiveness
- Leave adequate margins for printing

### Data Display

- Always provide fallbacks for missing data
- Format currency consistently
- Handle long text gracefully (truncation, wrapping)
- Consider empty states

## Testing Your Template

1. **Visual Testing**: Check appearance in different screen sizes
2. **Print Testing**: Use browser print preview to verify layout
3. **Data Testing**: Test with various invoice data scenarios
4. **PDF Testing**: Verify PDF export includes all styles

## Best Practices

1. **Performance**: Use efficient CSS selectors and minimal JavaScript
2. **Accessibility**: Include proper semantic HTML and ARIA labels
3. **Maintainability**: Use clear class names and comment complex sections
4. **Compatibility**: Test across modern browsers
5. **Print Optimization**: Use print-specific CSS for better PDF output

## Example Template Structure

```svelte
<script>
  import { toUSCurrency } from '$lib/currency.js';
  
  let { invoice, totals = {} } = $props();
  
  // Calculate any template-specific values
  const calculatedValue = () => {
    // Your custom logic here
  };
</script>

<div class="my-template">
  <header>
    <h1>{invoice.invoiceLabel || 'INVOICE'}</h1>
    <div class="invoice-number">#{invoice.invoiceNumber}</div>
  </header>
  
  <main>
    <!-- Your template layout here -->
  </main>
  
  <footer>
    <div class="total">
      Total: {toUSCurrency(totals.total || 0)}
    </div>
  </footer>
</div>

<style>
  .my-template {
    font-family: 'Inter', sans-serif;
    color: var(--text-color);
    /* Your styles here */
  }
</style>
```

## Premium Templates

For premium templates, set `premium: true` in the registry. The template selector will automatically show a "PRO" badge and handle access control.

## Troubleshooting

### Common Issues

1. **Styles not applying**: Check CSS import path and class names
2. **PDF export issues**: Verify print-specific CSS rules
3. **Component not loading**: Check dynamic import syntax
4. **Data not displaying**: Verify prop destructuring and data structure

### Debug Tips

1. Use browser dev tools to inspect generated HTML
2. Check console for import errors
3. Verify CSS specificity conflicts
4. Test with minimal data first, then complex scenarios