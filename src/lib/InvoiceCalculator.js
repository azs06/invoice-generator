/**
 * @param {any} invoice - The invoice object
 * @param {number} calculatedSubTotal - The calculated subtotal
 * @returns {number} Total invoice amount
 */
export function totalAmounts(invoice, calculatedSubTotal) {
    let totalInvoiceAmount = 0;
    for (let i = 0; i < invoice.items.length; i++) {
        totalInvoiceAmount += parseFloat(invoice.items[i].amount);
    }

    let discount = calculateDiscount(invoice.discount, calculatedSubTotal);
    totalInvoiceAmount -= discount;

    let tax = calculateTax(invoice.tax, totalInvoiceAmount);
    totalInvoiceAmount += tax;

    let shipping = invoice.shipping?.amount || 0;
    totalInvoiceAmount += shipping;

    return totalInvoiceAmount;
}

/**
 * @param {any} discount - Discount object
 * @param {number} baseAmount - Base amount to calculate discount on
 * @returns {number} Calculated discount amount
 */
export function calculateDiscount(discount, baseAmount) {
    if (!discount || !baseAmount) return 0;
    if (discount.type === 'percent') {
        return (baseAmount * (Number(discount.rate) || 0)) / 100;
    }
    return Number(discount.rate) || 0;
}

/**
 * @param {any} tax - Tax object
 * @param {number} baseAmount - Base amount to calculate tax on
 * @returns {number} Calculated tax amount
 */
export function calculateTax(tax, baseAmount) {
    if (!tax || !baseAmount) return 0;
    if (tax.type === 'percent') {
        return (baseAmount * (Number(tax.rate) || 0)) / 100;
    }
    // flat
    return Number(tax.rate) || 0;
}
