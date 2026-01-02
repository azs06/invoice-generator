<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { toUSCurrency } from '$lib/currency';
	import type { DashboardInvoice } from '../../routes/dashboard/+page.server';

	interface Props {
		invoices: DashboardInvoice[];
		onView: (id: string) => void;
		onEdit: (id: string) => void;
		onDelete: (id: string) => void;
		onArchive: (id: string) => void;
		onDownloadPdf: (id: string) => void;
		onShare: (id: string) => void;
		deletingId: string | null;
		downloadingId: string | null;
	}

	let { invoices, onView, onEdit, onDelete, onArchive, onDownloadPdf, onShare, deletingId, downloadingId }: Props = $props();

	const formatDate = (dateStr: string): string => {
		if (!dateStr || dateStr === 'N/A') return $_('saved_invoices.date_not_set') || 'Not set';
		try {
			return new Date(dateStr).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		} catch {
			return dateStr;
		}
	};

	const invoiceTitle = (invoice: DashboardInvoice): string => {
		const draftName = invoice.draftName?.trim();
		if (draftName) return draftName;
		const label = invoice.invoiceLabel?.trim() || $_('saved_invoices.invoice') || 'INVOICE';
		const number = invoice.invoiceNumber?.trim();
		return number ? `${label} ${number}` : label;
	};
</script>

<div class="card-grid">
	{#each invoices as invoice (invoice.id)}
		<div class="invoice-card" class:deleting={deletingId === invoice.id}>
			<div class="card-header">
				<div class="card-title-section">
					<h3 class="card-title">{invoiceTitle(invoice)}</h3>
					<div class="card-badges">
						{#if invoice.draft}
							<span class="badge draft">{$_('dashboard.draft') || 'Draft'}</span>
						{:else}
							<span class="badge finalized">{$_('dashboard.finalized') || 'Finalized'}</span>
						{/if}
						{#if invoice.archived}
							<span class="badge archived">{$_('dashboard.archived') || 'Archived'}</span>
						{/if}
					</div>
				</div>
				<div class="balance-due">
					<span class="balance-label">{$_('dashboard.balance_due') || 'Balance Due'}</span>
					<span class="balance-amount">{$toUSCurrency(invoice.balanceDue)}</span>
				</div>
			</div>

			<div class="card-meta">
				<div class="meta-item">
					<svg class="meta-icon" viewBox="0 0 20 20" fill="currentColor">
						<path
							d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 1 .41-1.108C5.145 12.437 7.41 11.5 10 11.5c2.59 0 4.855.937 6.125 1.885.369.275.596.693.41 1.108a32.375 32.375 0 0 1-1.535 3.32c-.195.345-.541.607-.94.607h-8.12a1.125 1.125 0 0 1-.94-.607 32.362 32.362 0 0 1-1.535-3.32Z"
						/>
					</svg>
					<span class="meta-text">{invoice.invoiceTo || $_('dashboard.unknown_client') || 'Unknown'}</span>
				</div>
				<div class="meta-item">
					<svg class="meta-icon" viewBox="0 0 20 20" fill="currentColor">
						<path
							d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2Z"
						/>
						<path
							fill-rule="evenodd"
							d="M5.404 4.343a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 0 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0Zm9.193 0a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 1 1-1.06 1.061l-1.061-1.06a.75.75 0 0 1 0-1.061ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm-7 3a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 3 10Zm15 0a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5a.75.75 0 0 1 .75.75Zm-2.343 5.657a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 1 1-1.06 1.061l-1.061-1.06a.75.75 0 0 1 0-1.061Zm-9.193 0a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 1 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0Z"
							clip-rule="evenodd"
						/>
					</svg>
					<span class="meta-text">{invoice.invoiceNumber || 'N/A'}</span>
				</div>
				<div class="meta-item">
					<svg class="meta-icon" viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z"
							clip-rule="evenodd"
						/>
					</svg>
					<span class="meta-text">{formatDate(invoice.date)}</span>
				</div>
			</div>

			<div class="card-status">
				<span class="status-badge" class:paid={invoice.paid} class:unpaid={!invoice.paid}>
					{invoice.paid ? $_('dashboard.paid') || 'Paid' : $_('dashboard.unpaid') || 'Unpaid'}
				</span>
				{#if invoice.hasPdf}
					<span class="pdf-indicator">
						<svg viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Z"
								clip-rule="evenodd"
							/>
						</svg>
						{$_('dashboard.pdf_available') || 'PDF'}
					</span>
				{/if}
			</div>

			<div class="card-actions">
				<button class="primary-btn" onclick={() => onView(invoice.id)}>
					<svg viewBox="0 0 20 20" fill="currentColor">
						<path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
						<path
							fill-rule="evenodd"
							d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
							clip-rule="evenodd"
						/>
					</svg>
					{$_('dashboard.view') || 'View'}
				</button>

				<div class="secondary-actions">
					<button class="secondary-btn edit" onclick={() => onEdit(invoice.id)} title={$_('dashboard.edit') || 'Edit'}>
						<svg viewBox="0 0 20 20" fill="currentColor">
							<path
								d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z"
							/>
							<path
								d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z"
							/>
						</svg>
					</button>
					<button
						class="secondary-btn download"
						class:stale={invoice.isPdfStale}
						class:generate={!invoice.hasPdf}
						onclick={() => onDownloadPdf(invoice.id)}
						disabled={downloadingId === invoice.id}
						title={!invoice.hasPdf
							? 'Generate PDF'
							: invoice.isPdfStale
								? 'PDF outdated - click to regenerate'
								: $_('dashboard.download_pdf') || 'Download PDF'}
					>
						{#if downloadingId === invoice.id}
							<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
								<circle cx="12" cy="12" r="9" stroke-width="2" stroke-dasharray="45 15" />
							</svg>
						{:else if !invoice.hasPdf}
							<!-- Generate icon (document + plus) -->
							<svg viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm5.75 6.75a.75.75 0 0 0-1.5 0v1.5h-1.5a.75.75 0 0 0 0 1.5h1.5v1.5a.75.75 0 0 0 1.5 0v-1.5h1.5a.75.75 0 0 0 0-1.5h-1.5v-1.5Z"
									clip-rule="evenodd"
								/>
							</svg>
						{:else}
							<svg viewBox="0 0 20 20" fill="currentColor">
								<path
									d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z"
								/>
								<path
									d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z"
								/>
							</svg>
							{#if invoice.isPdfStale}
								<span class="stale-indicator">!</span>
							{/if}
						{/if}
					</button>
					<button class="secondary-btn share" onclick={() => onShare(invoice.id)} title="Share">
						<svg viewBox="0 0 20 20" fill="currentColor">
							<path
								d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z"
							/>
							<path
								d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z"
							/>
						</svg>
					</button>
					<button
						class="secondary-btn archive"
						onclick={() => onArchive(invoice.id)}
						title={invoice.archived ? $_('dashboard.unarchive') || 'Unarchive' : $_('dashboard.archive') || 'Archive'}
					>
						<svg viewBox="0 0 20 20" fill="currentColor">
							<path d="M2 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2Z" />
							<path
								fill-rule="evenodd"
								d="M2 7.5h16l-.811 7.71a2 2 0 0 1-1.99 1.79H4.802a2 2 0 0 1-1.99-1.79L2 7.5Zm5.22 1.72a.75.75 0 0 1 1.06 0L10 10.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L11.06 12l1.72 1.72a.75.75 0 1 1-1.06 1.06L10 13.06l-1.72 1.72a.75.75 0 0 1-1.06-1.06L8.94 12l-1.72-1.72a.75.75 0 0 1 0-1.06Z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>
					<button
						class="secondary-btn delete"
						onclick={() => onDelete(invoice.id)}
						disabled={deletingId === invoice.id}
						title={$_('dashboard.delete') || 'Delete'}
					>
						{#if deletingId === invoice.id}
							<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
								<circle cx="12" cy="12" r="9" stroke-width="2" stroke-dasharray="45 15" />
							</svg>
						{:else}
							<svg viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
									clip-rule="evenodd"
								/>
							</svg>
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/each}
</div>

<style>
	.card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.5rem;
		padding: 1.5rem;
	}

	.invoice-card {
		background: linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 100%);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		transition: all 0.2s;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.invoice-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		transform: translateY(-2px);
	}

	.invoice-card.deleting {
		opacity: 0.5;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.card-title-section {
		flex: 1;
		min-width: 0;
	}

	.card-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.5rem 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.card-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.badge {
		padding: 0.25rem 0.625rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.badge.draft {
		background: #fef3c7;
		color: #92400e;
	}

	.badge.finalized {
		background: #dbeafe;
		color: #1e40af;
	}

	.badge.archived {
		background: #e5e7eb;
		color: #374151;
	}

	.balance-due {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		text-align: right;
	}

	.balance-label {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		margin-bottom: 0.25rem;
	}

	.balance-amount {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text-primary);
		font-family: monospace;
	}

	.card-meta {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		padding: 1rem 0;
		border-top: 1px solid var(--color-border-primary);
		border-bottom: 1px solid var(--color-border-primary);
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.meta-icon {
		width: 1.125rem;
		height: 1.125rem;
		color: var(--color-text-secondary);
		flex-shrink: 0;
	}

	.meta-text {
		font-size: 0.875rem;
		color: var(--color-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.card-status {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.status-badge {
		display: inline-flex;
		padding: 0.375rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.8125rem;
		font-weight: 600;
	}

	.status-badge.paid {
		background: #d1fae5;
		color: #047857;
	}

	.status-badge.unpaid {
		background: #fee2e2;
		color: #b91c1c;
	}

	.pdf-indicator {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		color: #047857;
		font-size: 0.8125rem;
		font-weight: 500;
	}

	.pdf-indicator svg {
		width: 1rem;
		height: 1rem;
	}

	.card-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.primary-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		background: #3b82f6;
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s;
	}

	.primary-btn:hover {
		background: #2563eb;
	}

	.primary-btn svg {
		width: 1.125rem;
		height: 1.125rem;
	}

	.secondary-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: space-between;
	}

	.secondary-btn {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.625rem;
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		background: var(--color-bg-primary);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.15s;
	}

	.secondary-btn:hover {
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
	}

	.secondary-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.secondary-btn svg {
		width: 1.125rem;
		height: 1.125rem;
	}

	.secondary-btn.edit:hover {
		border-color: #f59e0b;
		color: #f59e0b;
	}

	.secondary-btn.download:hover {
		border-color: #3b82f6;
		color: #3b82f6;
	}

	.secondary-btn.download.generate {
		border-color: #10b981;
		color: #10b981;
	}

	.secondary-btn.download.generate:hover {
		border-color: #059669;
		color: #059669;
		background: #ecfdf5;
	}

	.secondary-btn.download.stale {
		position: relative;
		border-color: #f59e0b;
		color: #f59e0b;
	}

	.secondary-btn.download.stale:hover {
		border-color: #d97706;
		color: #d97706;
	}

	.stale-indicator {
		position: absolute;
		top: -4px;
		right: -4px;
		width: 12px;
		height: 12px;
		background: #f59e0b;
		color: white;
		border-radius: 50%;
		font-size: 9px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	.secondary-btn.share:hover {
		border-color: #10b981;
		color: #10b981;
	}

	.secondary-btn.archive:hover {
		border-color: #6b7280;
		color: #6b7280;
	}

	.secondary-btn.delete:hover {
		border-color: #ef4444;
		color: #ef4444;
	}

	.spin {
		animation: spin 0.9s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 640px) {
		.card-grid {
			grid-template-columns: 1fr;
			padding: 1rem;
			gap: 1rem;
		}

		.invoice-card {
			padding: 1.25rem;
		}

		.card-title {
			font-size: 1rem;
		}

		.balance-amount {
			font-size: 1.125rem;
		}
	}
</style>
