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

export function calculateDiscount(discountObj, subTotal) {
    if (!discountObj) {
        return 0;
    } else if (discountObj.type === 'percentage') {
        return parseFloat((subTotal * discountObj.rate) / 100);
    } else {
        return parseFloat(discountObj.rate);
    }
}

export function calculateTax(taxObj, totalInvoiceAmount) {
    if (!taxObj) {
        return 0;
    } else if (taxObj.type === 'percentage') {
        return parseFloat((totalInvoiceAmount * taxObj.rate) / 100);
    } else {
        return parseFloat(taxObj.rate);
    }
}
