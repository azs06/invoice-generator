import { writable, derived } from 'svelte/store';
import type { PageSizeId, PageDimensions, PageMargins, PageSettings } from '$lib/types';

// View mode for responsive vs fixed page view
export type ViewMode = 'responsive' | 'page';

// View mode store - defaults to 'responsive' (will be auto-detected based on screen size)
export const viewMode = writable<ViewMode>('responsive');

export const setViewMode = (mode: ViewMode): void => {
	viewMode.set(mode);
};

export const toggleViewMode = (): void => {
	viewMode.update((current) => (current === 'responsive' ? 'page' : 'responsive'));
};

// Page size definitions with dimensions in mm
export const PAGE_SIZES: Record<PageSizeId, PageDimensions> = {
	a4: { width: '210mm', height: '297mm', label: 'A4' },
	letter: { width: '216mm', height: '279mm', label: 'Letter' },
	legal: { width: '216mm', height: '356mm', label: 'Legal' },
	a5: { width: '148mm', height: '210mm', label: 'A5' }
};

export const PAGE_SIZE_OPTIONS: { id: PageSizeId; label: string }[] = [
	{ id: 'a4', label: 'A4 (210 × 297 mm)' },
	{ id: 'letter', label: 'Letter (8.5 × 11 in)' },
	{ id: 'legal', label: 'Legal (8.5 × 14 in)' },
	{ id: 'a5', label: 'A5 (148 × 210 mm)' }
];

const DEFAULT_PAGE_SIZE: PageSizeId = 'a4';
const DEFAULT_MARGINS: PageMargins = { top: 10, right: 10, bottom: 10, left: 10 };

const DEFAULT_SETTINGS: PageSettings = {
	pageSize: DEFAULT_PAGE_SIZE,
	margins: DEFAULT_MARGINS
};

// Main store for page settings
export const pageSettings = writable<PageSettings>(DEFAULT_SETTINGS);

// Derived store for current page dimensions
export const currentPageDimensions = derived(pageSettings, ($settings) => {
	return PAGE_SIZES[$settings.pageSize] || PAGE_SIZES.a4;
});

// Helper functions
export const setPageSize = (size: PageSizeId): void => {
	if (PAGE_SIZES[size]) {
		pageSettings.update((settings) => ({
			...settings,
			pageSize: size
		}));
	}
};

export const setMargins = (margins: Partial<PageMargins>): void => {
	pageSettings.update((settings) => ({
		...settings,
		margins: {
			...settings.margins,
			...margins
		}
	}));
};

export const resetToDefaults = (): void => {
	pageSettings.set(DEFAULT_SETTINGS);
};

// Get jsPDF format string for PDF generation
export const getJsPDFFormat = (size: PageSizeId): string => {
	switch (size) {
		case 'a4':
			return 'a4';
		case 'letter':
			return 'letter';
		case 'legal':
			return 'legal';
		case 'a5':
			return 'a5';
		default:
			return 'a4';
	}
};

// Convert margins from mm to inches for jsPDF
export const getMarginsInInches = (margins: PageMargins): PageMargins => {
	const mmToInches = (mm: number): number => mm / 25.4;
	return {
		top: mmToInches(margins.top),
		right: mmToInches(margins.right),
		bottom: mmToInches(margins.bottom),
		left: mmToInches(margins.left)
	};
};
