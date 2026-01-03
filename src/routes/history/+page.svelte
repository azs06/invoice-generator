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

	// Export functions
	const exportAllInvoices = (): void => {
		if (allInvoices.length === 0) return;
		const invoices = allInvoices.map((r) => r.invoice);
		exportInvoicesToFile(invoices);
	};

	const exportSelectedInvoices = (): void => {
		if (selectedInvoices.size === 0) return;
		const invoices = allInvoices
			.filter((r) => selectedInvoices.has(r.id))
			.map((r) => r.invoice);
		exportInvoicesToFile(invoices);
		// Exit selection mode after export
		selectionMode = false;
		selectedInvoices = new Set();
	};

	const exportInvoice = (invoice: InvoiceData): void => {
		exportSingleInvoice(invoice);
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

			<div class="header-controls">
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
						placeholder="Search by client, label, or invoice #"
						bind:value={search}
						oninput={onSearchInput}
					/>
				</label>
				<div class="header-buttons">
					<!-- Hidden file input for import -->
					<input
						type="file"
						accept=".json"
						class="sr-only"
						bind:this={fileInput}
						onchange={handleFileSelect}
					/>
					<button
						class="secondary-button"
						type="button"
						onclick={triggerImport}
						disabled={isImporting}
					>
						<svg class="button-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
						<button class="secondary-button" type="button" onclick={toggleSelectionMode}>
							<svg class="button-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
									clip-rule="evenodd"
								/>
							</svg>
							<span>{selectionMode ? $_('export_import.cancel') : $_('export_import.select')}</span>
						</button>
						<button class="secondary-button" type="button" onclick={exportAllInvoices}>
							<svg class="button-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
					<button class="primary-button" type="button" onclick={() => goto('/')}>
						<svg class="button-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
							<path
								fill-rule="evenodd"
								d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 0 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z"
								clip-rule="evenodd"
							/>
						</svg>
						<span>New Invoice</span>
					</button>
				</div>
			</div>

			<!-- Selection toolbar -->
			{#if selectionMode}
				<div class="selection-toolbar">
					<div class="selection-info">
						<span>{selectedInvoices.size} {$_('export_import.selected')}</span>
						<button class="link-button" type="button" onclick={selectAll}>
							{$_('export_import.select_all')}
						</button>
						<button class="link-button" type="button" onclick={deselectAll}>
							{$_('export_import.deselect_all')}
						</button>
					</div>
					<button
						class="primary-button"
						type="button"
						onclick={exportSelectedInvoices}
						disabled={selectedInvoices.size === 0}
					>
						<svg class="button-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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

			<div class="filter-toolbar">
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
		</header>

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
			<div class="invoice-grid">
				{#each savedInvoices as record (record.id)}
					{#if record.invoice}
						<article class="invoice-card" class:selected={selectedInvoices.has(record.id)}>
							{#if selectionMode}
								<label class="selection-checkbox">
									<input
										type="checkbox"
										checked={selectedInvoices.has(record.id)}
										onchange={() => toggleSelection(record.id)}
									/>
									<span class="checkbox-custom"></span>
								</label>
							{/if}
							<div class="invoice-card__top">
								<div>
									<h3 class="invoice-card__title">{invoiceTitle(record.invoice)}</h3>
									<div class="invoice-card__badges">
										<span
											class="status-badge {record.invoice.draft
												? 'status-badge--draft'
												: 'status-badge--finalized'}"
										>
											{record.invoice.draft ? 'Draft' : 'Finalized'}
										</span>
										{#if record.invoice.archived}
											<span class="status-badge status-badge--archived">Archived</span>
										{/if}
									</div>
								</div>
								<div class="invoice-card__amount">
									<span class="meta-label">Balance due</span>
									<span class="amount-value">{formatAmount(balanceDueAmount(record.invoice))}</span>
								</div>
							</div>

							<div class="invoice-card__meta">
								<div>
									<span class="meta-label">Client</span>
									<span class="meta-value">{record.invoice.invoiceTo || 'Client not set'}</span>
								</div>
								<div>
									<span class="meta-label">Invoice #</span>
									<span class="meta-value">{record.invoice.invoiceNumber || 'Not assigned'}</span>
								</div>
								<div>
									<span class="meta-label">Issued</span>
									<span class="meta-value">{formatDate(record.invoice.date)}</span>
								</div>
							</div>

							<div class="card-divider"></div>

							<div class="card-actions">
								<button class="ghost-button" type="button" onclick={() => openInvoice(record.id)}>
									<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
										<path
											fill-rule="evenodd"
											d="M10 3c-5 0-9 4.03-9 7s4 7 9 7 9-4.03 9-7-4-7-9-7Zm0 11.25a4.25 4.25 0 1 1 0-8.5 4.25 4.25 0 0 1 0 8.5Zm0-1.5a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Z"
											clip-rule="evenodd"
										/>
									</svg>
									<span>Open</span>
								</button>

								<div class="card-actions__secondary">
									<button
										class="ghost-button"
										type="button"
										onclick={() => exportInvoice(record.invoice)}
										title={$_('export_import.export')}
									>
										<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
											<path
												d="M10.75 6.75a.75.75 0 0 0-1.5 0v6.614l-2.955-3.129a.75.75 0 0 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 1 0-1.09-1.03l-2.955 3.129V6.75Z"
											/>
											<path
												d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z"
											/>
										</svg>
										<span>{$_('export_import.export')}</span>
									</button>

									{#if record.invoice.archived}
										<button
											class="ghost-button ghost-button--success"
											type="button"
											onclick={() => unarchiveInvoice(record.id)}
										>
											<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
												<path
													fill-rule="evenodd"
													d="M10 3a7 7 0 0 0-6.492 4.41.75.75 0 0 0 1.384.558A5.5 5.5 0 1 1 4.5 10H3a.75.75 0 0 0 0 1.5h3.75a.75.75 0 0 0 .75-.75V7a.75.75 0 0 0-1.5 0v1.332A7.001 7.001 0 0 1 17 10a7 7 0 0 0-7-7Z"
													clip-rule="evenodd"
												/>
											</svg>
											<span>Unarchive</span>
										</button>
									{:else}
										<button
											class="ghost-button"
											type="button"
											onclick={() => archiveInvoice(record.id)}
										>
											<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
												<path
													d="M4 3a2 2 0 0 0-2 2v1.5A1.5 1.5 0 0 0 3.5 8H4v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8h.5A1.5 1.5 0 0 0 18 6.5V5a2 2 0 0 0-2-2H4Zm3 6.5A.5.5 0 0 1 7.5 9h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5ZM4 5h12v1.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V5Z"
												/>
											</svg>
											<span>Archive</span>
										</button>
									{/if}

									<button
										class="ghost-button ghost-button--danger"
										type="button"
										onclick={() => confirmDeleteInvoice(record.id)}
									>
										<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
											<path
												fill-rule="evenodd"
												d="M8.75 3a1.75 1.75 0 0 0-1.744 1.61l-.067.676H4a.75.75 0 0 0 0 1.5h.577l.641 9.137A2.25 2.25 0 0 0 7.463 18h5.074a2.25 2.25 0 0 0 2.245-2.077l.641-9.137H16a.75.75 0 0 0 0-1.5h-2.94l-.067-.676A1.75 1.75 0 0 0 11.25 3h-2.5Zm3.146 3.286-.036-.36A.25.25 0 0 0 11.25 5.5h-2.5a.25.25 0 0 0-.249.226l-.036.36h3.432Zm-3.146 3.964a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5Zm4 0a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5Z"
												clip-rule="evenodd"
											/>
										</svg>
										<span>Delete</span>
									</button>
								</div>
							</div>
						</article>
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
		<div class="modal-backdrop" role="dialog" aria-modal="true">
			<div class="modal" role="document">
				<h2>Delete this invoice?</h2>
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
		<div class="modal-backdrop" role="dialog" aria-modal="true">
			<div class="modal modal--warning" role="document">
				<div class="modal-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path
							d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</div>
				<h2>Delete All Invoices?</h2>
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
		<div class="modal-backdrop" role="dialog" aria-modal="true">
			<div class="modal" role="document">
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
				<h2>{$_('export_import.import_result')}</h2>
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
		padding: clamp(2rem, 4vw, 3rem) 1.5rem 3rem;
	}

	.page-shell {
		max-width: 1120px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}

	.page-header {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: clamp(1.75rem, 3vw, 2.5rem);
		border-radius: var(--radius-lg);
		border: 1px solid var(--surface-card-border);
		background: linear-gradient(
			135deg,
			var(--surface-card-gradient-top),
			var(--surface-card-gradient-bottom)
		);
		box-shadow: var(--shadow-medium);
		overflow: hidden;
	}

	.page-header::after {
		content: '';
		position: absolute;
		inset: -40% -30% auto auto;
		width: 320px;
		height: 320px;
		background: radial-gradient(circle at center, rgba(59, 130, 246, 0.12) 0%, transparent 70%);
		pointer-events: none;
	}

	.page-badge {
		align-self: flex-start;
		padding: 0.25rem 0.85rem;
		border-radius: var(--radius-pill);
		background: rgba(59, 130, 246, 0.12);
		color: var(--color-accent-blue);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.page-title {
		margin: 0;
		font-size: clamp(1.75rem, 3vw, 2.4rem);
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.page-subtitle {
		margin: 0;
		max-width: 520px;
		color: var(--color-text-secondary);
	}

	.header-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: center;
	}

	.header-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.secondary-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		border-radius: var(--radius-pill);
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		padding: 0.6rem 1rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background-color 0.2s ease,
			border-color 0.2s ease,
			transform 0.2s ease;
	}

	.secondary-button:hover {
		background: var(--color-bg-secondary);
		border-color: var(--color-accent-blue);
		transform: translateY(-1px);
	}

	.secondary-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		transform: none;
	}

	.selection-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
		padding: 1rem;
		background: rgba(59, 130, 246, 0.08);
		border: 1px solid rgba(59, 130, 246, 0.25);
		border-radius: var(--radius-md);
	}

	.selection-info {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.link-button {
		background: none;
		border: none;
		color: var(--color-accent-blue);
		font-weight: 500;
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
	}

	.link-button:hover {
		color: #2563eb;
	}

	.selection-checkbox {
		position: absolute;
		top: 1rem;
		right: 1rem;
		z-index: 2;
		cursor: pointer;
	}

	.selection-checkbox input {
		position: absolute;
		opacity: 0;
		cursor: pointer;
		height: 0;
		width: 0;
	}

	.checkbox-custom {
		display: block;
		width: 1.5rem;
		height: 1.5rem;
		background: var(--color-bg-primary);
		border: 2px solid var(--color-border-primary);
		border-radius: var(--radius-sm);
		transition:
			background-color 0.2s,
			border-color 0.2s;
	}

	.selection-checkbox input:checked + .checkbox-custom {
		background: var(--color-accent-blue);
		border-color: var(--color-accent-blue);
	}

	.selection-checkbox input:checked + .checkbox-custom::after {
		content: '';
		display: block;
		width: 0.4rem;
		height: 0.7rem;
		border: solid white;
		border-width: 0 2px 2px 0;
		transform: rotate(45deg);
		margin: 0.15rem auto;
	}

	.invoice-card.selected {
		border-color: var(--color-accent-blue);
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
	}

	.search-field {
		position: relative;
		display: flex;
		align-items: center;
		flex: 1 1 240px;
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-pill);
		padding: 0.35rem 1rem 0.35rem 2.75rem;
		box-shadow: var(--shadow-soft);
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease;
	}

	.search-field:focus-within {
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}

	.search-field input {
		width: 100%;
		border: none;
		outline: none;
		background: transparent;
		color: var(--color-text-primary);
		font-size: 0.95rem;
		padding: 0.35rem 0;
	}

	.search-icon {
		position: absolute;
		left: 1rem;
		width: 1.1rem;
		height: 1.1rem;
		color: var(--color-text-secondary);
	}

	.primary-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		border-radius: var(--radius-pill);
		border: none;
		background: var(--color-accent-blue);
		color: #ffffff;
		padding: 0.6rem 1.3rem;
		font-weight: 600;
		cursor: pointer;
		box-shadow: var(--shadow-medium);
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;
	}

	.primary-button:hover {
		transform: translateY(-1px);
		box-shadow: 0 12px 28px -18px rgba(59, 130, 246, 0.8);
	}

	.primary-button:active {
		transform: translateY(0);
	}

	.button-icon {
		width: 1rem;
		height: 1rem;
	}

	.filter-toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid rgba(148, 163, 184, 0.2);
	}

	.filter-group {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
	}

	.filter-label {
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		letter-spacing: 0.08em;
	}

	.chip-group {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.chip-group button {
		padding: 0.35rem 0.9rem;
		border-radius: var(--radius-pill);
		border: 1px solid var(--color-border-secondary);
		background: rgba(255, 255, 255, 0.65);
		color: var(--color-text-secondary);
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 0.2s ease,
			color 0.2s ease,
			border-color 0.2s ease,
			transform 0.2s ease;
	}

	.chip-group button:hover {
		transform: translateY(-1px);
	}

	.chip-group button.active {
		background: rgba(59, 130, 246, 0.12);
		border-color: rgba(59, 130, 246, 0.45);
		color: var(--color-accent-blue);
		box-shadow: var(--shadow-soft);
	}

	.invoice-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.75rem;
	}

	.invoice-card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding: 1.5rem;
		border-radius: var(--radius-lg);
		border: 1px solid var(--surface-card-border);
		background: linear-gradient(
			180deg,
			var(--surface-card-gradient-top),
			var(--surface-card-gradient-bottom)
		);
		box-shadow: var(--shadow-soft);
		overflow: hidden;
		min-height: 220px;
	}

	.invoice-card::before {
		content: '';
		position: absolute;
		inset: -40% auto auto -40%;
		width: 160px;
		height: 160px;
		background: radial-gradient(circle at center, rgba(59, 130, 246, 0.08) 0%, transparent 70%);
		pointer-events: none;
	}

	.invoice-card__top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		position: relative;
		z-index: 1;
	}

	.invoice-card__title {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.invoice-card__badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.45rem;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.6rem;
		border-radius: var(--radius-pill);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
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

	.invoice-card__amount {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
		min-width: 120px;
		text-align: right;
	}

	.meta-label {
		display: block;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-secondary);
	}

	.amount-value {
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.invoice-card__meta {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 1rem;
		position: relative;
		z-index: 1;
	}

	.meta-value {
		font-weight: 600;
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.card-divider {
		height: 1px;
		background: rgba(148, 163, 184, 0.25);
		position: relative;
		z-index: 1;
	}

	.card-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		position: relative;
		z-index: 1;
	}

	.card-actions__secondary {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.ghost-button {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border-radius: var(--radius-pill);
		border: 1px solid rgba(148, 163, 184, 0.6);
		background: rgba(255, 255, 255, 0.75);
		color: var(--color-text-primary);
		padding: 0.45rem 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background-color 0.2s ease,
			border-color 0.2s ease,
			color 0.2s ease,
			transform 0.2s ease;
	}

	.ghost-button:hover {
		transform: translateY(-1px);
		border-color: var(--color-accent-blue);
		color: var(--color-accent-blue);
	}

	.ghost-button svg {
		width: 0.95rem;
		height: 0.95rem;
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

	.ghost-button--success {
		border-color: rgba(16, 185, 129, 0.45);
		color: #047857;
	}

	.ghost-button--success:hover {
		background: rgba(16, 185, 129, 0.1);
		border-color: #10b981;
		color: #047857;
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
		color: #10b981;
	}

	.modal-icon.error {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}

	.import-result-details {
		text-align: left;
	}

	.result-success {
		color: #10b981;
		font-weight: 500;
		margin: 0.5rem 0;
	}

	.result-warning {
		color: #f59e0b;
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
		color: #ef4444;
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

	@media (max-width: 900px) {
		.page-header {
			padding: 1.75rem;
		}
	}

	@media (max-width: 768px) {
		.header-controls {
			flex-direction: column;
			align-items: stretch;
		}

		.primary-button {
			width: 100%;
			justify-content: center;
		}

		.card-actions {
			flex-direction: column;
			align-items: stretch;
		}

		.card-actions__secondary {
			width: 100%;
			justify-content: stretch;
		}

		.ghost-button,
		.ghost-button--danger,
		.ghost-button--success {
			justify-content: center;
			width: 100%;
		}

		.page-footer {
			flex-direction: column;
			align-items: stretch;
		}

		.page-footer .ghost-button--danger {
			width: 100%;
			justify-content: center;
		}
	}

	@media (max-width: 580px) {
		.invoice-card__top {
			flex-direction: column;
			align-items: flex-start;
		}

		.invoice-card__amount {
			text-align: left;
			align-items: flex-start;
		}
	}
</style>
