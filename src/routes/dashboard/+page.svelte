<script lang="ts">
	import { tick } from 'svelte';
	import { _ } from 'svelte-i18n';
	import type { PageData } from './$types';
	import type { DashboardInvoice } from './+page.server';
	import type { InvoiceData } from '$lib/types';
	import DashboardStats from '$components/dashboard/DashboardStats.svelte';
	import DashboardFilters from '$components/dashboard/DashboardFilters.svelte';
	import InvoiceTableView from '$components/dashboard/InvoiceTableView.svelte';
	import InvoiceCardGrid from '$components/dashboard/InvoiceCardGrid.svelte';
	import ShareInvoiceModal from '$components/ShareInvoiceModal.svelte';
	import SendEmailModal from '$components/SendEmailModal.svelte';
	import InvoicePreviewWrapper from '$components/InvoicePreviewWrapper.svelte';
	import {
		generatePdfFromPreview,
		waitForPreviewImages,
		downloadBlob,
		type PageSettings
	} from '$lib/pdfGenerator';
	import { saveInvoice, getAllInvoices } from '$lib/db';
	import { selectionHelpers, exportHelpers, importHelpers } from '$lib/useSelection.svelte';
	import { pageSettings } from '../../stores/pageSettingsStore';

	let { data }: { data: PageData } = $props();

	// Core data
	let allInvoices = $state<DashboardInvoice[]>(data.invoices);
	let filteredInvoices = $state<DashboardInvoice[]>([]);

	// Filter state
	let search = $state<string>('');
	let showArchived = $state<boolean>(false);
	let filterMode = $state<'all' | 'draft' | 'finalized'>('all');

	// UI state
	let viewMode = $state<'table' | 'cards'>('table'); // Desktop view toggle
	let deletingId = $state<string | null>(null);
	let downloadingId = $state<string | null>(null);
	let archivingId = $state<string | null>(null);
	let showDeleteConfirm = $state<string | null>(null);
	let shareInvoiceId = $state<string | null>(null);
	let emailInvoiceId = $state<string | null>(null);

	// PDF regeneration state
	let regeneratingInvoice = $state<InvoiceData | null>(null);
	let previewRef = $state<HTMLElement | null>(null);

	// Selection state for bulk export
	let selectedInvoices = $state<Set<string>>(new Set());
	let selectionMode = $state<boolean>(false);

	// Import state
	let fileInput = $state<HTMLInputElement | null>(null);
	let isImporting = $state<boolean>(false);
	let showImportResultModal = $state<boolean>(false);
	let importResult = $state<{ imported: number; skipped: number; errors: string[] } | null>(null);

	// Computed values
	let archivedCount = $derived(allInvoices.filter((inv) => inv.archived).length);

	// Apply filters and sorting
	const applyFilters = (): void => {
		let filtered = allInvoices.filter((invoice) => {
			const archived = invoice.archived === true;
			return showArchived ? archived : !archived;
		});

		filtered = filtered.filter((invoice) => {
			if (filterMode === 'draft') return invoice.draft === true;
			if (filterMode === 'finalized') return invoice.draft === false;
			return true;
		});

		const term = search.trim().toLowerCase();
		if (term) {
			filtered = filtered.filter((invoice) => {
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

		// Sort by date (most recent first), then by invoice number
		filtered.sort((a, b) => {
			const parseDate = (dateStr: string): number => {
				if (!dateStr || dateStr === 'N/A') return 0;
				const parsed = Date.parse(dateStr);
				return Number.isNaN(parsed) ? 0 : parsed;
			};

			const dateA = parseDate(a.date);
			const dateB = parseDate(b.date);
			if (dateA === dateB) {
				return (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '');
			}
			return dateB - dateA; // Descending order
		});

		filteredInvoices = filtered;
	};

	// Apply filters reactively
	$effect(() => {
		// Trigger when any filter changes - reference variables to track dependencies
		void search;
		void showArchived;
		void filterMode;
		void allInvoices;
		applyFilters();
	});

	const downloadPdf = async (invoiceId: string): Promise<void> => {
		const invoice = allInvoices.find((i) => i.id === invoiceId);

		// If PDF is stale or doesn't exist, regenerate it
		if (invoice?.isPdfStale || !invoice?.hasPdf) {
			await regeneratePdf(invoiceId);
		} else {
			// Fresh PDF: download from R2
			await downloadStoredPdf(invoiceId);
		}
	};

	const downloadStoredPdf = async (invoiceId: string): Promise<void> => {
		downloadingId = invoiceId;
		try {
			const response = await fetch(`/api/invoices/${invoiceId}/download`);
			if (!response.ok) {
				const error = await response.json();
				alert(error.message || 'Failed to download PDF');
				return;
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;

			const disposition = response.headers.get('Content-Disposition');
			const filenameMatch = disposition?.match(/filename="(.+)"/);
			a.download = filenameMatch?.[1] || `invoice-${invoiceId}.pdf`;

			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		} catch (err) {
			console.error('Download failed:', err);
			alert('Failed to download PDF. Please try again.');
		} finally {
			downloadingId = null;
		}
	};

	const regeneratePdf = async (invoiceId: string): Promise<void> => {
		downloadingId = invoiceId;

		try {
			// 1. Fetch full invoice data
			const response = await fetch(`/api/invoices/${invoiceId}`);
			if (!response.ok) {
				throw new Error('Failed to fetch invoice data');
			}
			const invoiceData: InvoiceData = await response.json();

			// 2. Render preview (triggers reactivity)
			regeneratingInvoice = invoiceData;

			// 3. Wait for render and images
			await tick();
			// Give it a moment for the component to mount
			await new Promise((resolve) => setTimeout(resolve, 100));

			if (!previewRef) {
				throw new Error('Preview element not available');
			}

			await waitForPreviewImages(previewRef);

			// 4. Generate PDF using shared utility with current page settings
			const currentPageSettings: PageSettings = {
				pageSize: $pageSettings.pageSize as 'a4' | 'letter' | 'legal' | 'a5',
				margins: $pageSettings.margins
			};

			const { blob, storageStatus } = await generatePdfFromPreview({
				invoice: invoiceData,
				previewElement: previewRef,
				pageSettings: currentPageSettings
			});

			// 5. Download the blob
			const filename = invoiceData.invoiceTo
				? `invoice-${invoiceData.invoiceTo.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 50)}.pdf`
				: 'invoice.pdf';
			downloadBlob(blob, filename);

			// 6. Update local state (isPdfStale = false, hasPdf = true)
			if (storageStatus === 'saved') {
				allInvoices = allInvoices.map((inv) =>
					inv.id === invoiceId ? { ...inv, isPdfStale: false, hasPdf: true } : inv
				);
			}

			console.log(`[PDF] Regenerated and ${storageStatus === 'saved' ? 'saved to cloud' : 'downloaded locally'}`);
		} catch (err) {
			console.error('PDF regeneration failed:', err);
			alert('Failed to regenerate PDF. Please try again.');
		} finally {
			regeneratingInvoice = null;
			downloadingId = null;
		}
	};

	const confirmDelete = (invoiceId: string): void => {
		showDeleteConfirm = invoiceId;
	};

	const cancelDelete = (): void => {
		showDeleteConfirm = null;
	};

	const deleteInvoice = async (invoiceId: string): Promise<void> => {
		deletingId = invoiceId;
		showDeleteConfirm = null;

		try {
			const response = await fetch(`/api/invoices/${invoiceId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const error = await response.json();
				alert(error.message || 'Failed to delete invoice');
				return;
			}

			// Remove from local state
			allInvoices = allInvoices.filter((inv) => inv.id !== invoiceId);
		} catch (err) {
			console.error('Delete failed:', err);
			alert('Failed to delete invoice. Please try again.');
		} finally {
			deletingId = null;
		}
	};

	const archiveInvoice = async (invoiceId: string): Promise<void> => {
		archivingId = invoiceId;

		try {
			const response = await fetch(`/api/invoices/${invoiceId}/archive`, {
				method: 'PUT'
			});

			if (!response.ok) {
				const error = await response.json();
				alert(error.message || 'Failed to toggle archive status');
				return;
			}

			const result = await response.json();

			// Update local state
			allInvoices = allInvoices.map((inv) =>
				inv.id === invoiceId ? { ...inv, archived: result.archived } : inv
			);
		} catch (err) {
			console.error('Archive toggle failed:', err);
			alert('Failed to toggle archive status. Please try again.');
		} finally {
			archivingId = null;
		}
	};

	const viewInvoice = (invoiceId: string): void => {
		window.location.href = `/?invoice=${invoiceId}#preview`;
	};

	const editInvoice = (invoiceId: string): void => {
		window.location.href = `/?invoice=${invoiceId}#edit`;
	};

	const openShareModal = (invoiceId: string): void => {
		shareInvoiceId = invoiceId;
	};

	const closeShareModal = (): void => {
		shareInvoiceId = null;
	};

	const openEmailModal = (invoiceId: string): void => {
		emailInvoiceId = invoiceId;
	};

	const closeEmailModal = (): void => {
		emailInvoiceId = null;
	};

	const handleSearchInput = (value: string): void => {
		search = value;
	};

	const handleToggleArchived = (value: boolean): void => {
		showArchived = value;
	};

	const handleFilterModeChange = (mode: 'all' | 'draft' | 'finalized'): void => {
		filterMode = mode;
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

	// Export functions (using shared helpers)
	const exportAllInvoices = async (): Promise<void> => {
		if (allInvoices.length === 0) return;
		await exportHelpers.exportAll(getAllInvoices);
	};

	const exportSelectedInvoices = async (): Promise<void> => {
		if (selectedInvoices.size === 0) return;
		await exportHelpers.exportSelected(getAllInvoices, selectedInvoices);
		// Exit selection mode after export
		selectionMode = false;
		selectedInvoices = selectionHelpers.deselectAll();
	};

	const exportInvoice = async (invoiceId: string): Promise<void> => {
		await exportHelpers.exportSingle(getAllInvoices, invoiceId);
	};

	// Import functions (using shared helpers)
	const triggerImport = (): void => {
		importHelpers.triggerFileInput(fileInput);
	};

	const handleFileSelect = async (event: Event): Promise<void> => {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		isImporting = true;
		try {
			const result = await importHelpers.handleFileSelect(file, saveInvoice);
			importResult = result;
			showImportResultModal = true;
			// Reload invoices with dashboard-specific format
			const records = await getAllInvoices();
			allInvoices = records.map((r) => ({
				id: r.id,
				invoiceNumber: r.invoice.invoiceNumber || '',
				invoiceTo: r.invoice.invoiceTo || '',
				invoiceFrom: r.invoice.invoiceFrom || '',
				invoiceLabel: r.invoice.invoiceLabel || '',
				draftName: r.invoice.draftName || '',
				date: r.invoice.date || '',
				total: r.invoice.total || 0,
				balanceDue: r.invoice.balanceDue || 0,
				paid: r.invoice.paid || false,
				draft: r.invoice.draft || false,
				archived: r.invoice.archived || false,
				hasPdf: false,
				isPdfStale: true,
				updatedAt: new Date()
			}));
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
</script>

<svelte:head>
	<title>Dashboard | Free Invoice Generator</title>
	<meta name="description" content="Manage your saved invoices and download PDFs" />
</svelte:head>

<div class="dashboard">
	<header class="dashboard-header">
		<div class="header-content">
			<h1>{$_('dashboard.title') || 'Dashboard'}</h1>
			<p class="welcome-text">
				{$_('dashboard.welcome_back') || 'Welcome back'}, {data.user.name || 'User'}!
			</p>
		</div>
		<DashboardStats
			totalCount={allInvoices.length}
			remainingCount={data.limit - allInvoices.length}
			filteredCount={filteredInvoices.length}
			{archivedCount}
		/>
	</header>

	<section class="controls-section">
		<DashboardFilters
			searchValue={search}
			onSearchInput={handleSearchInput}
			{showArchived}
			onToggleArchived={handleToggleArchived}
			{filterMode}
			onFilterModeChange={handleFilterModeChange}
		/>

		<div class="view-controls">
			<div class="view-toggle">
				<button
					class="toggle-btn"
					class:active={viewMode === 'table'}
					onclick={() => (viewMode = 'table')}
				>
					<svg viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
							clip-rule="evenodd"
						/>
					</svg>
					{$_('dashboard.table_view') || 'Table'}
				</button>
				<button
					class="toggle-btn"
					class:active={viewMode === 'cards'}
					onclick={() => (viewMode = 'cards')}
				>
					<svg viewBox="0 0 20 20" fill="currentColor">
						<path
							d="M4.5 2A1.5 1.5 0 0 0 3 3.5v3A1.5 1.5 0 0 0 4.5 8h3A1.5 1.5 0 0 0 9 6.5v-3A1.5 1.5 0 0 0 7.5 2h-3ZM4.5 12A1.5 1.5 0 0 0 3 13.5v3A1.5 1.5 0 0 0 4.5 18h3A1.5 1.5 0 0 0 9 16.5v-3A1.5 1.5 0 0 0 7.5 12h-3ZM12.5 2A1.5 1.5 0 0 0 11 3.5v3A1.5 1.5 0 0 0 12.5 8h3A1.5 1.5 0 0 0 17 6.5v-3A1.5 1.5 0 0 0 15.5 2h-3ZM12.5 12A1.5 1.5 0 0 0 11 13.5v3a1.5 1.5 0 0 0 1.5 1.5h3a1.5 1.5 0 0 0 1.5-1.5v-3a1.5 1.5 0 0 0-1.5-1.5h-3Z"
						/>
					</svg>
					{$_('dashboard.card_view') || 'Cards'}
				</button>
			</div>
			<div class="action-buttons">
				<!-- Hidden file input for import -->
				<input
					type="file"
					accept=".json"
					class="sr-only"
					bind:this={fileInput}
					onchange={handleFileSelect}
				/>
				<button
					class="toggle-btn"
					type="button"
					onclick={triggerImport}
					disabled={isImporting}
				>
					<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path
							d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z"
						/>
						<path
							d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z"
						/>
					</svg>
					{isImporting ? $_('export_import.importing') || 'Importing...' : $_('export_import.import') || 'Import'}
				</button>
				{#if allInvoices.length > 0}
					<button class="toggle-btn" type="button" onclick={toggleSelectionMode}>
						<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
								clip-rule="evenodd"
							/>
						</svg>
						{selectionMode ? $_('export_import.cancel') || 'Cancel' : $_('export_import.select') || 'Select'}
					</button>
					<button class="toggle-btn" type="button" onclick={exportAllInvoices}>
						<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
							<path
								d="M10.75 6.75a.75.75 0 0 0-1.5 0v6.614l-2.955-3.129a.75.75 0 0 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 1 0-1.09-1.03l-2.955 3.129V6.75Z"
							/>
							<path
								d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z"
							/>
						</svg>
						{$_('export_import.export_all') || 'Export All'}
					</button>
				{/if}
				<a href="/" class="create-button">
					<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path
							fill-rule="evenodd"
							d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z"
							clip-rule="evenodd"
						/>
					</svg>
					{$_('dashboard.new_invoice') || 'New Invoice'}
				</a>
			</div>
		</div>

		<!-- Selection toolbar -->
		{#if selectionMode}
			<div class="selection-toolbar">
				<div class="selection-info">
					<span>{selectedInvoices.size} {$_('export_import.selected') || 'selected'}</span>
					<button class="link-button" type="button" onclick={selectAll}>
						{$_('export_import.select_all') || 'Select all'}
					</button>
					<button class="link-button" type="button" onclick={deselectAll}>
						{$_('export_import.deselect_all') || 'Deselect all'}
					</button>
				</div>
				<button
					class="create-button"
					type="button"
					onclick={exportSelectedInvoices}
					disabled={selectedInvoices.size === 0}
				>
					<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path
							d="M10.75 6.75a.75.75 0 0 0-1.5 0v6.614l-2.955-3.129a.75.75 0 0 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 1 0-1.09-1.03l-2.955 3.129V6.75Z"
						/>
						<path
							d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z"
						/>
					</svg>
					{$_('export_import.export_selected') || 'Export Selected'}
				</button>
			</div>
		{/if}
	</section>

	<section class="invoices-section">
		{#if filteredInvoices.length === 0}
			<div class="empty-state">
				<div class="empty-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
						/>
					</svg>
				</div>
				<h3>{$_('dashboard.no_invoices_title') || 'No invoices found'}</h3>
				<p>{$_('dashboard.no_invoices_description') || 'Create your first invoice to get started'}</p>
				<a href="/" class="create-button primary">
					{$_('dashboard.create_invoice') || 'Create Invoice'}
				</a>
			</div>
		{:else}
			<!-- Desktop: Table by default, Cards optional -->
			<div class="desktop-view" class:hidden={viewMode === 'cards'}>
				<InvoiceTableView
					invoices={filteredInvoices}
					onView={viewInvoice}
					onEdit={editInvoice}
					onDelete={confirmDelete}
					onDownloadPdf={downloadPdf}
					onArchive={archiveInvoice}
					onShare={openShareModal}
					onSendEmail={openEmailModal}
					onExport={exportInvoice}
					{deletingId}
					{downloadingId}
					{selectionMode}
					{selectedInvoices}
					onToggleSelection={toggleSelection}
				/>
			</div>

			<!-- Mobile: Cards always, Desktop: Cards if toggled -->
			<div class="mobile-view" class:hidden={viewMode === 'table'}>
				<InvoiceCardGrid
					invoices={filteredInvoices}
					onView={viewInvoice}
					onEdit={editInvoice}
					onDelete={confirmDelete}
					onArchive={archiveInvoice}
					onDownloadPdf={downloadPdf}
					onShare={openShareModal}
					onSendEmail={openEmailModal}
					onExport={exportInvoice}
					{deletingId}
					{downloadingId}
					{selectionMode}
					{selectedInvoices}
					onToggleSelection={toggleSelection}
				/>
			</div>
		{/if}
	</section>
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="modal-backdrop"
		onclick={cancelDelete}
		onkeydown={(e) => e.key === 'Escape' && cancelDelete()}
	>
		<div class="modal" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title" onpointerdown={(e) => e.stopPropagation()}>
			<div class="modal-icon danger">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
					/>
				</svg>
			</div>
			<h3 id="delete-confirm-title">{$_('dashboard.delete_confirm_title') || 'Delete Invoice?'}</h3>
			<p>
				{$_('dashboard.delete_confirm_message') ||
					'This will permanently delete this invoice and its PDF. This action cannot be undone.'}
			</p>
			<div class="modal-actions">
				<button class="modal-btn cancel" onclick={cancelDelete}>
					{$_('dashboard.cancel') || 'Cancel'}
				</button>
				<button class="modal-btn delete" onclick={() => deleteInvoice(showDeleteConfirm!)}>
					{$_('dashboard.delete') || 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Share Invoice Modal -->
{#if shareInvoiceId}
	<ShareInvoiceModal invoiceId={shareInvoiceId} onClose={closeShareModal} />
{/if}

<!-- Send Email Modal -->
{#if emailInvoiceId}
	{@const emailInvoice = allInvoices.find((inv) => inv.id === emailInvoiceId)}
	<SendEmailModal
		invoiceId={emailInvoiceId}
		invoiceNumber={emailInvoice?.invoiceNumber}
		recipientName={emailInvoice?.invoiceTo}
		onClose={closeEmailModal}
	/>
{/if}

<!-- Hidden container for PDF regeneration -->
{#if regeneratingInvoice}
	<div class="pdf-render-container" aria-hidden="true">
		<div bind:this={previewRef}>
			<InvoicePreviewWrapper invoice={regeneratingInvoice} />
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
			<h3 id="import-result-title">{$_('export_import.import_result') || 'Import Result'}</h3>
			<div class="import-result-details">
				{#if importResult.imported > 0}
					<p class="result-success">
						{importResult.imported} {$_('export_import.invoices_imported') || 'invoice(s) imported successfully'}
					</p>
				{/if}
				{#if importResult.skipped > 0}
					<p class="result-warning">
						{importResult.skipped} {$_('export_import.invoices_skipped') || 'invoice(s) skipped'}
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
				<button class="modal-btn cancel" onclick={closeImportResultModal}>
					{$_('export_import.done') || 'Done'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Hidden container for PDF generation - off-screen but rendered */
	.pdf-render-container {
		position: absolute;
		left: -9999px;
		top: 0;
		width: 800px;
		background: white;
	}

	.dashboard {
		max-width: 1280px;
		margin: 0 auto;
		padding: 2rem 1.5rem 5rem;
	}

	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 2rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	.header-content h1 {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 0.25rem 0;
	}

	.welcome-text {
		font-size: 1rem;
		color: var(--color-text-secondary);
		margin: 0;
	}

	.controls-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		margin-bottom: 2rem;
		padding: 1.5rem;
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-lg);
	}

	.view-controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
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

	.selection-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
		padding: 1rem;
		background: color-mix(in srgb, var(--color-accent-blue) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-accent-blue) 25%, transparent);
		border-radius: var(--radius-md);
		margin-top: 1rem;
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
		color: var(--color-accent-blue);
		opacity: 0.8;
	}

	.view-toggle {
		display: flex;
		gap: 0.5rem;
	}

	.toggle-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		background: var(--color-bg-primary);
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.toggle-btn:hover {
		background: var(--color-bg-secondary);
		border-color: var(--color-accent-blue);
	}

	.toggle-btn.active {
		background: var(--color-accent-blue);
		border-color: var(--color-accent-blue);
		color: white;
	}

	.toggle-btn svg {
		width: 1rem;
		height: 1rem;
	}

	.create-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--color-accent-blue);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		cursor: pointer;
		transition: background 0.2s, opacity 0.2s;
	}

	.create-button:hover {
		opacity: 0.9;
	}

	.create-button svg {
		width: 1rem;
		height: 1rem;
	}

	.create-button.primary {
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
	}

	.invoices-section {
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-lg);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 4rem 2rem;
		text-align: center;
	}

	.empty-icon {
		width: 4rem;
		height: 4rem;
		color: var(--color-text-secondary);
		margin-bottom: 1rem;
	}

	.empty-icon svg {
		width: 100%;
		height: 100%;
	}

	.empty-state h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.5rem 0;
	}

	.empty-state p {
		color: var(--color-text-secondary);
		margin: 0 0 1.5rem 0;
	}

	.desktop-view {
		display: block;
	}

	.desktop-view.hidden {
		display: none;
	}

	.mobile-view {
		display: block;
	}

	.mobile-view.hidden {
		display: none;
	}

	/* Modal styles */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		backdrop-filter: blur(2px);
	}

	.modal {
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-lg);
		padding: 2rem;
		max-width: 400px;
		width: 90%;
		text-align: center;
	}

	.modal-icon {
		width: 3rem;
		height: 3rem;
		margin: 0 auto 1rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.modal-icon.danger {
		background: color-mix(in srgb, var(--color-error, #ef4444) 10%, transparent);
		color: var(--color-error, #dc2626);
	}

	.modal-icon svg {
		width: 1.5rem;
		height: 1.5rem;
	}

	.modal h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.5rem 0;
	}

	.modal p {
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
		margin: 0 0 1.5rem 0;
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
	}

	.modal-btn {
		padding: 0.625rem 1.25rem;
		border-radius: var(--radius-md);
		font-weight: 500;
		font-size: 0.9375rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.modal-btn.cancel {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-primary);
		color: var(--color-text-primary);
	}

	.modal-btn.cancel:hover {
		background: var(--color-bg-tertiary);
	}

	.modal-btn.delete {
		background: var(--color-error, #dc2626);
		border: 1px solid var(--color-error, #dc2626);
		color: white;
	}

	.modal-btn.delete:hover {
		background: color-mix(in srgb, var(--color-error, #dc2626) 85%, black);
	}

	.modal-icon.success {
		background: color-mix(in srgb, var(--color-success, #10b981) 10%, transparent);
		color: var(--color-success, #10b981);
	}

	.modal-icon.error {
		background: color-mix(in srgb, var(--color-error, #ef4444) 10%, transparent);
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
		background: color-mix(in srgb, var(--color-error, #ef4444) 8%, transparent);
		border-radius: var(--radius-sm);
	}

	.result-error {
		color: var(--color-error, #ef4444);
		font-size: 0.875rem;
		margin: 0.25rem 0;
	}

	@media (max-width: 768px) {
		.dashboard {
			padding: 1rem;
		}

		.dashboard-header {
			flex-direction: column;
			gap: 1rem;
		}

		.controls-section {
			padding: 1rem;
		}

		.view-toggle {
			display: none; /* Hide view toggle on mobile */
		}

		.view-controls {
			justify-content: stretch;
		}

		.create-button {
			flex: 1;
			justify-content: center;
		}

		.desktop-view {
			display: none !important;
		}

		.mobile-view {
			display: block !important;
		}
	}
</style>
