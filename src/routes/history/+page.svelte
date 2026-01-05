<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import {
		getAllGuestInvoices,
		deleteGuestInvoice,
		clearAllGuestInvoices,
		saveGuestInvoice,
		getGuestInvoice
	} from '$lib/guestDb.js';
	import { toUSCurrency } from '$lib/currency.js';
	import {
		exportInvoicesToFile,
		exportSingleInvoice,
		readExportFile,
		importInvoices
	} from '$lib/invoiceExport.js';
	import CloudModeBanner from '$components/CloudModeBanner.svelte';
	import type { SavedInvoiceRecord, SavedInvoicesFilterMode, InvoiceData } from '$lib/types';

	let allInvoices = $state<SavedInvoiceRecord[]>([]);
	let savedInvoices = $state<SavedInvoiceRecord[]>([]);
	let search = $state<string>('');
	let showInvoiceDeleteModal = $state<boolean>(false);
	let showDeleteAllModal = $state<boolean>(false);
	let invoiceToDelete = $state<string | null>(null);
	let showArchived = $state<boolean>(false);
	let filterMode = $state<SavedInvoicesFilterMode>('all');
	let isLoading = $state<boolean>(true);
	let formatCurrencyFn = $state<(value: number) => string>(() => '');

	// Selection state for bulk export
	let selectedInvoices = $state<Set<string>>(new Set());
	let selectionMode = $state<boolean>(false);

	// Import state
	let fileInput = $state<HTMLInputElement | null>(null);
	let isImporting = $state<boolean>(false);
	let showImportResultModal = $state<boolean>(false);
	let importResult = $state<{ imported: number; skipped: number; errors: string[] } | null>(null);

	$effect(() => {
		formatCurrencyFn = $toUSCurrency;
	});

	const parseDate = (value: string | null | undefined): number => {
		if (!value) return 0;
		const parsed = Date.parse(value);
		return Number.isNaN(parsed) ? 0 : parsed;
	};

	const formatDate = (value: string | null | undefined): string => {
		const parsed = parseDate(value);
		if (!parsed) return 'Date not set';
		return new Intl.DateTimeFormat(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(parsed);
	};

	const formatAmount = (value: number | string | null | undefined = 0): string => {
		const amount = Number(value);
		const safeAmount = Number.isFinite(amount) ? amount : 0;
		return formatCurrencyFn(safeAmount);
	};

	const balanceDueAmount = (invoice: InvoiceData | null | undefined): number => {
		const value = Number(invoice?.balanceDue ?? invoice?.total ?? 0);
		if (!Number.isFinite(value)) return 0;
		return Math.max(value, 0);
	};

	const invoiceTitle = (invoice: InvoiceData | null | undefined): string => {
		if (!invoice) return 'Untitled Invoice';
		const draftName = invoice.draftName?.trim();
		if (draftName) return draftName;
		const label = invoice.invoiceLabel?.trim() || 'Invoice';
		const number = invoice.invoiceNumber?.trim();
		return number ? `${label} ${number}` : label;
	};

	const applyFilters = (): void => {
		let filtered = allInvoices.filter(({ invoice }) => {
			const archived = invoice?.archived === true;
			return showArchived ? archived : !archived;
		});

		filtered = filtered.filter(({ invoice }) => {
			if (!invoice) return false;
			if (filterMode === 'draft') return invoice.draft === true;
			if (filterMode === 'finalized') return invoice.draft === false;
			return true;
		});

		const term = search.trim().toLowerCase();
		if (term) {
			filtered = filtered.filter(({ invoice }) => {
				if (!invoice) return false;
				const haystack = [
					invoice.draftName,
					invoice.invoiceLabel,
					invoice.invoiceNumber,
					invoice.invoiceTo,
					invoice.invoiceFrom
				]
					.filter(Boolean)
					.join(' ')
					.toLowerCase();
				return haystack.includes(term);
			});
		}

		filtered.sort((a, b) => {
			const dateA = parseDate(a.invoice?.date);
			const dateB = parseDate(b.invoice?.date);
			if (dateA === dateB) {
				return (b.invoice?.invoiceNumber || '').localeCompare(a.invoice?.invoiceNumber || '');
			}
			return dateB - dateA;
		});

		savedInvoices = filtered;
	};

	const loadInvoices = async (): Promise<void> => {
		isLoading = true;
		const invoices = await getAllGuestInvoices();
		allInvoices = invoices as SavedInvoiceRecord[];
		applyFilters();
		isLoading = false;
	};

	const onSearchInput = (event: Event): void => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		search = target.value;
		applyFilters();
	};

	const setArchivedView = (value: boolean): void => {
		showArchived = value;
		applyFilters();
	};

	const setFilterMode = (mode: SavedInvoicesFilterMode): void => {
		filterMode = mode;
		applyFilters();
	};

	const removeInvoice = async (id: string | null = invoiceToDelete): Promise<void> => {
		if (!id) return;
		await deleteGuestInvoice(id);
		invoiceToDelete = null;
		showInvoiceDeleteModal = false;
		await loadInvoices();
	};

	const clearAllData = async (): Promise<void> => {
		await clearAllGuestInvoices();
		allInvoices = [];
		savedInvoices = [];
		showDeleteAllModal = false;
	};

	const archiveInvoice = async (id: string): Promise<void> => {
		const data = await getGuestInvoice(id);
		if (data) {
			data.archived = true;
			await saveGuestInvoice(id, data);
			await loadInvoices();
		}
	};

	const unarchiveInvoice = async (id: string): Promise<void> => {
		const data = await getGuestInvoice(id);
		if (data) {
			data.archived = false;
			await saveGuestInvoice(id, data);
			await loadInvoices();
		}
	};

	const confirmDeleteInvoice = (id: string): void => {
		invoiceToDelete = id;
		showInvoiceDeleteModal = true;
	};

	const cancelDelete = (): void => {
		invoiceToDelete = null;
		showInvoiceDeleteModal = false;
	};

	const confirmDeleteAll = (): void => {
		showDeleteAllModal = true;
	};

	const cancelDeleteAll = (): void => {
		showDeleteAllModal = false;
	};

	const openInvoice = (id: string): void => {
		goto(`/?invoice=${id}`);
	};

	// Selection functions for bulk operations
	const toggleSelection = (id: string): void => {
		const newSet = new Set(selectedInvoices);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedInvoices = newSet;
	};

	const selectAll = (): void => {
		selectedInvoices = new Set(savedInvoices.map((r) => r.id));
	};

	const deselectAll = (): void => {
		selectedInvoices = new Set();
	};

	const toggleSelectionMode = (): void => {
		selectionMode = !selectionMode;
		if (!selectionMode) {
			selectedInvoices = new Set();
		}
	};

	// Export functions - excludeLogo for guest mode to reduce file size
	const exportAllInvoices = (): void => {
		if (allInvoices.length === 0) return;
		const invoices = allInvoices.map((r) => r.invoice);
		exportInvoicesToFile(invoices, { excludeLogo: true });
	};

	const exportSelectedInvoices = (): void => {
		if (selectedInvoices.size === 0) return;
		const invoices = allInvoices
			.filter((r) => selectedInvoices.has(r.id))
			.map((r) => r.invoice);
		exportInvoicesToFile(invoices, { excludeLogo: true });
		// Exit selection mode after export
		selectionMode = false;
		selectedInvoices = new Set();
	};

	const exportInvoice = (invoice: InvoiceData): void => {
		exportSingleInvoice(invoice, { excludeLogo: true });
	};

	// Import functions
	const triggerImport = (): void => {
		fileInput?.click();
	};

	const handleFileSelect = async (event: Event): Promise<void> => {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		isImporting = true;
		try {
			const exportData = await readExportFile(file);
			const result = await importInvoices(exportData.invoices, saveGuestInvoice);
			importResult = {
				imported: result.imported,
				skipped: result.skipped,
				errors: result.errors
			};
			showImportResultModal = true;
			await loadInvoices();
		} catch (error) {
			importResult = {
				imported: 0,
				skipped: 0,
				errors: [error instanceof Error ? error.message : 'Failed to import file']
			};
			showImportResultModal = true;
		} finally {
			isImporting = false;
			// Reset file input
			if (target) target.value = '';
		}
	};

	const closeImportResultModal = (): void => {
		showImportResultModal = false;
		importResult = null;
	};

	onMount(() => {
		loadInvoices();
	});
</script>

<section class="history-page">
	<div class="page-shell">
		<CloudModeBanner />

		<header class="page-header">
			<span class="page-badge">History</span>
			<h1 class="page-title">Invoice History</h1>
			<p class="page-subtitle">Your invoices are stored locally in this browser.</p>

			<div class="search-filter-row">
				<label class="search-field">
					<span class="sr-only">Search invoices</span>
					<svg
						class="search-icon"
						viewBox="0 0 20 20"
						fill="none"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.6"
							d="m17.5 17.5-3.6-3.6m1.1-4.4a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Z"
						/>
					</svg>
					<input
						type="search"
						placeholder="Search..."
						bind:value={search}
						oninput={onSearchInput}
					/>
				</label>
				<div class="filter-groups">
					<div class="filter-group">
						<span class="filter-label">Collection</span>
						<div class="chip-group">
							<button
								type="button"
								class:active={!showArchived}
								onclick={() => setArchivedView(false)}
								aria-pressed={!showArchived}
							>
								Active
							</button>
							<button
								type="button"
								class:active={showArchived}
								onclick={() => setArchivedView(true)}
								aria-pressed={showArchived}
							>
								Archived
							</button>
						</div>
					</div>

					<div class="filter-group">
						<span class="filter-label">Status</span>
						<div class="chip-group">
							<button
								type="button"
								class:active={filterMode === 'all'}
								onclick={() => setFilterMode('all')}
								aria-pressed={filterMode === 'all'}
							>
								All
							</button>
							<button
								type="button"
								class:active={filterMode === 'draft'}
								onclick={() => setFilterMode('draft')}
								aria-pressed={filterMode === 'draft'}
							>
								Drafts
							</button>
							<button
								type="button"
								class:active={filterMode === 'finalized'}
								onclick={() => setFilterMode('finalized')}
								aria-pressed={filterMode === 'finalized'}
							>
								Finalized
							</button>
						</div>
					</div>
				</div>
			</div>
		</header>

		<!-- Action Toolbar -->
		<div class="action-toolbar">
			<div class="toolbar-actions">
				<!-- Hidden file input for import -->
				<input
					type="file"
					accept=".json"
					class="sr-only"
					bind:this={fileInput}
					onchange={handleFileSelect}
				/>
				<button
					class="toolbar-btn"
					type="button"
					onclick={triggerImport}
					disabled={isImporting}
				>
					<svg class="toolbar-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path
							d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z"
						/>
						<path
							d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z"
						/>
					</svg>
					<span>{isImporting ? $_('export_import.importing') : $_('export_import.import')}</span>
				</button>
				{#if allInvoices.length > 0}
					<button class="toolbar-btn" type="button" onclick={toggleSelectionMode}>
						<svg class="toolbar-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
								clip-rule="evenodd"
							/>
						</svg>
						<span>{selectionMode ? $_('export_import.cancel') : $_('export_import.select')}</span>
					</button>
					<button class="toolbar-btn" type="button" onclick={exportAllInvoices}>
						<svg class="toolbar-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
							<path
								d="M10.75 6.75a.75.75 0 0 0-1.5 0v6.614l-2.955-3.129a.75.75 0 0 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 1 0-1.09-1.03l-2.955 3.129V6.75Z"
							/>
							<path
								d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z"
							/>
						</svg>
						<span>{$_('export_import.export_all')}</span>
					</button>
				{/if}
				<button class="toolbar-btn toolbar-btn--primary" type="button" onclick={() => goto('/')}>
					<svg class="toolbar-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path
							fill-rule="evenodd"
							d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 0 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z"
							clip-rule="evenodd"
						/>
					</svg>
					<span>New Invoice</span>
				</button>
			</div>

			{#if selectionMode}
				<div class="selection-controls">
					<span class="selection-count">{selectedInvoices.size} {$_('export_import.selected')}</span>
					<button class="link-button" type="button" onclick={selectAll}>
						{$_('export_import.select_all')}
					</button>
					<button class="link-button" type="button" onclick={deselectAll}>
						{$_('export_import.deselect_all')}
					</button>
					<button
						class="toolbar-btn toolbar-btn--primary"
						type="button"
						onclick={exportSelectedInvoices}
						disabled={selectedInvoices.size === 0}
					>
						<svg class="toolbar-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
							<path
								d="M10.75 6.75a.75.75 0 0 0-1.5 0v6.614l-2.955-3.129a.75.75 0 0 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 1 0-1.09-1.03l-2.955 3.129V6.75Z"
							/>
							<path
								d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z"
							/>
						</svg>
						<span>{$_('export_import.export_selected')}</span>
					</button>
				</div>
			{/if}
		</div>

		{#if isLoading}
			<div class="state-card">
				<div class="state-spinner" aria-hidden="true"></div>
				<p>Loading your invoices...</p>
			</div>
		{:else if savedInvoices.length === 0}
			<div class="state-card">
				<h2>No invoices yet</h2>
				<p>Start creating an invoice and it will automatically save here.</p>
				<button class="primary-button" type="button" onclick={() => goto('/')}>
					<svg class="button-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path
							fill-rule="evenodd"
							d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 0 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z"
							clip-rule="evenodd"
						/>
					</svg>
					<span>Create Invoice</span>
				</button>
			</div>
		{:else}
			<div class="invoice-list">
				<div class="invoice-list__header">
					<span class="col-checkbox"></span>
					<span class="col-title">Invoice</span>
					<span class="col-client">Client</span>
					<span class="col-date">Date</span>
					<span class="col-status">Status</span>
					<span class="col-amount">Balance</span>
					<span class="col-actions">Actions</span>
				</div>
				{#each savedInvoices as record (record.id)}
					{#if record.invoice}
						<div class="invoice-row" class:selected={selectedInvoices.has(record.id)}>
							<div class="col-checkbox">
								{#if selectionMode}
									<label class="row-checkbox">
										<input
											type="checkbox"
											checked={selectedInvoices.has(record.id)}
											onchange={() => toggleSelection(record.id)}
										/>
										<span class="checkbox-custom"></span>
									</label>
								{/if}
							</div>
							<div class="col-title">
								<span class="invoice-title">{invoiceTitle(record.invoice)}</span>
								<span class="invoice-number">#{record.invoice.invoiceNumber || 'N/A'}</span>
							</div>
							<div class="col-client">
								<span class="client-name">{record.invoice.invoiceTo || 'No client'}</span>
							</div>
							<div class="col-date">
								<span>{formatDate(record.invoice.date)}</span>
							</div>
							<div class="col-status">
								<span class="status-badge {record.invoice.draft ? 'status-badge--draft' : 'status-badge--finalized'}">
									{record.invoice.draft ? 'Draft' : 'Final'}
								</span>
								{#if record.invoice.archived}
									<span class="status-badge status-badge--archived">Archived</span>
								{/if}
							</div>
							<div class="col-amount">
								<span class="amount-value">{formatAmount(balanceDueAmount(record.invoice))}</span>
							</div>
							<div class="col-actions">
								<button class="action-btn" type="button" onclick={() => openInvoice(record.id)} title="Open" aria-label="Open invoice">
									<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
										<path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
										<path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd" />
									</svg>
								</button>
								<button class="action-btn" type="button" onclick={() => exportInvoice(record.invoice)} title={$_('export_import.export')} aria-label={$_('export_import.export')}>
									<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
										<path d="M10.75 6.75a.75.75 0 0 0-1.5 0v6.614l-2.955-3.129a.75.75 0 0 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 1 0-1.09-1.03l-2.955 3.129V6.75Z" />
										<path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
									</svg>
								</button>
								{#if record.invoice.archived}
									<button class="action-btn action-btn--success" type="button" onclick={() => unarchiveInvoice(record.id)} title="Unarchive" aria-label="Unarchive invoice">
										<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
											<path fill-rule="evenodd" d="M10 3a7 7 0 0 0-6.492 4.41.75.75 0 0 0 1.384.558A5.5 5.5 0 1 1 4.5 10H3a.75.75 0 0 0 0 1.5h3.75a.75.75 0 0 0 .75-.75V7a.75.75 0 0 0-1.5 0v1.332A7.001 7.001 0 0 1 17 10a7 7 0 0 0-7-7Z" clip-rule="evenodd" />
										</svg>
									</button>
								{:else}
									<button class="action-btn" type="button" onclick={() => archiveInvoice(record.id)} title="Archive" aria-label="Archive invoice">
										<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
											<path d="M4 3a2 2 0 0 0-2 2v1.5A1.5 1.5 0 0 0 3.5 8H4v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8h.5A1.5 1.5 0 0 0 18 6.5V5a2 2 0 0 0-2-2H4Zm3 6.5A.5.5 0 0 1 7.5 9h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5ZM4 5h12v1.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V5Z" />
										</svg>
									</button>
								{/if}
								<button class="action-btn action-btn--danger" type="button" onclick={() => confirmDeleteInvoice(record.id)} title="Delete" aria-label="Delete invoice">
									<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
										<path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" />
									</svg>
								</button>
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{/if}

		<footer class="page-footer">
			<div class="footer-warning">
				<svg class="warning-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path
						fill-rule="evenodd"
						d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.168-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
						clip-rule="evenodd"
					/>
				</svg>
				<p>
					These invoices are stored only in this browser. Clearing your browser data will
					permanently delete them. <a href="/api/auth/signin/google">Sign up</a> to save your invoices
					to the cloud.
				</p>
			</div>
			<button class="ghost-button ghost-button--danger" type="button" onclick={confirmDeleteAll}>
				<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path
						fill-rule="evenodd"
						d="M8.75 3a1.75 1.75 0 0 0-1.744 1.61l-.067.676H4a.75.75 0 0 0 0 1.5h.577l.641 9.137A2.25 2.25 0 0 0 7.463 18h5.074a2.25 2.25 0 0 0 2.245-2.077l.641-9.137H16a.75.75 0 0 0 0-1.5h-2.94l-.067-.676A1.75 1.75 0 0 0 11.25 3h-2.5Zm3.146 3.286-.036-.36A.25.25 0 0 0 11.25 5.5h-2.5a.25.25 0 0 0-.249.226l-.036.36h3.432Zm-3.146 3.964a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5Zm4 0a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5Z"
						clip-rule="evenodd"
					/>
				</svg>
				<span>Delete All Invoices</span>
			</button>
		</footer>
	</div>

	<!-- Delete Single Invoice Modal -->
	{#if showInvoiceDeleteModal}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={cancelDelete} onkeydown={(e) => e.key === 'Escape' && cancelDelete()}>
			<div class="modal" role="dialog" aria-modal="true" aria-labelledby="delete-invoice-title" onpointerdown={(e) => e.stopPropagation()}>
				<h2 id="delete-invoice-title">Delete this invoice?</h2>
				<p>
					This invoice is only stored in your browser. Deleting it cannot be undone and the data
					cannot be recovered.
				</p>
				<div class="modal-actions">
					<button class="danger-button" type="button" onclick={() => removeInvoice()}>Delete</button
					>
					<button class="ghost-button" type="button" onclick={cancelDelete}>Cancel</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Delete All Invoices Modal -->
	{#if showDeleteAllModal}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={cancelDeleteAll} onkeydown={(e) => e.key === 'Escape' && cancelDeleteAll()}>
			<div class="modal modal--warning" role="dialog" aria-modal="true" aria-labelledby="delete-all-title" onpointerdown={(e) => e.stopPropagation()}>
				<div class="modal-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path
							d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</div>
				<h2 id="delete-all-title">Delete All Invoices?</h2>
				<p>
					This will permanently delete <strong>all</strong> your locally stored invoices. Since these
					are only stored in your browser, this action cannot be undone and the data cannot be recovered.
				</p>
				<div class="modal-actions">
					<button class="danger-button" type="button" onclick={clearAllData}>
						Delete All Invoices
					</button>
					<button class="ghost-button" type="button" onclick={cancelDeleteAll}>Cancel</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Import Result Modal -->
	{#if showImportResultModal && importResult}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={closeImportResultModal} onkeydown={(e) => e.key === 'Escape' && closeImportResultModal()}>
			<div class="modal" role="dialog" aria-modal="true" aria-labelledby="import-result-title" onpointerdown={(e) => e.stopPropagation()}>
				<div class="modal-icon" class:success={importResult.imported > 0} class:error={importResult.errors.length > 0 && importResult.imported === 0}>
					{#if importResult.imported > 0}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path
								d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					{:else}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path
								d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					{/if}
				</div>
				<h2 id="import-result-title">{$_('export_import.import_result')}</h2>
				<div class="import-result-details">
					{#if importResult.imported > 0}
						<p class="result-success">
							{importResult.imported} {$_('export_import.invoices_imported')}
						</p>
					{/if}
					{#if importResult.skipped > 0}
						<p class="result-warning">
							{importResult.skipped} {$_('export_import.invoices_skipped')}
						</p>
					{/if}
					{#if importResult.errors.length > 0}
						<div class="result-errors">
							{#each importResult.errors as error}
								<p class="result-error">{error}</p>
							{/each}
						</div>
					{/if}
				</div>
				<div class="modal-actions">
					<button class="primary-button" type="button" onclick={closeImportResultModal}>
						{$_('export_import.done')}
					</button>
				</div>
			</div>
		</div>
	{/if}
</section>

<style>
	.history-page {
		padding: clamp(1.5rem, 3vw, 2rem) 1rem 2rem;
	}

	.page-shell {
		max-width: 1120px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.page-header {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.25rem 1.5rem;
		border-radius: var(--radius-lg);
		border: 1px solid var(--surface-card-border);
		background: linear-gradient(
			135deg,
			var(--surface-card-gradient-top),
			var(--surface-card-gradient-bottom)
		);
		box-shadow: var(--shadow-soft);
		overflow: hidden;
	}

	.page-badge {
		align-self: flex-start;
		padding: 0.2rem 0.6rem;
		border-radius: var(--radius-pill);
		background: rgba(59, 130, 246, 0.12);
		color: var(--color-accent-blue);
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.page-title {
		margin: 0;
		font-size: clamp(1.25rem, 2.5vw, 1.5rem);
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.page-subtitle {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	/* Search + Filter Row */
	.search-filter-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(148, 163, 184, 0.15);
	}

	.search-field {
		position: relative;
		display: flex;
		align-items: center;
		flex: 1 1 280px;
		max-width: 320px;
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		padding: 0.3rem 0.75rem 0.3rem 2.25rem;
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease;
	}

	.search-field:focus-within {
		border-color: var(--color-accent-blue);
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
	}

	.search-field input {
		width: 100%;
		border: none;
		outline: none;
		background: transparent;
		color: var(--color-text-primary);
		font-size: 0.875rem;
		padding: 0.25rem 0;
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		width: 0.9rem;
		height: 0.9rem;
		color: var(--color-text-secondary);
	}

	.filter-groups {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: center;
	}

	.filter-group {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.filter-label {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		letter-spacing: 0.06em;
	}

	.chip-group {
		display: flex;
		gap: 0.25rem;
	}

	.chip-group button {
		padding: 0.25rem 0.6rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-secondary);
		background: var(--color-bg-primary);
		color: var(--color-text-secondary);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.chip-group button:hover {
		border-color: var(--color-accent-blue);
	}

	.chip-group button.active {
		background: rgba(59, 130, 246, 0.12);
		border-color: rgba(59, 130, 246, 0.4);
		color: var(--color-accent-blue);
	}

	/* Action Toolbar */
	.action-toolbar {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
	}

	.toolbar-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.toolbar-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.75rem;
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
	}

	.toolbar-btn:hover {
		background: var(--color-bg-secondary);
		border-color: var(--color-accent-blue);
	}

	.toolbar-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toolbar-btn--primary {
		background: var(--color-accent-blue);
		border-color: var(--color-accent-blue);
		color: #ffffff;
	}

	.toolbar-btn--primary:hover {
		background: #2563eb;
	}

	.toolbar-icon {
		width: 0.9rem;
		height: 0.9rem;
	}

	.selection-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
		padding-top: 0.5rem;
		border-top: 1px solid var(--color-border-primary);
	}

	.selection-count {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.link-button {
		background: none;
		border: none;
		color: var(--color-accent-blue);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
	}

	.link-button:hover {
		opacity: 0.8;
	}

	/* Invoice List */
	.invoice-list {
		display: flex;
		flex-direction: column;
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.invoice-list__header {
		display: grid;
		grid-template-columns: 40px 1.5fr 1fr 100px 100px 100px 120px;
		gap: 0.5rem;
		padding: 0.6rem 1rem;
		background: var(--color-bg-secondary);
		border-bottom: 1px solid var(--color-border-primary);
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-secondary);
	}

	.invoice-row {
		display: grid;
		grid-template-columns: 40px 1.5fr 1fr 100px 100px 100px 120px;
		gap: 0.5rem;
		padding: 0.6rem 1rem;
		align-items: center;
		border-bottom: 1px solid var(--color-border-primary);
		transition: background-color 0.15s;
	}

	.invoice-row:last-child {
		border-bottom: none;
	}

	.invoice-row:hover {
		background: var(--color-bg-secondary);
	}

	.invoice-row.selected {
		background: rgba(59, 130, 246, 0.06);
	}

	.col-checkbox {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.col-title {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}

	.invoice-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.invoice-number {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		font-family: monospace;
	}

	.col-client {
		min-width: 0;
	}

	.client-name {
		font-size: 0.875rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--color-text-primary);
	}

	.col-date {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}

	.col-status {
		display: flex;
		flex-wrap: wrap;
		gap: 0.2rem;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.15rem 0.4rem;
		border-radius: var(--radius-sm);
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.status-badge--draft {
		background: rgba(251, 191, 36, 0.2);
		color: #92400e;
	}

	.status-badge--finalized {
		background: rgba(16, 185, 129, 0.2);
		color: #047857;
	}

	.status-badge--archived {
		background: rgba(148, 163, 184, 0.25);
		color: var(--color-text-secondary);
	}

	.col-amount {
		font-size: 0.875rem;
		font-weight: 600;
		font-family: monospace;
		color: var(--color-text-primary);
	}

	.amount-value {
		font-size: inherit;
		font-weight: inherit;
	}

	.col-actions {
		display: flex;
		gap: 0.25rem;
		justify-content: flex-end;
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-sm);
		background: var(--color-bg-primary);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.15s;
	}

	.action-btn:hover {
		background: var(--color-bg-secondary);
		color: var(--color-accent-blue);
		border-color: var(--color-accent-blue);
	}

	.action-btn svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	.action-btn--danger:hover {
		border-color: #ef4444;
		color: #ef4444;
		background: rgba(239, 68, 68, 0.08);
	}

	.action-btn--success:hover {
		border-color: #10b981;
		color: #047857;
		background: rgba(16, 185, 129, 0.08);
	}

	/* Row Checkbox */
	.row-checkbox {
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.row-checkbox input {
		position: absolute;
		opacity: 0;
	}

	.row-checkbox .checkbox-custom {
		display: block;
		width: 1rem;
		height: 1rem;
		background: var(--color-bg-primary);
		border: 2px solid var(--color-border-primary);
		border-radius: var(--radius-xs, 3px);
		transition: all 0.15s;
	}

	.row-checkbox input:checked + .checkbox-custom {
		background: var(--color-accent-blue);
		border-color: var(--color-accent-blue);
	}

	.row-checkbox input:checked + .checkbox-custom::after {
		content: '';
		display: block;
		width: 0.25rem;
		height: 0.45rem;
		border: solid white;
		border-width: 0 2px 2px 0;
		transform: rotate(45deg);
		margin: 0.1rem auto;
	}

	/* Ghost button for footer */
	.ghost-button {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		padding: 0.4rem 0.75rem;
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
	}

	.ghost-button:hover {
		border-color: var(--color-accent-blue);
		color: var(--color-accent-blue);
	}

	.ghost-button svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	.ghost-button--danger {
		border-color: rgba(239, 68, 68, 0.55);
		color: #b91c1c;
	}

	.ghost-button--danger:hover {
		background: rgba(239, 68, 68, 0.08);
		border-color: #ef4444;
		color: #ef4444;
	}

	/* Primary button for empty state */
	.primary-button {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		border-radius: var(--radius-md);
		border: none;
		background: var(--color-accent-blue);
		color: #ffffff;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
	}

	.primary-button:hover {
		background: #2563eb;
	}

	.primary-button svg,
	.button-icon {
		width: 0.9rem;
		height: 0.9rem;
	}

	.state-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 2.5rem 2rem;
		border-radius: var(--radius-lg);
		border: 1px solid var(--surface-card-border);
		background: linear-gradient(
			180deg,
			var(--surface-glass-overlay-top),
			var(--surface-glass-overlay-bottom)
		);
		box-shadow: var(--shadow-soft);
		text-align: center;
	}

	.state-card h2 {
		margin: 0;
		font-size: 1.3rem;
	}

	.state-card p {
		margin: 0;
		color: var(--color-text-secondary);
		max-width: 420px;
	}

	.state-spinner {
		width: 2.2rem;
		height: 2.2rem;
		border-radius: 50%;
		border: 3px solid rgba(148, 163, 184, 0.35);
		border-top-color: var(--color-accent-blue);
		animation: spin 1s linear infinite;
	}

	.page-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1.5rem;
		padding: 1.5rem;
		border-radius: var(--radius-lg);
		background: rgba(251, 191, 36, 0.08);
		border: 1px solid rgba(251, 191, 36, 0.3);
	}

	.footer-warning {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		flex: 1;
		min-width: 280px;
	}

	.warning-icon {
		width: 1.25rem;
		height: 1.25rem;
		color: #d97706;
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	.footer-warning p {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	.footer-warning a {
		color: var(--color-accent-blue);
		font-weight: 600;
		text-decoration: none;
	}

	.footer-warning a:hover {
		text-decoration: underline;
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(15, 23, 42, 0.35);
		backdrop-filter: blur(2px);
		z-index: 100;
		padding: 1.5rem;
	}

	.modal {
		background: var(--color-bg-primary);
		padding: 2rem;
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-primary);
		box-shadow: var(--shadow-medium);
		max-width: 420px;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.modal--warning {
		text-align: center;
	}

	.modal-icon {
		width: 3rem;
		height: 3rem;
		margin: 0 auto 0.5rem;
		background: rgba(239, 68, 68, 0.1);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #dc2626;
	}

	.modal-icon svg {
		width: 1.5rem;
		height: 1.5rem;
	}

	.modal h2 {
		margin: 0;
		font-size: 1.2rem;
		color: var(--color-text-primary);
	}

	.modal p {
		margin: 0;
		color: var(--color-text-secondary);
		line-height: 1.5;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.modal--warning .modal-actions {
		justify-content: center;
	}

	.modal-icon.success {
		background: rgba(16, 185, 129, 0.1);
		color: var(--color-success, #10b981);
	}

	.modal-icon.error {
		background: rgba(239, 68, 68, 0.1);
		color: var(--color-error, #ef4444);
	}

	.import-result-details {
		text-align: left;
	}

	.result-success {
		color: var(--color-success, #10b981);
		font-weight: 500;
		margin: 0.5rem 0;
	}

	.result-warning {
		color: var(--color-warning, #f59e0b);
		font-weight: 500;
		margin: 0.5rem 0;
	}

	.result-errors {
		margin-top: 0.75rem;
		padding: 0.75rem;
		background: rgba(239, 68, 68, 0.08);
		border-radius: var(--radius-sm);
	}

	.result-error {
		color: var(--color-error, #ef4444);
		font-size: 0.875rem;
		margin: 0.25rem 0;
	}

	.danger-button {
		border: none;
		border-radius: var(--radius-pill);
		background: #ef4444;
		color: #ffffff;
		padding: 0.55rem 1.2rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background-color 0.2s ease,
			transform 0.2s ease;
	}

	.danger-button:hover {
		background: #dc2626;
		transform: translateY(-1px);
	}

	.danger-button:active {
		transform: translateY(0);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Responsive: Tablet */
	@media (max-width: 900px) {
		.invoice-list__header,
		.invoice-row {
			grid-template-columns: 32px 1.5fr 1fr 90px 90px 90px 100px;
		}
	}

	/* Responsive: Mobile */
	@media (max-width: 768px) {
		.search-filter-row {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
		}

		.search-field {
			flex: 1 1 auto;
		}

		.filter-groups {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.toolbar-actions {
			flex-wrap: wrap;
		}

		.toolbar-btn {
			flex: 1 1 auto;
			justify-content: center;
		}

		.selection-controls {
			flex-direction: column;
			align-items: stretch;
			gap: 0.5rem;
		}

		.selection-controls .toolbar-btn--primary {
			width: 100%;
			justify-content: center;
		}

		/* Hide table header on mobile */
		.invoice-list__header {
			display: none;
		}

		/* Mobile row layout - stacked */
		.invoice-row {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
			padding: 0.75rem 1rem;
			position: relative;
		}

		.invoice-row .col-checkbox {
			position: absolute;
			top: 0.75rem;
			right: 1rem;
		}

		.invoice-row .col-title {
			flex: 1 1 100%;
			padding-right: 2.5rem;
		}

		.invoice-row .col-client {
			flex: 1 1 50%;
		}

		.invoice-row .col-client::before {
			content: 'Client: ';
			font-size: 0.7rem;
			color: var(--color-text-secondary);
		}

		.invoice-row .col-date {
			flex: 1 1 40%;
		}

		.invoice-row .col-date::before {
			content: 'Date: ';
			font-size: 0.7rem;
			color: var(--color-text-secondary);
		}

		.invoice-row .col-status {
			flex: 0 0 auto;
		}

		.invoice-row .col-amount {
			flex: 1 1 auto;
		}

		.invoice-row .col-amount::before {
			content: 'Balance: ';
			font-size: 0.7rem;
			color: var(--color-text-secondary);
			font-family: inherit;
			font-weight: normal;
		}

		.invoice-row .col-actions {
			flex: 1 1 100%;
			justify-content: flex-start;
			padding-top: 0.5rem;
			border-top: 1px solid var(--color-border-primary);
			margin-top: 0.25rem;
		}

		.page-footer {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
			padding: 1rem;
		}

		.page-footer .ghost-button--danger {
			width: 100%;
			justify-content: center;
		}
	}
</style>
