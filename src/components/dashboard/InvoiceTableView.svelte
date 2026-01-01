<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { toUSCurrency } from '$lib/currency';
	import type { DashboardInvoice } from '../../routes/dashboard/+page.server';

	interface Props {
		invoices: DashboardInvoice[];
		onView: (id: string) => void;
		onEdit: (id: string) => void;
		onDelete: (id: string) => void;
		onDownloadPdf: (id: string) => void;
		onArchive: (id: string) => void;
		deletingId: string | null;
		downloadingId: string | null;
	}

	let { invoices, onView, onEdit, onDelete, onDownloadPdf, onArchive, deletingId, downloadingId }: Props = $props();

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
				<th>{$_('dashboard.invoice_number') || 'Invoice #'}</th>
				<th>{$_('dashboard.client') || 'Client'}</th>
				<th>{$_('dashboard.date') || 'Date'}</th>
				<th>{$_('dashboard.amount') || 'Amount'}</th>
				<th>{$_('dashboard.status') || 'Status'}</th>
				<th>{$_('dashboard.pdf') || 'PDF'}</th>
				<th>{$_('dashboard.actions') || 'Actions'}</th>
			</tr>
		</thead>
		<tbody>
			{#each invoices as invoice (invoice.id)}
				<tr class:deleting={deletingId === invoice.id}>
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
					<td>
						{#if invoice.hasPdf}
							<span class="pdf-badge available">
								<svg viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Z"
										clip-rule="evenodd"
									/>
								</svg>
								{$_('dashboard.available') || 'Available'}
							</span>
						{:else}
							<span class="pdf-badge unavailable">—</span>
						{/if}
					</td>
					<td class="actions">
						<div class="action-buttons">
							{#if invoice.hasPdf}
								<button
									class="action-btn download"
									title={$_('dashboard.download_pdf') || 'Download PDF'}
									onclick={() => onDownloadPdf(invoice.id)}
									disabled={downloadingId === invoice.id}
								>
									{#if downloadingId === invoice.id}
										<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
											<circle cx="12" cy="12" r="9" stroke-width="2" stroke-dasharray="45 15" />
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
									{/if}
								</button>
							{/if}
							<button
								class="action-btn view"
								title={$_('dashboard.view') || 'View Invoice'}
								onclick={() => onView(invoice.id)}
							>
								<svg viewBox="0 0 20 20" fill="currentColor">
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
								onclick={() => onEdit(invoice.id)}
							>
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
								class="action-btn archive"
								title={invoice.archived ? $_('dashboard.unarchive') || 'Unarchive' : $_('dashboard.archive') || 'Archive'}
								onclick={() => onArchive(invoice.id)}
							>
								<svg viewBox="0 0 20 20" fill="currentColor">
									<path
										d="M2 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2Z"
									/>
									<path
										fill-rule="evenodd"
										d="M2 7.5h16l-.811 7.71a2 2 0 0 1-1.99 1.79H4.802a2 2 0 0 1-1.99-1.79L2 7.5Zm5.22 1.72a.75.75 0 0 1 1.06 0L10 10.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L11.06 12l1.72 1.72a.75.75 0 1 1-1.06 1.06L10 13.06l-1.72 1.72a.75.75 0 0 1-1.06-1.06L8.94 12l-1.72-1.72a.75.75 0 0 1 0-1.06Z"
										clip-rule="evenodd"
									/>
								</svg>
							</button>
							<button
								class="action-btn delete"
								title={$_('dashboard.delete') || 'Delete Invoice'}
								onclick={() => onDelete(invoice.id)}
								disabled={deletingId === invoice.id}
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
		background: var(--color-bg-secondary);
		border-bottom: 1px solid var(--color-border-primary);
	}

	.invoices-table td {
		padding: 1rem;
		font-size: 0.9375rem;
		color: var(--color-text-primary);
		border-bottom: 1px solid var(--color-border-primary);
	}

	.invoices-table tbody tr:last-child td {
		border-bottom: none;
	}

	.invoices-table tbody tr:hover {
		background: var(--color-bg-secondary);
	}

	.invoices-table tbody tr.deleting {
		opacity: 0.5;
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
		border-radius: 9999px;
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
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		background: #fef3c7;
		color: #92400e;
	}

	.archived-badge {
		display: inline-flex;
		padding: 0.25rem 0.625rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		background: #e5e7eb;
		color: #374151;
	}

	.pdf-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.8125rem;
	}

	.pdf-badge svg {
		width: 1rem;
		height: 1rem;
	}

	.pdf-badge.available {
		color: #047857;
	}

	.pdf-badge.unavailable {
		color: var(--color-text-secondary);
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
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		background: var(--color-bg-primary);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.15s;
	}

	.action-btn:hover {
		background: var(--color-bg-secondary);
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

	.action-btn.download:hover {
		border-color: #3b82f6;
		color: #3b82f6;
	}

	.action-btn.view:hover {
		border-color: #8b5cf6;
		color: #8b5cf6;
	}

	.action-btn.edit:hover {
		border-color: #f59e0b;
		color: #f59e0b;
	}

	.action-btn.archive:hover {
		border-color: #6b7280;
		color: #6b7280;
	}

	.action-btn.delete:hover {
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
