import { get } from 'svelte/store';
import { currency, currencies } from './stores/currency.js';

/**
 * @param {number} amount
 * @returns {string}
 */
export const toUSCurrency = (amount) => {
	const currentCurrency = get(currency);
	const currencyInfo = currencies[/** @type {keyof typeof currencies} */ (currentCurrency)] || currencies.USD;

	return new Intl.NumberFormat(currencyInfo.locale, {
		style: 'currency',
		currency: currencyInfo.code,
		currencyDisplay: 'symbol'
	}).format(amount);
};
