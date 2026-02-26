<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { goto } from '$app/navigation';
	import {
		getAllLocalInvoices,
		deleteLocalInvoice,
		clearAllLocalInvoices,
		saveLocalInvoice,
		getLocalInvoiceData,
		updateLocalInvoiceSyncStatus
	} from '$lib/localDb.js';
	import {
		syncInvoiceToCloud,
		unsyncInvoiceFromCloud,
		getInvoiceUsage,
		getAllInvoices as getAllCloudInvoices,
		deleteInvoice as deleteCloudInvoice
	} from '$lib/db.js';
	import { toUSCurrency } from '$lib/currency.js';
	import { exportSingleInvoice } from '$lib/invoiceExport.js';
	import { selectionHelpers, exportHelpers, importHelpers } from '$lib/useSelection.svelte';
	import ShareInvoiceModal from '$components/ShareInvoiceModal.svelte';
	import SendEmailModal from '$components/SendEmailModal.svelte';
	import { authClient } from '$lib/auth';
	import type { LocalInvoiceRecord, SavedInvoicesFilterMode, InvoiceData } from '$lib/types';

	const CLOUD_LIMIT = 10;

	const session = authClient.useSession();
	let isLoggedIn = $derived(!$session.isPending && !!$session.data);

	let allInvoices = $state<LocalInvoiceRecord[]>([]);
	let filteredInvoices = $state<LocalInvoiceRecord[]>([]);
	let search = $state<string>('');
	let showInvoiceDeleteModal = $state<boolean>(false);
	let showDeleteAllModal = $state<boolean>(false);
	let invoiceToDelete = $state<string | null>(null);
	let showArchived = $state<boolean>(false);
	let filterMode = $state<SavedInvoicesFilterMode>('all');
	let sourceFilter = $state<'all' | 'cloud' | 'local'>('all');
	let isLoading = $state<boolean>(true);
	let formatCurrencyFn = $state<(value: number) => string>(() => '');

	// Cloud sync state
	let cloudUsage = $state<{ count: number; limit: number }>({ count: 0, limit: CLOUD_LIMIT });
	let syncingId = $state<string | null>(null);
	let syncError = $state<string | null>(null);

	// Selection state for bulk export
	let selectedInvoices = $state<Set<string>>(new Set());
	let selectionMode = $state<boolean>(false);

	// Import state
	let fileInput = $state<HTMLInputElement | null>(null);
	let isImporting = $state<boolean>(false);
	let showImportResultModal = $state<boolean>(false);
	let importResult = $state<{ imported: number; skipped: number; errors: string[] } | null>(null);

	// Share/Email modals
	let shareInvoiceId = $state<string | null>(null);
	let shareInvoiceData = $state<InvoiceData | null>(null);
	let emailInvoiceId = $state<string | null>(null);

	$effect(() => {
		formatCurrencyFn = $toUSCurrency;
	});

	const cloudSyncedCount = $derived(allInvoices.filter((r) => r.cloudSynced).length);

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

		// Source filter (logged-in only)
		if (isLoggedIn && sourceFilter !== 'all') {
			filtered = filtered.filter((record) => {
				if (sourceFilter === 'cloud') return record.cloudSynced;
				if (sourceFilter === 'local') return !record.cloudSynced;
				return true;
			});
		}

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

		filteredInvoices = filtered;
	};

	// Reactive filter application
	$effect(() => {
		void search;
		void showArchived;
		void filterMode;
		void sourceFilter;
		void allInvoices;
		applyFilters();
	});

	const MIGRATION_KEY = 'ig.cloudMigrationDone';

	const migrateCloudToLocal = async (): Promise<void> => {
		if (typeof window === 'undefined') return;
		if (localStorage.getItem(MIGRATION_KEY) === 'true') return;

		try {
			const cloudRecords = await getAllCloudInvoices();
			if (cloudRecords.length === 0) {
				localStorage.setItem(MIGRATION_KEY, 'true');
				return;
			}

			const localRecords = await getAllLocalInvoices();
			const localIds = new Set(localRecords.map((r) => r.id));

			for (const record of cloudRecords) {
				if (!localIds.has(record.id)) {
					// Backfill cloud invoice into local storage, marked as synced
					await saveLocalInvoice(record.id, record.invoice, {
						cloudSynced: true,
						cloudId: record.id
					});
				} else {
					// Already exists locally — just mark as synced
					await updateLocalInvoiceSyncStatus(record.id, true, record.id);
				}
			}

			localStorage.setItem(MIGRATION_KEY, 'true');
		} catch (e) {
			console.warn('Cloud-to-local migration failed (will retry next visit):', e);
		}
	};

	const loadInvoices = async (): Promise<void> => {
		isLoading = true;
		try {
			// If logged in, run one-time migration from cloud to local
			if (isLoggedIn) {
				await migrateCloudToLocal();
			}

			allInvoices = await getAllLocalInvoices();

			// If logged in, fetch cloud usage
			if (isLoggedIn) {
				try {
					const usage = await getInvoiceUsage();
					cloudUsage = { count: usage.count, limit: usage.limit };
				} catch {
					// Cloud fetch failed; continue with local data
				}
			}
		} finally {
			isLoading = false;
		}
	};

	const onSearchInput = (event: Event): void => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) return;
		search = target.value;
	};

	const setArchivedView = (value: boolean): void => {
		showArchived = value;
	};

	const setFilterMode = (mode: SavedInvoicesFilterMode): void => {
		filterMode = mode;
	};

	const setSourceFilter = (mode: 'all' | 'cloud' | 'local'): void => {
		sourceFilter = mode;
	};

	const removeInvoice = async (id: string | null = invoiceToDelete): Promise<void> => {
		if (!id) return;
		// If synced, also remove from cloud
		const record = allInvoices.find((r) => r.id === id);
		if (record?.cloudSynced && isLoggedIn) {
			await deleteCloudInvoice(id).catch(() => {});
		}
		await deleteLocalInvoice(id);
		invoiceToDelete = null;
		showInvoiceDeleteModal = false;
		await loadInvoices();
	};

	const clearAllData = async (): Promise<void> => {
		await clearAllLocalInvoices();
		allInvoices = [];
		filteredInvoices = [];
		showDeleteAllModal = false;
	};

	const archiveInvoice = async (id: string): Promise<void> => {
		const data = await getLocalInvoiceData(id);
		if (data) {
			data.archived = true;
			await saveLocalInvoice(id, data);
			await loadInvoices();
		}
	};

	const unarchiveInvoice = async (id: string): Promise<void> => {
		const data = await getLocalInvoiceData(id);
		if (data) {
			data.archived = false;
			await saveLocalInvoice(id, data);
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

	const editInvoice = (id: string): void => {
		goto(`/?invoice=${id}#edit`);
	};

	// Cloud sync actions
	const syncToCloud = async (id: string): Promise<void> => {
		if (syncingId) return;
		syncError = null;
		syncingId = id;

		try {
			const data = await getLocalInvoiceData(id);
			if (!data) {
				syncError = 'Invoice not found locally.';
				return;
			}

			const result = await syncInvoiceToCloud(id, data);
			if (!result.success) {
				syncError = result.error || 'Failed to sync to cloud.';
				return;
			}

			await updateLocalInvoiceSyncStatus(id, true, id);
			await loadInvoices();
		} catch {
			syncError = 'Failed to sync. Please try again.';
		} finally {
			syncingId = null;
		}
	};

	const removeFromCloud = async (id: string): Promise<void> => {
		if (syncingId) return;
		syncError = null;
		syncingId = id;

		try {
			const result = await unsyncInvoiceFromCloud(id);
			if (!result.success) {
				syncError = result.error || 'Failed to remove from cloud.';
				return;
			}

			await updateLocalInvoiceSyncStatus(id, false, null);
			await loadInvoices();
		} catch {
			syncError = 'Failed to remove from cloud. Please try again.';
		} finally {
			syncingId = null;
		}
	};

	// Share
	const openShareModal = async (id: string): Promise<void> => {
		const data = await getLocalInvoiceData(id);
		shareInvoiceId = id;
		shareInvoiceData = data ?? null;
	};

	const closeShareModal = (): void => {
		shareInvoiceId = null;
		shareInvoiceData = null;
	};

	// Email
	const openEmailModal = (id: string): void => {
		emailInvoiceId = id;
	};

	const closeEmailModal = (): void => {
		emailInvoiceId = null;
	};

	// Selection functions for bulk operations (using shared helpers)
	const toggleSelection = (id: string): void => {
		selectedInvoices = selectionHelpers.toggle(selectedInvoices, id);
	};

	const selectAll = (): void => {
		selectedInvoices = selectionHelpers.selectAll(filteredInvoices.map((r) => r.id));
	};

	const deselectAll = (): void => {
		selectedInvoices = selectionHelpers.deselectAll();
	};

	const toggleSelectionMode = (): void => {
		selectionMode = !selectionMode;
		if (!selectionMode) {
			selectedInvoices = selectionHelpers.deselectAll();
		}
	};

	// Export functions
	const getInvoicesForExport = async () =>
		allInvoices.map((r) => ({ id: r.id, invoice: r.invoice }));

	const exportAllInvoices = async (): Promise<void> => {
		if (allInvoices.length === 0) return;
		await exportHelpers.exportAll(getInvoicesForExport);
	};

	const exportSelectedInvoices = async (): Promise<void> => {
		if (selectedInvoices.size === 0) return;
		await exportHelpers.exportSelected(getInvoicesForExport, selectedInvoices);
		selectionMode = false;
		selectedInvoices = selectionHelpers.deselectAll();
	};

	const exportInvoice = (invoice: InvoiceData): void => {
		exportSingleInvoice(invoice);
	};

	// Import functions
	const triggerImport = (): void => {
		importHelpers.triggerFileInput(fileInput);
	};

	const handleFileSelect = async (event: Event): Promise<void> => {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		isImporting = true;
		try {
			const result = await importHelpers.handleFileSelect(file, saveLocalInvoice);
			importResult = result;
			showImportResultModal = true;
			await loadInvoices();
		} finally {
			isImporting = false;
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

<svelte:head>
	<title>Invoice History — FreeInvoice</title>
	<meta
		name="description"
		content="View, manage, and export your saved invoices. Filter by status, search, and sync across devices."
	/>
	<meta property="og:title" content="Invoice History — FreeInvoice" />
	<meta
		property="og:description"
		content="View, manage, and export your saved invoices. Filter by status, search, and sync across devices."
	/>
	<meta property="og:url" content="https://freeinvoice.info/history" />
</svelte:head>

<section class="history-page app-container app-page">
	<div class="history-shell">
		<!-- Title Row -->
		<div class="history-title-row">
			<div class="history-title-cluster">
				<div class="history-file-badge">
					<svg class="history-file-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clip-rule="evenodd" />
					</svg>
				</div>
				<div class="history-title-stack">
					<h1 class="history-document-title">Invoice History</h1>
					<div class="history-menu-bar">
						<a href="/" class="history-menu-trigger" onclick={(e) => { e.preventDefault(); goto('/'); }}>Editor</a>
						<span class="history-subtitle">
							{#if isLoggedIn}
								Stored locally &middot; Synced to cloud
							{:else}
								Stored locally in this browser
							{/if}
						</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Toolbar Row -->
		<div class="history-toolbar-row">
			<label class="history-search-field">
				<span class="sr-only">Search invoices</span>
				<svg class="history-search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="m17.5 17.5-3.6-3.6m1.1-4.4a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Z" />
				</svg>
				<input type="search" placeholder="Search..." bind:value={search} oninput={onSearchInput} />
			</label>

			<div class="history-toolbar-divider"></div>

			<div class="history-toolbar-group">
				<button type="button" class="history-chip" class:active={!showArchived} onclick={() => setArchivedView(false)} aria-pressed={!showArchived}>Active</button>
				<button type="button" class="history-chip" class:active={showArchived} onclick={() => setArchivedView(true)} aria-pressed={showArchived}>Archived</button>
			</div>

			<div class="history-toolbar-divider"></div>

			<div class="history-toolbar-group">
				<button type="button" class="history-chip" class:active={filterMode === 'all'} onclick={() => setFilterMode('all')} aria-pressed={filterMode === 'all'}>All</button>
				<button type="button" class="history-chip" class:active={filterMode === 'draft'} onclick={() => setFilterMode('draft')} aria-pressed={filterMode === 'draft'}>Drafts</button>
				<button type="button" class="history-chip" class:active={filterMode === 'finalized'} onclick={() => setFilterMode('finalized')} aria-pressed={filterMode === 'finalized'}>Finalized</button>
			</div>

			{#if isLoggedIn}
				<div class="history-toolbar-divider"></div>
				<div class="history-toolbar-group">
					<button type="button" class="history-chip" class:active={sourceFilter === 'all'} onclick={() => setSourceFilter('all')} aria-pressed={sourceFilter === 'all'}>All</button>
					<button type="button" class="history-chip" class:active={sourceFilter === 'cloud'} onclick={() => setSourceFilter('cloud')} aria-pressed={sourceFilter === 'cloud'}>Synced</button>
					<button type="button" class="history-chip" class:active={sourceFilter === 'local'} onclick={() => setSourceFilter('local')} aria-pressed={sourceFilter === 'local'}>Local</button>
				</div>
			{/if}

			<div class="history-toolbar-spacer"></div>

			<input type="file" accept=".json" class="sr-only" bind:this={fileInput} onchange={handleFileSelect} />

			<button class="history-tool-button" type="button" onclick={triggerImport} disabled={isImporting}>
				<svg class="history-tool-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" />
					<path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
				</svg>
				<span class="history-tool-label">{isImporting ? $_('export_import.importing') : $_('export_import.import')}</span>
			</button>

			{#if allInvoices.length > 0}
				<button class="history-tool-button" type="button" onclick={toggleSelectionMode}>
					<svg class="history-tool-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />
					</svg>
					<span class="history-tool-label">{selectionMode ? $_('export_import.cancel') : $_('export_import.select')}</span>
				</button>
				<button class="history-tool-button" type="button" onclick={exportAllInvoices}>
					<svg class="history-tool-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path d="M10.75 6.75a.75.75 0 0 0-1.5 0v6.614l-2.955-3.129a.75.75 0 0 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 1 0-1.09-1.03l-2.955 3.129V6.75Z" />
						<path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
					</svg>
					<span class="history-tool-label">{$_('export_import.export_all')}</span>
				</button>
			{/if}

			<button class="history-tool-button history-tool-button--primary" type="button" onclick={() => goto('/')}>
				<svg class="history-tool-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path fill-rule="evenodd" d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 0 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z" clip-rule="evenodd" />
				</svg>
				<span class="history-tool-label">New</span>
			</button>
		</div>

		<!-- Cloud Info Bar (logged-in only) -->
		{#if isLoggedIn}
			<div class="history-cloud-bar">
				<svg class="history-cloud-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path d="M1 12.5A4.5 4.5 0 0 1 5.5 8H6a5.5 5.5 0 0 1 10.906 1.182A3.5 3.5 0 0 1 16.5 16h-11A4.5 4.5 0 0 1 1 12.5Z" />
				</svg>
				<span>Cloud sync: <strong>{cloudSyncedCount}/{CLOUD_LIMIT}</strong> used</span>
				{#if syncError}
					<span class="history-cloud-error">{syncError}</span>
				{/if}
			</div>
		{/if}

		<!-- Selection Bar -->
		{#if selectionMode}
			<div class="history-selection-bar">
				<span class="history-selection-count">{selectedInvoices.size} {$_('export_import.selected')}</span>
				<span class="history-selection-sep">&middot;</span>
				<button class="history-link-button" type="button" onclick={selectAll}>{$_('export_import.select_all')}</button>
				<span class="history-selection-sep">&middot;</span>
				<button class="history-link-button" type="button" onclick={deselectAll}>{$_('export_import.deselect_all')}</button>
				<span class="history-selection-sep">&middot;</span>
				<button class="history-tool-button history-tool-button--primary" type="button" onclick={exportSelectedInvoices} disabled={selectedInvoices.size === 0}>
					<svg class="history-tool-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path d="M10.75 6.75a.75.75 0 0 0-1.5 0v6.614l-2.955-3.129a.75.75 0 0 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 1 0-1.09-1.03l-2.955 3.129V6.75Z" />
						<path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
					</svg>
					<span class="history-tool-label">{$_('export_import.export_selected')}</span>
				</button>
			</div>
		{/if}

		<!-- Invoice List -->
		{#if isLoading}
			<div class="history-state-card">
				<div class="history-spinner" aria-hidden="true"></div>
				<p>Loading your invoices...</p>
			</div>
		{:else if filteredInvoices.length === 0}
			<div class="history-state-card">
				<h2>No invoices yet</h2>
				<p>Start creating an invoice and it will automatically save here.</p>
				<button class="history-primary-button" type="button" onclick={() => goto('/')}>
					<svg class="history-button-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path fill-rule="evenodd" d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 0 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z" clip-rule="evenodd" />
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
				{#each filteredInvoices as record (record.id)}
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
								<span
									class="status-badge {record.invoice.draft
										? 'status-badge--draft'
										: 'status-badge--finalized'}"
								>
									{record.invoice.draft ? 'Draft' : 'Final'}
								</span>
								{#if record.invoice.archived}
									<span class="status-badge status-badge--archived">Archived</span>
								{/if}
								{#if isLoggedIn}
									{#if record.cloudSynced}
										<span class="status-badge status-badge--synced">Synced</span>
									{:else}
										<span class="status-badge status-badge--local">Local</span>
									{/if}
								{/if}
							</div>
							<div class="col-amount">
								<span class="amount-value">{formatAmount(balanceDueAmount(record.invoice))}</span>
							</div>
							<div class="col-actions">
								<button
									class="action-btn"
									type="button"
									onclick={() => openInvoice(record.id)}
									title="Open"
									aria-label="Open invoice"
								>
									<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
										<path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
										<path
											fill-rule="evenodd"
											d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
											clip-rule="evenodd"
										/>
									</svg>
								</button>
								<button
									class="action-btn"
									type="button"
									onclick={() => exportInvoice(record.invoice)}
									title={$_('export_import.export')}
									aria-label={$_('export_import.export')}
								>
									<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
										<path
											d="M10.75 6.75a.75.75 0 0 0-1.5 0v6.614l-2.955-3.129a.75.75 0 0 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 1 0-1.09-1.03l-2.955 3.129V6.75Z"
										/>
										<path
											d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z"
										/>
									</svg>
								</button>
								{#if isLoggedIn}
									{#if record.cloudSynced}
										<button
											class="action-btn action-btn--cloud"
											type="button"
											onclick={() => openShareModal(record.id)}
											title="Share"
											aria-label="Share invoice"
										>
											<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
												<path
													d="M13 4.5a2.5 2.5 0 1 1 .702 1.737L6.97 9.604a2.518 2.518 0 0 1 0 .799l6.733 3.347A2.5 2.5 0 1 1 13 15.5a2.502 2.502 0 0 1 .168-.862L6.396 11.3a2.5 2.5 0 1 1 0-2.6l6.772-3.338A2.504 2.504 0 0 1 13 4.5Z"
												/>
											</svg>
										</button>
										<button
											class="action-btn action-btn--unsync"
											type="button"
											onclick={() => removeFromCloud(record.id)}
											title="Remove from cloud"
											aria-label="Remove from cloud"
											disabled={syncingId === record.id}
										>
											{#if syncingId === record.id}
												<span class="action-spinner"></span>
											{:else}
												<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
													<path
														d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
													/>
												</svg>
											{/if}
										</button>
									{:else}
										<button
											class="action-btn action-btn--sync"
											type="button"
											onclick={() => syncToCloud(record.id)}
											title={cloudSyncedCount >= CLOUD_LIMIT
												? 'All cloud slots used'
												: 'Sync to cloud'}
											aria-label="Sync to cloud"
											disabled={syncingId === record.id ||
												cloudSyncedCount >= CLOUD_LIMIT}
										>
											{#if syncingId === record.id}
												<span class="action-spinner"></span>
											{:else}
												<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
													<path
														d="M1 12.5A4.5 4.5 0 0 1 5.5 8H6a5.5 5.5 0 0 1 10.906 1.182A3.5 3.5 0 0 1 16.5 16h-11A4.5 4.5 0 0 1 1 12.5Z"
													/>
												</svg>
											{/if}
										</button>
									{/if}
								{/if}
								{#if record.invoice.archived}
									<button
										class="action-btn action-btn--success"
										type="button"
										onclick={() => unarchiveInvoice(record.id)}
										title="Unarchive"
										aria-label="Unarchive invoice"
									>
										<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
											<path
												fill-rule="evenodd"
												d="M10 3a7 7 0 0 0-6.492 4.41.75.75 0 0 0 1.384.558A5.5 5.5 0 1 1 4.5 10H3a.75.75 0 0 0 0 1.5h3.75a.75.75 0 0 0 .75-.75V7a.75.75 0 0 0-1.5 0v1.332A7.001 7.001 0 0 1 17 10a7 7 0 0 0-7-7Z"
												clip-rule="evenodd"
											/>
										</svg>
									</button>
								{:else}
									<button
										class="action-btn"
										type="button"
										onclick={() => archiveInvoice(record.id)}
										title="Archive"
										aria-label="Archive invoice"
									>
										<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
											<path
												d="M4 3a2 2 0 0 0-2 2v1.5A1.5 1.5 0 0 0 3.5 8H4v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8h.5A1.5 1.5 0 0 0 18 6.5V5a2 2 0 0 0-2-2H4Zm3 6.5A.5.5 0 0 1 7.5 9h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5ZM4 5h12v1.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V5Z"
											/>
										</svg>
									</button>
								{/if}
								<button
									class="action-btn action-btn--danger"
									type="button"
									onclick={() => confirmDeleteInvoice(record.id)}
									title="Delete"
									aria-label="Delete invoice"
								>
									<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
										<path
											fill-rule="evenodd"
											d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
											clip-rule="evenodd"
										/>
									</svg>
								</button>
							</div>
						</div>
					{/if}
				{/each}
			</div>
		{/if}

		<!-- Footer -->
		<footer class="history-footer">
			{#if !isLoggedIn}
				<div class="history-signin-bar">
					<svg class="history-signin-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path d="M1 12.5A4.5 4.5 0 0 1 5.5 8H6a5.5 5.5 0 0 1 10.906 1.182A3.5 3.5 0 0 1 16.5 16h-11A4.5 4.5 0 0 1 1 12.5Z" />
					</svg>
					<span>Sign in to sync invoices to the cloud.</span>
					<a href="/api/auth/signin/google" class="history-signin-link">Sign In</a>
				</div>
			{/if}

			<div class="history-footer-row">
				<div class="history-footer-info">
					<svg class="history-info-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clip-rule="evenodd" />
					</svg>
					<span>Invoices stored locally in your browser.</span>
				</div>
				{#if allInvoices.length > 0}
					<button class="history-delete-all-btn" type="button" onclick={confirmDeleteAll}>
						<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
							<path fill-rule="evenodd" d="M8.75 3a1.75 1.75 0 0 0-1.744 1.61l-.067.676H4a.75.75 0 0 0 0 1.5h.577l.641 9.137A2.25 2.25 0 0 0 7.463 18h5.074a2.25 2.25 0 0 0 2.245-2.077l.641-9.137H16a.75.75 0 0 0 0-1.5h-2.94l-.067-.676A1.75 1.75 0 0 0 11.25 3h-2.5Zm3.146 3.286-.036-.36A.25.25 0 0 0 11.25 5.5h-2.5a.25.25 0 0 0-.249.226l-.036.36h3.432Zm-3.146 3.964a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5Zm4 0a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5Z" clip-rule="evenodd" />
						</svg>
						<span>Delete All</span>
					</button>
				{/if}
			</div>
		</footer>
	</div>

	<!-- Delete Single Invoice Modal -->
	{#if showInvoiceDeleteModal}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="modal-backdrop"
			onclick={cancelDelete}
			onkeydown={(e) => e.key === 'Escape' && cancelDelete()}
		>
			<div
				class="modal"
				role="dialog"
				aria-modal="true"
				aria-labelledby="delete-invoice-title"
				onpointerdown={(e) => e.stopPropagation()}
			>
				<h2 id="delete-invoice-title">Delete this invoice?</h2>
				<p>
					This will permanently delete this invoice{allInvoices.find((r) => r.id === invoiceToDelete)
						?.cloudSynced
						? ' from both local storage and the cloud'
						: ' from local storage'}. This action cannot be undone.
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
		<div
			class="modal-backdrop"
			onclick={cancelDeleteAll}
			onkeydown={(e) => e.key === 'Escape' && cancelDeleteAll()}
		>
			<div
				class="modal modal--warning"
				role="dialog"
				aria-modal="true"
				aria-labelledby="delete-all-title"
				onpointerdown={(e) => e.stopPropagation()}
			>
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
					This will permanently delete <strong>all</strong> your locally stored invoices. This
					action cannot be undone.
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
		<div
			class="modal-backdrop"
			onclick={closeImportResultModal}
			onkeydown={(e) => e.key === 'Escape' && closeImportResultModal()}
		>
			<div
				class="modal"
				role="dialog"
				aria-modal="true"
				aria-labelledby="import-result-title"
				onpointerdown={(e) => e.stopPropagation()}
			>
				<div
					class="modal-icon"
					class:success={importResult.imported > 0}
					class:error={importResult.errors.length > 0 && importResult.imported === 0}
				>
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
							{importResult.imported}
							{$_('export_import.invoices_imported')}
						</p>
					{/if}
					{#if importResult.skipped > 0}
						<p class="result-warning">
							{importResult.skipped}
							{$_('export_import.invoices_skipped')}
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

	<!-- Share Invoice Modal -->
	{#if shareInvoiceId}
		<ShareInvoiceModal
			invoiceId={shareInvoiceId}
			invoice={shareInvoiceData}
			onClose={closeShareModal}
		/>
	{/if}

	<!-- Send Email Modal -->
	{#if emailInvoiceId}
		{@const emailRecord = allInvoices.find((r) => r.id === emailInvoiceId)}
		<SendEmailModal
			invoiceId={emailInvoiceId}
			invoiceNumber={emailRecord?.invoice?.invoiceNumber}
			recipientName={emailRecord?.invoice?.invoiceTo}
			onClose={closeEmailModal}
		/>
	{/if}
</section>

<style>
	/* ── Shell ──────────────────────────────────── */
	.history-shell {
		display: flex;
		flex-direction: column;
	}

	/* ── Title Row (mirrors .docs-title-row) ───── */
	.history-title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.52rem 0.8rem;
		width: 100%;
	}

	.history-title-cluster {
		display: flex;
		align-items: center;
		gap: 0.62rem;
		min-width: 0;
		flex: 1;
	}

	.history-file-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.8rem;
		height: 1.8rem;
		border-radius: 0.45rem;
		background: color-mix(in srgb, var(--color-accent-blue) 14%, var(--color-bg-primary));
		color: var(--color-accent-blue);
		flex-shrink: 0;
	}

	.history-file-icon {
		width: 1.06rem;
		height: 1.06rem;
	}

	.history-title-stack {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
	}

	.history-document-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.25;
		color: var(--color-text-primary);
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
	}

	.history-menu-bar {
		display: flex;
		align-items: center;
		gap: 0.2rem;
	}

	.history-menu-trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.22rem;
		padding: 0.24rem 0.44rem;
		border-radius: 0.4rem;
		border: 1px solid transparent;
		background: transparent;
		color: var(--color-text-primary);
		font-size: 0.8rem;
		font-weight: 500;
		line-height: 1.15;
		cursor: pointer;
		text-decoration: none;
		transition:
			background-color var(--motion-fast) var(--motion-ease),
			border-color var(--motion-fast) var(--motion-ease);
	}

	.history-menu-trigger:hover {
		background: var(--color-bg-secondary);
		border-color: var(--color-border-primary);
	}

	.history-subtitle {
		font-size: 0.74rem;
		color: var(--color-text-muted);
		padding: 0.24rem 0.2rem;
	}

	/* ── Toolbar Row (mirrors .docs-toolbar-row) ─ */
	.history-toolbar-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.2rem;
		padding: 0.25rem 0.5rem;
		border-top: 0;
		border-bottom: 1px solid var(--color-border-primary);
		background: var(--color-bg-secondary);
		width: 100%;
	}

	.history-toolbar-group {
		display: inline-flex;
		align-items: center;
		gap: 0.1rem;
		flex-wrap: wrap;
	}

	.history-toolbar-divider {
		width: 1px;
		height: 1.2rem;
		background: var(--color-border-primary);
		margin: 0 0.15rem;
		opacity: 0.6;
	}

	.history-toolbar-spacer {
		flex: 1 1 auto;
		min-width: 0.5rem;
	}

	/* ── Search (compact) ────────────────────────── */
	.history-search-field {
		position: relative;
		display: inline-flex;
		align-items: center;
		max-width: 200px;
		background: transparent;
		border: 1px solid var(--color-border-primary);
		border-radius: 0.25rem;
		padding: 0 0.5rem 0 1.7rem;
		height: 1.75rem;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.history-search-field:focus-within {
		border-color: var(--color-accent-blue);
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.12);
	}

	.history-search-field input {
		width: 100%;
		border: none;
		outline: none;
		background: transparent;
		color: var(--color-text-primary);
		font-size: 0.78rem;
		padding: 0;
		height: 100%;
	}

	.history-search-icon {
		position: absolute;
		left: 0.45rem;
		width: 0.82rem;
		height: 0.82rem;
		color: var(--color-text-secondary);
	}

	/* ── Chip buttons (compact toolbar filters) ─── */
	.history-chip {
		display: inline-flex;
		align-items: center;
		height: 1.5rem;
		padding: 0 0.44rem;
		border-radius: 0.25rem;
		border: none;
		background: transparent;
		color: var(--color-text-secondary);
		font-size: 0.72rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color var(--motion-fast) var(--motion-ease),
			color var(--motion-fast) var(--motion-ease);
	}

	.history-chip:hover {
		background: color-mix(in srgb, var(--color-text-primary) 8%, transparent);
	}

	.history-chip.active {
		background: color-mix(in srgb, var(--color-accent-blue) 14%, transparent);
		color: var(--color-accent-blue);
		font-weight: 600;
	}

	/* ── Tool buttons (mirrors .docs-tool-button) ─ */
	.history-tool-button {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		height: 1.75rem;
		padding: 0 0.5rem;
		border-radius: 0.25rem;
		border: none;
		background: transparent;
		color: var(--color-text-primary);
		font-size: 0.78rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color var(--motion-fast) var(--motion-ease);
	}

	.history-tool-button:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-text-primary) 8%, transparent);
	}

	.history-tool-button:active:not(:disabled) {
		background: color-mix(in srgb, var(--color-text-primary) 14%, transparent);
	}

	.history-tool-button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.history-tool-button--primary {
		color: var(--color-accent-blue);
		font-weight: 600;
	}

	.history-tool-button--primary:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-accent-blue) 10%, transparent);
	}

	.history-tool-icon {
		width: 0.88rem;
		height: 0.88rem;
		flex-shrink: 0;
	}

	/* ── Cloud Info Bar (single line) ─────────────── */
	.history-cloud-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.8rem;
		font-size: 0.76rem;
		color: var(--color-text-secondary);
		border-bottom: 1px solid var(--color-border-primary);
		background: color-mix(in srgb, var(--color-accent-blue) 4%, var(--color-bg-primary));
	}

	.history-cloud-icon {
		width: 0.88rem;
		height: 0.88rem;
		color: var(--color-accent-blue);
		flex-shrink: 0;
	}

	.history-cloud-bar strong {
		color: var(--color-text-primary);
	}

	.history-cloud-error {
		margin-left: auto;
		padding: 0.15rem 0.45rem;
		border-radius: var(--radius-sm);
		background: rgba(239, 68, 68, 0.1);
		color: var(--color-error, #ef4444);
		font-size: 0.72rem;
		font-weight: 500;
	}

	/* ── Selection Bar ────────────────────────────── */
	.history-selection-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.8rem;
		font-size: 0.78rem;
		border-bottom: 1px solid var(--color-border-primary);
		background: color-mix(in srgb, var(--color-accent-blue) 6%, var(--color-bg-primary));
	}

	.history-selection-count {
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.history-selection-sep {
		color: var(--color-text-muted);
	}

	.history-link-button {
		background: none;
		border: none;
		color: var(--color-accent-blue);
		font-size: 0.76rem;
		font-weight: 500;
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
	}

	.history-link-button:hover {
		opacity: 0.8;
	}

	/* ── Sign-in Bar (compact) ────────────────────── */
	.history-signin-bar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.8rem;
		font-size: 0.78rem;
		color: var(--color-text-secondary);
		border-bottom: 1px solid color-mix(in srgb, var(--color-accent-blue) 20%, transparent);
		background: color-mix(in srgb, var(--color-accent-blue) 4%, var(--color-bg-primary));
	}

	.history-signin-icon {
		width: 0.88rem;
		height: 0.88rem;
		color: var(--color-accent-blue);
		flex-shrink: 0;
	}

	.history-signin-link {
		margin-left: auto;
		padding: 0.2rem 0.6rem;
		border-radius: var(--radius-sm);
		background: var(--color-accent-blue);
		color: #ffffff;
		font-size: 0.72rem;
		font-weight: 600;
		text-decoration: none;
		transition: background 0.15s;
	}

	.history-signin-link:hover {
		background: color-mix(in srgb, var(--color-accent-blue) 85%, black);
	}

	/* ── Invoice List (no card wrapper) ───────────── */
	.invoice-list {
		display: flex;
		flex-direction: column;
		border-bottom: 1px solid var(--surface-paper-border);
	}

	.invoice-list__header {
		display: grid;
		grid-template-columns: 40px 1.5fr 1fr 100px 140px 100px 140px;
		gap: 0.5rem;
		padding: 0.5rem 0.8rem;
		background: var(--surface-paper-muted);
		border-bottom: 1px solid var(--surface-paper-border);
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-secondary);
	}

	.invoice-row {
		display: grid;
		grid-template-columns: 40px 1.5fr 1fr 100px 140px 100px 140px;
		gap: 0.5rem;
		padding: 0.5rem 0.8rem;
		align-items: center;
		border-bottom: 1px solid var(--surface-paper-border);
		transition: background-color 0.15s;
	}

	.invoice-row:last-child {
		border-bottom: none;
	}

	.invoice-row:hover {
		background: var(--surface-paper-muted);
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
		font-size: 0.84rem;
		font-weight: 600;
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.invoice-number {
		font-size: 0.72rem;
		color: var(--color-text-secondary);
		font-family: monospace;
	}

	.col-client {
		min-width: 0;
	}

	.client-name {
		font-size: 0.84rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--color-text-primary);
	}

	.col-date {
		font-size: 0.78rem;
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
		padding: 0.12rem 0.38rem;
		border-radius: var(--radius-sm);
		font-size: 0.62rem;
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

	.status-badge--synced {
		background: rgba(59, 130, 246, 0.15);
		color: #2563eb;
	}

	.status-badge--local {
		background: rgba(148, 163, 184, 0.15);
		color: var(--color-text-secondary);
	}

	.col-amount {
		font-size: 0.84rem;
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
		gap: 0.2rem;
		justify-content: flex-end;
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.65rem;
		height: 1.65rem;
		border: 1px solid var(--surface-paper-border);
		border-radius: var(--radius-sm);
		background: var(--surface-paper);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.15s;
	}

	.action-btn:hover {
		background: var(--surface-paper-muted);
		color: var(--color-accent-blue);
		border-color: var(--color-accent-blue);
	}

	.action-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.action-btn svg {
		width: 0.82rem;
		height: 0.82rem;
	}

	.action-btn--danger:hover {
		border-color: var(--color-error, #ef4444);
		color: var(--color-error, #ef4444);
		background: color-mix(in srgb, var(--color-error, #ef4444) 8%, transparent);
	}

	.action-btn--success:hover {
		border-color: var(--color-success, #10b981);
		color: color-mix(in srgb, var(--color-success, #10b981) 70%, black);
		background: color-mix(in srgb, var(--color-success, #10b981) 8%, transparent);
	}

	.action-btn--sync:hover {
		border-color: var(--color-accent-blue);
		color: var(--color-accent-blue);
		background: rgba(59, 130, 246, 0.08);
	}

	.action-btn--unsync:hover {
		border-color: #d97706;
		color: #d97706;
		background: rgba(217, 119, 6, 0.08);
	}

	.action-btn--cloud:hover {
		border-color: #059669;
		color: #059669;
		background: rgba(5, 150, 105, 0.08);
	}

	.action-spinner {
		display: block;
		width: 0.72rem;
		height: 0.72rem;
		border: 2px solid var(--surface-paper-border);
		border-top-color: var(--color-accent-blue);
		border-radius: 999px;
		animation: spin 0.75s linear infinite;
	}

	/* ── Row Checkbox ──────────────────────────────── */
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
		width: 0.92rem;
		height: 0.92rem;
		background: var(--surface-paper);
		border: 2px solid var(--surface-paper-border);
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
		width: 0.22rem;
		height: 0.4rem;
		border: solid white;
		border-width: 0 2px 2px 0;
		transform: rotate(45deg);
		margin: 0.08rem auto;
	}

	/* ── Footer ────────────────────────────────────── */
	.history-footer {
		display: flex;
		flex-direction: column;
	}

	.history-footer-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.5rem 0.8rem;
	}

	.history-footer-info {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.74rem;
		color: var(--color-text-muted);
	}

	.history-footer-info span {
		margin: 0;
	}

	.history-info-icon {
		flex-shrink: 0;
		width: 0.82rem;
		height: 0.82rem;
		color: var(--color-text-muted);
	}

	.history-delete-all-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		height: 1.75rem;
		padding: 0 0.5rem;
		border-radius: 0.25rem;
		border: none;
		background: transparent;
		color: color-mix(in srgb, var(--color-error, #ef4444) 80%, black);
		font-size: 0.76rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color var(--motion-fast) var(--motion-ease);
	}

	.history-delete-all-btn:hover {
		background: color-mix(in srgb, var(--color-error, #ef4444) 8%, transparent);
		color: var(--color-error, #ef4444);
	}

	.history-delete-all-btn svg {
		width: 0.82rem;
		height: 0.82rem;
	}

	/* ── State cards ───────────────────────────────── */
	.history-state-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 3rem;
		text-align: center;
		border-bottom: 1px solid var(--surface-paper-border);
	}

	.history-state-card h2 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.history-state-card p {
		margin: 0;
		font-size: 0.84rem;
		color: var(--color-text-secondary);
	}

	.history-spinner {
		width: 1.75rem;
		height: 1.75rem;
		border: 3px solid var(--surface-paper-border);
		border-top-color: var(--color-accent-blue);
		border-radius: 999px;
		animation: spin 0.75s linear infinite;
	}

	.history-primary-button {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		height: 1.75rem;
		padding: 0 0.65rem;
		border-radius: 0.25rem;
		border: none;
		background: var(--color-accent-blue);
		color: #ffffff;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}

	.history-primary-button:hover {
		background: color-mix(in srgb, var(--color-accent-blue) 85%, black);
	}

	.history-button-icon {
		width: 0.88rem;
		height: 0.88rem;
	}

	/* ── Modals (unchanged) ────────────────────────── */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.5);
		z-index: 100;
	}

	.modal {
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		max-width: 420px;
		width: 90%;
	}

	.modal h2 {
		margin: 0 0 0.75rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.modal p {
		margin: 0 0 1.25rem;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		line-height: 1.5;
	}

	.modal-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.modal-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		border-radius: var(--radius-md);
		margin-bottom: 1rem;
		background: rgba(251, 146, 60, 0.15);
		color: #d97706;
	}

	.modal-icon.success {
		background: rgba(16, 185, 129, 0.15);
		color: #059669;
	}

	.modal-icon.error {
		background: rgba(239, 68, 68, 0.15);
		color: #dc2626;
	}

	.modal-icon svg {
		width: 1.5rem;
		height: 1.5rem;
	}

	.import-result-details {
		margin-bottom: 1rem;
	}

	.result-success {
		color: #059669;
		font-weight: 500;
		margin: 0 0 0.25rem;
	}

	.result-warning {
		color: #d97706;
		font-weight: 500;
		margin: 0 0 0.25rem;
	}

	.result-errors {
		margin-top: 0.5rem;
	}

	.result-error {
		color: #dc2626;
		font-size: 0.8rem;
		margin: 0 0 0.15rem;
	}

	.danger-button {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		border-radius: var(--radius-md);
		border: none;
		background: var(--color-error, #ef4444);
		color: #ffffff;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
	}

	.danger-button:hover {
		background: color-mix(in srgb, var(--color-error, #ef4444) 85%, black);
	}

	.ghost-button {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--surface-paper-border);
		background: var(--surface-paper);
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

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ── Mobile: 900px ─────────────────────────────── */
	@media (max-width: 900px) {
		.history-toolbar-row {
			overflow-x: auto;
			flex-wrap: nowrap;
			-webkit-overflow-scrolling: touch;
		}

		.history-toolbar-group {
			flex-wrap: nowrap;
			flex-shrink: 0;
		}

		.history-search-field {
			flex-shrink: 0;
		}

		.history-toolbar-divider {
			flex-shrink: 0;
		}

		.history-tool-button {
			flex-shrink: 0;
		}

		.history-tool-label {
			display: none;
		}

		.invoice-list__header {
			display: none;
		}

		.invoice-row {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
			padding: 0.65rem 0.8rem;
		}

		.col-checkbox {
			order: -1;
		}

		.col-title {
			flex: 1;
			min-width: 140px;
		}

		.col-client {
			flex-basis: 100%;
		}

		.col-date,
		.col-amount {
			font-size: 0.72rem;
		}

		.col-status {
			flex-basis: 100%;
		}

		.col-actions {
			flex-basis: 100%;
			justify-content: flex-start;
		}

		.history-signin-bar {
			flex-wrap: wrap;
		}

		.history-selection-bar {
			flex-wrap: wrap;
		}
	}

	/* ── Mobile: 480px ─────────────────────────────── */
	@media (max-width: 480px) {
		.history-search-field {
			max-width: 100%;
			flex: 1 1 100%;
		}

		.history-toolbar-row {
			flex-wrap: wrap;
		}

		.history-toolbar-group {
			flex-wrap: wrap;
		}

		.history-footer-row {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
