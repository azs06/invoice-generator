<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { toUSCurrency } from '$lib/currency';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let invoices = $state(data.invoices);
	let deletingId = $state<string | null>(null);
	let downloadingId = $state<string | null>(null);
	let showDeleteConfirm = $state<string | null>(null);

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
			
			// Get filename from Content-Disposition header or use default
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
			invoices = invoices.filter(inv => inv.id !== invoiceId);
		} catch (err) {
			console.error('Delete failed:', err);
			alert('Failed to delete invoice. Please try again.');
		} finally {
			deletingId = null;
		}
	};

	const viewInvoice = (invoiceId: string): void => {
		window.location.href = `/invoice/${invoiceId}`;
	};

	const editInvoice = (invoiceId: string): void => {
		window.location.href = `/?invoice=${invoiceId}`;
	};
</script>

<svelte:head>
	<title>Dashboard | Free Invoice Generator</title>
	<meta name="description" content="Manage your saved invoices and download PDFs" />
</svelte:head>

<div class="dashboard">
	<header class="dashboard-header">
		<div class="header-content">
			<h1>Dashboard</h1>
			<p class="welcome-text">Welcome back, {data.user.name || 'User'}!</p>
		</div>
		<div class="header-stats">
			<div class="stat-card">
				<span class="stat-value">{invoices.length}</span>
				<span class="stat-label">Invoices</span>
			</div>
			<div class="stat-card">
				<span class="stat-value">{data.limit - invoices.length}</span>
				<span class="stat-label">Remaining</span>
			</div>
		</div>
	</header>

	<section class="invoices-section">
		<div class="section-header">
			<h2>Your Invoices</h2>
			<a href="/" class="create-button">
				<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path fill-rule="evenodd" d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z" clip-rule="evenodd" />
				</svg>
				New Invoice
			</a>
		</div>

		{#if invoices.length === 0}
			<div class="empty-state">
				<div class="empty-icon">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
					</svg>
				</div>
				<h3>No invoices yet</h3>
				<p>Create your first invoice to get started</p>
				<a href="/" class="create-button primary">Create Invoice</a>
			</div>
		{:else}
			<div class="invoices-table-wrapper">
				<table class="invoices-table">
					<thead>
						<tr>
							<th>Invoice #</th>
							<th>Client</th>
							<th>Date</th>
							<th>Amount</th>
							<th>Status</th>
							<th>PDF</th>
							<th>Actions</th>
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
									<span class="status-badge" class:paid={invoice.paid} class:unpaid={!invoice.paid}>
										{invoice.paid ? 'Paid' : 'Unpaid'}
									</span>
								</td>
								<td>
									{#if invoice.hasPdf}
										<span class="pdf-badge available">
											<svg viewBox="0 0 20 20" fill="currentColor">
												<path fill-rule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Z" clip-rule="evenodd" />
											</svg>
											Available
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
												title="Download PDF"
												onclick={() => downloadPdf(invoice.id)}
												disabled={downloadingId === invoice.id}
											>
												{#if downloadingId === invoice.id}
													<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
														<circle cx="12" cy="12" r="9" stroke-width="2" stroke-dasharray="45 15" />
													</svg>
												{:else}
													<svg viewBox="0 0 20 20" fill="currentColor">
														<path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
														<path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
													</svg>
												{/if}
											</button>
										{/if}
										<button
											class="action-btn view"
											title="View Invoice"
											onclick={() => viewInvoice(invoice.id)}
										>
											<svg viewBox="0 0 20 20" fill="currentColor">
												<path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
												<path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd" />
											</svg>
										</button>
										<button
											class="action-btn edit"
											title="Edit Invoice"
											onclick={() => editInvoice(invoice.id)}
										>
											<svg viewBox="0 0 20 20" fill="currentColor">
												<path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
												<path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
											</svg>
										</button>
										<button
											class="action-btn delete"
											title="Delete Invoice"
											onclick={() => confirmDelete(invoice.id)}
											disabled={deletingId === invoice.id}
										>
											{#if deletingId === invoice.id}
												<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
													<circle cx="12" cy="12" r="9" stroke-width="2" stroke-dasharray="45 15" />
												</svg>
											{:else}
												<svg viewBox="0 0 20 20" fill="currentColor">
													<path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" />
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
		{/if}
	</section>
</div>

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm}
	<div class="modal-backdrop" role="button" tabindex="0" onclick={cancelDelete} onkeydown={(e) => e.key === 'Escape' && cancelDelete()}>
		<div class="modal" role="dialog" aria-modal="true" onpointerdown={(e) => e.stopPropagation()}>
			<div class="modal-icon danger">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
				</svg>
			</div>
			<h3>Delete Invoice?</h3>
			<p>This will permanently delete this invoice and its PDF. This action cannot be undone.</p>
			<div class="modal-actions">
				<button class="modal-btn cancel" onclick={cancelDelete}>Cancel</button>
				<button class="modal-btn delete" onclick={() => deleteInvoice(showDeleteConfirm!)}>Delete</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.dashboard {
		max-width: 1200px;
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

	.header-stats {
		display: flex;
		gap: 1rem;
	}

	.stat-card {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		padding: 1rem 1.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 100px;
	}

	.stat-value {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.stat-label {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
	}

	.invoices-section {
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--color-border-primary);
	}

	.section-header h2 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
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

	.invoices-table-wrapper {
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

	.action-btn.delete:hover {
		border-color: #ef4444;
		color: #ef4444;
	}

	.spin {
		animation: spin 0.9s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
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

		.header-stats {
			width: 100%;
		}

		.stat-card {
			flex: 1;
		}

		.section-header {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

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
