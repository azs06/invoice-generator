/**
 * Shared selection and import state management for invoice lists
 * Works with both dashboard (logged-in) and history (guest) pages
 */

import type { InvoiceData } from './types';
import {
	exportInvoicesToFile,
	readExportFile,
	importInvoices,
	type ImportResult
} from './invoiceExport';

export interface SelectionState {
	selectedInvoices: Set<string>;
	selectionMode: boolean;
}

export interface ImportState {
	isImporting: boolean;
	showImportResultModal: boolean;
	importResult: { imported: number; skipped: number; errors: string[] } | null;
}

export interface UseSelectionOptions<T> {
	/** Function to get all item IDs for "select all" */
	getFilteredIds: () => string[];
	/** Function to get all invoices for export */
	getAllInvoices: () => Promise<{ id: string; invoice: InvoiceData }[]>;
	/** Function to save an invoice (for import) */
	saveInvoice: (id: string, invoice: InvoiceData) => Promise<void>;
	/** Callback after successful import to reload data */
	onImportComplete?: () => Promise<void>;
	/** Options for export (e.g., excludeLogo for guest mode) */
	exportOptions?: { excludeLogo?: boolean };
}

/**
 * Creates selection and import state management
 * Usage with Svelte 5 runes - call this at the top level of your component
 */
export function createSelectionState() {
	let selectedInvoices = $state<Set<string>>(new Set());
	let selectionMode = $state<boolean>(false);

	return {
		get selectedInvoices() {
			return selectedInvoices;
		},
		set selectedInvoices(value: Set<string>) {
			selectedInvoices = value;
		},
		get selectionMode() {
			return selectionMode;
		},
		set selectionMode(value: boolean) {
			selectionMode = value;
		}
	};
}

export function createImportState() {
	let isImporting = $state<boolean>(false);
	let showImportResultModal = $state<boolean>(false);
	let importResult = $state<{ imported: number; skipped: number; errors: string[] } | null>(null);

	return {
		get isImporting() {
			return isImporting;
		},
		set isImporting(value: boolean) {
			isImporting = value;
		},
		get showImportResultModal() {
			return showImportResultModal;
		},
		set showImportResultModal(value: boolean) {
			showImportResultModal = value;
		},
		get importResult() {
			return importResult;
		},
		set importResult(value: { imported: number; skipped: number; errors: string[] } | null) {
			importResult = value;
		}
	};
}

/**
 * Selection helper functions - pure functions that work with any selection state
 */
export const selectionHelpers = {
	toggle(selectedInvoices: Set<string>, id: string): Set<string> {
		const newSet = new Set(selectedInvoices);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		return newSet;
	},

	selectAll(ids: string[]): Set<string> {
		return new Set(ids);
	},

	deselectAll(): Set<string> {
		return new Set();
	}
};

/**
 * Export helpers
 */
export const exportHelpers = {
	async exportAll<T extends { id: string; invoice: InvoiceData }>(
		getAllInvoices: () => Promise<T[]>,
		options?: { excludeLogo?: boolean }
	): Promise<void> {
		const records = await getAllInvoices();
		const invoices = records.map((r) => r.invoice).filter(Boolean);
		if (invoices.length > 0) {
			exportInvoicesToFile(invoices, options);
		}
	},

	async exportSelected<T extends { id: string; invoice: InvoiceData }>(
		getAllInvoices: () => Promise<T[]>,
		selectedIds: Set<string>,
		options?: { excludeLogo?: boolean }
	): Promise<void> {
		const records = await getAllInvoices();
		const invoices = records
			.filter((r) => selectedIds.has(r.id))
			.map((r) => r.invoice)
			.filter(Boolean);
		if (invoices.length > 0) {
			exportInvoicesToFile(invoices, options);
		}
	},

	async exportSingle<T extends { id: string; invoice: InvoiceData }>(
		getAllInvoices: () => Promise<T[]>,
		invoiceId: string,
		options?: { excludeLogo?: boolean }
	): Promise<void> {
		const records = await getAllInvoices();
		const invoice = records.find((r) => r.id === invoiceId)?.invoice;
		if (invoice) {
			exportInvoicesToFile([invoice], options);
		}
	}
};

/**
 * Import helpers
 */
export const importHelpers = {
	triggerFileInput(fileInput: HTMLInputElement | null): void {
		fileInput?.click();
	},

	async handleFileSelect(
		file: File,
		saveFn: (id: string, invoice: InvoiceData) => Promise<void>
	): Promise<{ imported: number; skipped: number; errors: string[] }> {
		try {
			const exportData = await readExportFile(file);
			const result = await importInvoices(exportData.invoices, saveFn);
			return {
				imported: result.imported,
				skipped: result.skipped,
				errors: result.errors
			};
		} catch (error) {
			return {
				imported: 0,
				skipped: 0,
				errors: [error instanceof Error ? error.message : 'Failed to import file']
			};
		}
	}
};
