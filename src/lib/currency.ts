import { derived, type Readable } from 'svelte/store';
import { currencies, currency } from './stores/currency.js';

export const currentCurrencyInfo = derived(currency, ($currency) => {
	return currencies[$currency as keyof typeof currencies] || currencies.USD;
});

export const currencyFormatter = derived(currentCurrencyInfo, ($info) => {
	return new Intl.NumberFormat($info.locale, {
		style: 'currency',
		currency: $info.code,
		currencyDisplay: 'symbol'
	});
});

export const formatCurrency: Readable<(amount?: number) => string> = derived(
	currencyFormatter,
	($formatter) => {
		return (amount: number = 0): string => {
			const numericAmount = Number.isFinite(amount) ? amount : Number(amount) || 0;
			return $formatter.format(numericAmount);
		};
	}
);

export const currencySymbol = derived(currentCurrencyInfo, ($info) => $info.symbol);

export const toUSCurrency = formatCurrency;
