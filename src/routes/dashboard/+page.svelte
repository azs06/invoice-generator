<script lang="ts">
	import { _ } from 'svelte-i18n';
	import type { PageData } from './$types';
	import type { DashboardInvoice } from './+page.server';
	import DashboardStats from '$components/dashboard/DashboardStats.svelte';
	import DashboardFilters from '$components/dashboard/DashboardFilters.svelte';
	import InvoiceTableView from '$components/dashboard/InvoiceTableView.svelte';
	import InvoiceCardGrid from '$components/dashboard/InvoiceCardGrid.svelte';

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
		// Trigger when any filter changes
		search, showArchived, filterMode, allInvoices;
		applyFilters();
	});

	const downloadPdf = async (invoiceId: string): Promise<void> => {
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
		window.location.href = `/?invoice=${invoiceId}`;
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
					{deletingId}
					{downloadingId}
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
					{deletingId}
				/>
			</div>
		{/if}
	</section>
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
	<div
		class="modal-backdrop"
		role="button"
		tabindex="0"
		onclick={cancelDelete}
		onkeydown={(e) => e.key === 'Escape' && cancelDelete()}
	>
		<div class="modal" role="dialog" aria-modal="true" onpointerdown={(e) => e.stopPropagation()}>
			<div class="modal-icon danger">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
					/>
				</svg>
			</div>
			<h3>{$_('dashboard.delete_confirm_title') || 'Delete Invoice?'}</h3>
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

<style>
	.dashboard {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
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
		border-color: #3b82f6;
	}

	.toggle-btn.active {
		background: #3b82f6;
		border-color: #3b82f6;
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
		background: #3b82f6;
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		cursor: pointer;
		transition: background 0.2s;
	}

	.create-button:hover {
		background: #2563eb;
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
		overflow: hidden;
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

	.mobile-view {
		display: none;
	}

	.desktop-view.hidden {
		display: none;
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
		background: #fee2e2;
		color: #dc2626;
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
		background: #dc2626;
		border: 1px solid #dc2626;
		color: white;
	}

	.modal-btn.delete:hover {
		background: #b91c1c;
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
