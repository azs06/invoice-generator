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

export function calculateDiscount(discount, baseAmount) {
    if (!discount || !baseAmount) return 0;
    if (discount.type === 'percent') {
        return (baseAmount * (Number(discount.rate) || 0)) / 100;
    }
    // flat
    return Number(discount.rate) || 0;
}

export function calculateTax(tax, baseAmount) {
    if (!tax || !baseAmount) return 0;
    if (tax.type === 'percent') {
        return (baseAmount * (Number(tax.rate) || 0)) / 100;
    }
    // flat
    return Number(tax.rate) || 0;
}
