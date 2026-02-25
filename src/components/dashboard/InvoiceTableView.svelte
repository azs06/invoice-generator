<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { toUSCurrency } from '$lib/currency';
	import type { DashboardInvoice } from '../../routes/dashboard/+page.server';
	import InvoiceActionsDropdown from './InvoiceActionsDropdown.svelte';

	interface Props {
		invoices: DashboardInvoice[];
		onView: (id: string) => void;
		onEdit: (id: string) => void;
		onDelete: (id: string) => void;
		onDownloadPdf: (id: string) => void;
		onArchive: (id: string) => void;
		onShare: (id: string) => void;
		onSendEmail: (id: string) => void;
		onExport: (id: string) => void;
		deletingId: string | null;
		downloadingId: string | null;
		selectionMode?: boolean;
		selectedInvoices?: Set<string>;
		onToggleSelection?: (id: string) => void;
	}

	let {
		invoices,
		onView,
		onEdit,
		onDelete,
		onDownloadPdf,
		onArchive,
		onShare,
		onSendEmail,
		onExport,
		deletingId,
		downloadingId,
		selectionMode = false,
		selectedInvoices = new Set(),
		onToggleSelection
	}: Props = $props();

	const formatDate = (dateStr: string): string => {
		if (!dateStr || dateStr === 'N/A') return 'N/A';
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
</script>

<div class="table-wrapper">
	<table class="invoices-table">
		<thead>
			<tr>
				{#if selectionMode}
					<th class="checkbox-col"></th>
				{/if}
				<th>{$_('dashboard.invoice_number') || 'Invoice #'}</th>
				<th>{$_('dashboard.client') || 'Client'}</th>
				<th>{$_('dashboard.date') || 'Date'}</th>
				<th>{$_('dashboard.amount') || 'Amount'}</th>
				<th>{$_('dashboard.status') || 'Status'}</th>
				<th>{$_('dashboard.actions') || 'Actions'}</th>
			</tr>
		</thead>
		<tbody>
			{#each invoices as invoice (invoice.id)}
				<tr
					class:deleting={deletingId === invoice.id}
					class:selected={selectionMode && selectedInvoices.has(invoice.id)}
				>
					{#if selectionMode}
						<td class="checkbox-col">
							<label class="checkbox-wrapper">
								<input
									type="checkbox"
									checked={selectedInvoices.has(invoice.id)}
									onchange={() => onToggleSelection?.(invoice.id)}
								/>
								<span class="checkbox-custom"></span>
							</label>
						</td>
					{/if}
					<td class="invoice-number">{invoice.invoiceNumber}</td>
					<td class="client-name">{invoice.invoiceTo}</td>
					<td class="date">{formatDate(invoice.date)}</td>
					<td class="amount">{$toUSCurrency(invoice.total)}</td>
					<td>
						<div class="badges">
							<span class="status-badge" class:paid={invoice.paid} class:unpaid={!invoice.paid}>
								{invoice.paid ? $_('dashboard.paid') || 'Paid' : $_('dashboard.unpaid') || 'Unpaid'}
							</span>
							{#if invoice.draft}
								<span class="draft-badge">{$_('dashboard.draft') || 'Draft'}</span>
							{/if}
							{#if invoice.archived}
								<span class="archived-badge">{$_('dashboard.archived') || 'Archived'}</span>
							{/if}
						</div>
					</td>
					<td class="actions">
						<div class="action-buttons">
							<button
								class="action-btn view"
								title={$_('dashboard.view') || 'View Invoice'}
								aria-label={$_('dashboard.view') || 'View Invoice'}
								onclick={() => onView(invoice.id)}
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
								class="action-btn edit"
								title={$_('dashboard.edit') || 'Edit Invoice'}
								aria-label={$_('dashboard.edit') || 'Edit Invoice'}
								onclick={() => onEdit(invoice.id)}
							>
								<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
									<path
										d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z"
									/>
									<path
										d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z"
									/>
								</svg>
							</button>
							<InvoiceActionsDropdown
								invoiceId={invoice.id}
								isArchived={invoice.archived}
								hasPdf={invoice.hasPdf}
								isPdfStale={invoice.isPdfStale}
								{onDownloadPdf}
								{onShare}
								{onSendEmail}
								{onExport}
								{onArchive}
								{onDelete}
								isDownloading={downloadingId === invoice.id}
								isDeleting={deletingId === invoice.id}
							/>
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.table-wrapper {
		overflow-x: auto;
	}

	.invoices-table {
		width: 100%;
		border-collapse: collapse;
	}

	.invoices-table th {
		text-align: left;
		padding: 0.875rem 1rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-secondary);
		background: var(--surface-paper-muted);
		border-bottom: 1px solid var(--surface-paper-border);
	}

	.invoices-table td {
		padding: 1rem;
		font-size: 0.9375rem;
		color: var(--color-text-primary);
		border-bottom: 1px solid var(--surface-paper-border);
	}

	.invoices-table tbody tr:last-child td {
		border-bottom: none;
	}

	.invoices-table tbody tr:hover {
		background: var(--surface-paper-muted);
	}

	.invoices-table tbody tr.deleting {
		opacity: 0.5;
	}

	.invoices-table tbody tr.selected {
		background: rgba(59, 130, 246, 0.08);
	}

	.invoices-table tbody tr.selected:hover {
		background: rgba(59, 130, 246, 0.12);
	}

	.checkbox-col {
		width: 3rem;
		text-align: center;
	}

	.checkbox-wrapper {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		position: relative;
	}

	.checkbox-wrapper input[type='checkbox'] {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.checkbox-custom {
		width: 1.25rem;
		height: 1.25rem;
		border: 2px solid var(--surface-paper-border);
		border-radius: var(--radius-sm);
		background: var(--surface-paper);
		transition: all 0.15s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.checkbox-wrapper:hover .checkbox-custom {
		border-color: var(--color-accent-blue);
	}

	.checkbox-wrapper input[type='checkbox']:checked + .checkbox-custom {
		background: var(--color-accent-blue);
		border-color: var(--color-accent-blue);
	}

	.checkbox-wrapper input[type='checkbox']:checked + .checkbox-custom::after {
		content: '';
		width: 0.375rem;
		height: 0.625rem;
		border: solid white;
		border-width: 0 2px 2px 0;
		transform: rotate(45deg);
		margin-bottom: 2px;
	}

	.invoice-number {
		font-weight: 600;
		font-family: monospace;
	}

	.client-name {
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.date {
		white-space: nowrap;
	}

	.amount {
		font-weight: 600;
		font-family: monospace;
	}

	.badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.status-badge {
		display: inline-flex;
		padding: 0.25rem 0.625rem;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
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

	.draft-badge {
		display: inline-flex;
		padding: 0.25rem 0.625rem;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 600;
		background: #fef3c7;
		color: #92400e;
	}

	.archived-badge {
		display: inline-flex;
		padding: 0.25rem 0.625rem;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 600;
		background: #e5e7eb;
		color: #374151;
	}

	.actions {
		width: 1%;
		white-space: nowrap;
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: 1px solid var(--surface-paper-border);
		border-radius: var(--radius-md);
		background: var(--surface-paper);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.15s;
	}

	.action-btn:hover {
		background: var(--surface-paper-muted);
		color: var(--color-text-primary);
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.action-btn svg {
		width: 1rem;
		height: 1rem;
	}

	.action-btn.view:hover {
		border-color: #8b5cf6;
		color: #8b5cf6;
	}

	.action-btn.edit:hover {
		border-color: #f59e0b;
		color: #f59e0b;
	}

	@media (max-width: 768px) {
		.invoices-table th,
		.invoices-table td {
			padding: 0.75rem 0.5rem;
			font-size: 0.8125rem;
		}

		.client-name {
			max-width: 120px;
		}

		.action-buttons {
			flex-wrap: wrap;
		}
	}
</style>
