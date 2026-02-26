import { getLocaleFromNavigator, init, register } from 'svelte-i18n';
import { browser } from '$app/environment';

register('en', () => import('./en.json'));
register('bn', () => import('./bn.json'));

// Initialize immediately with a default locale
init({
	fallbackLocale: 'en',
	initialLocale: browser ? getLocaleFromNavigator() : 'en'
});

export function setupI18n(): void {
	// This function is now just for potential future use
	// The init happens at module load
}
