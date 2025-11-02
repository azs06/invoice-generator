import { derived } from 'svelte/store';
import { currency, currencies } from './stores/currency.js';

export const currentCurrencyInfo = derived(currency, ($currency) => {
	return currencies[/** @type {keyof typeof currencies} */ ($currency)] || currencies.USD;
});

export const currencyFormatter = derived(currentCurrencyInfo, ($info) => {
	return new Intl.NumberFormat($info.locale, {
		style: 'currency',
		currency: $info.code,
		currencyDisplay: 'symbol'
	});
});

export const formatCurrency = derived(currencyFormatter, ($formatter) => {
	return (amount = 0) => {
		const numericAmount = Number.isFinite(amount) ? amount : Number(amount) || 0;
		return $formatter.format(numericAmount);
	};
});

export const currencySymbol = derived(currentCurrencyInfo, ($info) => $info.symbol);

export const toUSCurrency = formatCurrency;
