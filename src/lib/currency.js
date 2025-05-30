export const toUSCurrency = (amount) =>
	new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount);
