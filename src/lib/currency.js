export const toUSCurrency = (amount) =>
	new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', currencyDisplay: 'symbol' }).format(amount);
