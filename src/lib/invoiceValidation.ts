import type { InvoiceData, InvoiceItem } from './types';

/**
 * Checks if an invoice item is valid (has required fields with valid values)
 */
function isValidItem(item: InvoiceItem): boolean {
    return (
        item.name?.trim().length > 0 &&
        typeof item.quantity === 'number' &&
        item.quantity > 0 &&
        typeof item.price === 'number' &&
        item.price > 0
    );
}

/**
 * Checks if an invoice is complete and ready for sharing
 * 
 * Completeness criteria:
 * 1. invoiceFrom must be non-empty
 * 2. invoiceTo must be non-empty
 * 3. invoiceNumber must be non-empty
 * 4. date must be present
 * 5. At least one valid item (with name, quantity > 0, price > 0)
 */
export function isInvoiceComplete(invoice: InvoiceData | null | undefined): boolean {
    if (!invoice) return false;

    const hasFrom = invoice.invoiceFrom?.trim().length > 0;
    const hasTo = invoice.invoiceTo?.trim().length > 0;
    const hasNumber = invoice.invoiceNumber?.trim().length > 0;
    const hasDate = invoice.date?.trim().length > 0;
    const hasValidItem = invoice.items?.some(isValidItem) ?? false;

    return hasFrom && hasTo && hasNumber && hasDate && hasValidItem;
}

/**
 * Returns a list of reasons why an invoice is incomplete
 * Used for displaying user-friendly messages
 */
export function getIncompletionReasons(invoice: InvoiceData | null | undefined): string[] {
    const reasons: string[] = [];

    if (!invoice) {
        reasons.push('No invoice data');
        return reasons;
    }

    if (!invoice.invoiceFrom?.trim()) {
        reasons.push('Sender information (From) is missing');
    }

    if (!invoice.invoiceTo?.trim()) {
        reasons.push('Recipient information (To) is missing');
    }

    if (!invoice.invoiceNumber?.trim()) {
        reasons.push('Invoice number is missing');
    }

    if (!invoice.date?.trim()) {
        reasons.push('Invoice date is missing');
    }

    const hasValidItem = invoice.items?.some(isValidItem) ?? false;
    if (!hasValidItem) {
        reasons.push('At least one item with name, quantity, and price is required');
    }

    return reasons;
}
