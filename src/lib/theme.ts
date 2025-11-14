import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';

// Get initial theme from localStorage or system preference
function getInitialTheme(): Theme {
	if (!browser) return 'light';

	const stored = localStorage.getItem('theme');
	if (stored === 'dark' || stored === 'light') {
		return stored;
	}

	// Check system preference
	if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
		return 'dark';
	}

	return 'light';
}

// Create the store
export const theme = writable<Theme>(getInitialTheme());

// Subscribe to changes and update DOM and localStorage
if (browser) {
	theme.subscribe((value) => {
		localStorage.setItem('theme', value);

		if (value === 'dark') {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	});

	// Apply initial theme
	const initialTheme = getInitialTheme();
	if (initialTheme === 'dark') {
		document.documentElement.classList.add('dark');
	}
}

// Helper function to toggle theme
export function toggleTheme(): void {
	theme.update((current) => (current === 'light' ? 'dark' : 'light'));
}
