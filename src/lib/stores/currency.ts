import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'ig.currency';

export interface CurrencyInfo {
	code: string;
	symbol: string;
	locale: string;
	name: string;
}

// Define available currencies with their properties
export const currencies = {
	USD: { code: 'USD', symbol: '$', locale: 'en-US', name: 'US Dollar' },
	EUR: { code: 'EUR', symbol: '€', locale: 'de-DE', name: 'Euro' },
	GBP: { code: 'GBP', symbol: '£', locale: 'en-GB', name: 'British Pound' },
	JPY: { code: 'JPY', symbol: '¥', locale: 'ja-JP', name: 'Japanese Yen' },
	INR: { code: 'INR', symbol: '₹', locale: 'en-IN', name: 'Indian Rupee' },
	BDT: { code: 'BDT', symbol: '৳', locale: 'bn-BD', name: 'Bangladeshi Taka' },
	CAD: { code: 'CAD', symbol: '$', locale: 'en-CA', name: 'Canadian Dollar' },
	AUD: { code: 'AUD', symbol: '$', locale: 'en-AU', name: 'Australian Dollar' }
} as const satisfies Record<string, CurrencyInfo>;

export type CurrencyCode = keyof typeof currencies;

// Get initial currency from localStorage or default to USD
const getInitialCurrency = (): CurrencyCode => {
	if (browser) {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored && stored in currencies) {
			return stored as CurrencyCode;
		}
	}
	return 'USD';
};

// Create the writable store
export const currency = writable<CurrencyCode>(getInitialCurrency());

// Subscribe to changes and persist to localStorage
if (browser) {
	currency.subscribe((value) => {
		localStorage.setItem(STORAGE_KEY, value);
	});
}
