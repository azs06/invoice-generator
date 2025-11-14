import type { InvoiceData, MonetaryAdjustment } from './types';

export function totalAmounts(invoice: InvoiceData, calculatedSubTotal: number): number {
	let totalInvoiceAmount = 0;
	for (let i = 0; i < invoice.items.length; i++) {
		totalInvoiceAmount += parseFloat(String(invoice.items[i].amount));
	}

	const discount = calculateDiscount(invoice.discount, calculatedSubTotal);
	totalInvoiceAmount -= discount;

	const tax = calculateTax(invoice.tax, totalInvoiceAmount);
	totalInvoiceAmount += tax;

	const shipping = invoice.shipping?.amount || 0;
	totalInvoiceAmount += shipping;

	return totalInvoiceAmount;
}

export function calculateDiscount(discount: MonetaryAdjustment, baseAmount: number): number {
	if (!discount || !baseAmount) return 0;
	if (discount.type === 'percent') {
		return (baseAmount * (Number(discount.rate) || 0)) / 100;
	}
	return Number(discount.rate) || 0;
}

export function calculateTax(tax: MonetaryAdjustment, baseAmount: number): number {
	if (!tax || !baseAmount) return 0;
	if (tax.type === 'percent') {
		return (baseAmount * (Number(tax.rate) || 0)) / 100;
	}
	// flat
	return Number(tax.rate) || 0;
}
