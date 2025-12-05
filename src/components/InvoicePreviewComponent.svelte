<script lang="ts">
	import { DEFAULT_LOGO_PATH, defaultInvoice } from '$lib/index.js';
	import { toUSCurrency } from '$lib/currency.js';
	import { calculateDiscount, calculateTax } from '../lib/InvoiceCalculator.js';
	import type { InvoiceData } from '$lib/types';

	interface Props {
		invoice?: InvoiceData;
	}

	let { invoice = defaultInvoice }: Props = $props();

	type BalanceState = 'credit' | 'settled' | 'partial' | 'due';

	const totalAmount = (): number => invoice.total ?? 0;
	const subTotal = (): number => invoice.subTotal ?? 0;

	const discountDisplayValue = (): number => calculateDiscount(invoice.discount, subTotal());

	const taxDisplayValue = (): number => {
		const amountAfterDiscount = subTotal() - discountDisplayValue();
		return calculateTax(invoice.tax, amountAfterDiscount);
	};

	const shippingDisplayValue = (): number => invoice.shipping?.amount ?? 0;
	const amountPaid = (): number => invoice.amountPaid ?? 0;

	const balanceDue = (): number => {
		if (typeof invoice.balanceDue === 'number') {
			return invoice.balanceDue;
		}

		const fallback = totalAmount() - amountPaid();
		return Number.isFinite(fallback) ? fallback : 0;
	};

	const balanceState = (): BalanceState => {
		const balance = balanceDue();

		if (balance < 0) {
			return 'credit';
		}

		if (invoice.paid === true) {
			return 'settled';
		}

		if (amountPaid() > 0 && balance > 0) {
			return 'partial';
		}

		return 'due';
	};

	const statusLabel = (): string => {
		switch (balanceState()) {
			case 'credit':
				return 'CREDIT OWED';
			case 'settled':
				return 'PAID';
			case 'partial':
				return 'PARTIALLY PAID';
			default:
				return 'UNPAID';
		}
	};

	const balanceSummaryLabel = (): string => (balanceDue() < 0 ? 'Credit balance' : 'Balance due');
</script>

<div class="invoice-preview">
	<header class="preview-header">
		<div class="brand">
			<div class="logo-shell" class:is-placeholder={!invoice.logo}>
				{#if invoice.logo}
					{#if typeof invoice.logo === 'string'}
						<img src={invoice.logo} alt="Uploaded logo" />
					{:else}
						<img src={URL.createObjectURL(invoice.logo)} alt="Uploaded logo" />
					{/if}
				{:else}
					<img src={DEFAULT_LOGO_PATH} alt="FreeInvoice placeholder logo" />
				{/if}
			</div>
		</div>

		<div class="invoice-title-section">
			<div class="invoice-title">
				<span class="invoice-label">{invoice.invoiceLabel || 'INVOICE'}</span>
				<span class="invoice-number">#{invoice.invoiceNumber || 'PENDING'}</span>
			</div>
			<span class={`status-text ${balanceState()}`}>{statusLabel()}</span>
		</div>
	</header>

	<section class="details-grid">
		<div class="details-column left-column">
			<div class="details-block">
				<span class="details-label">Bill To:</span>
				<span class="details-value">{invoice.invoiceTo || '—'}</span>
			</div>
			{#if invoice.invoiceFrom}
				<div class="details-block from-section">
					<span class="details-value">{invoice.invoiceFrom}</span>
				</div>
			{/if}
		</div>
		<div class="details-column right-column">
			<div class="details-block">
				<span class="details-label">Date:</span>
				<span class="details-value">{invoice.date || '—'}</span>
			</div>
			{#if invoice.terms}
				<div class="details-block">
					<span class="details-label">Payment Terms:</span>
					<span class="details-value">{invoice.terms}</span>
				</div>
			{/if}
			<div class="details-block">
				<span class="details-label">Due Date:</span>
				<span class="details-value">{invoice.dueDate || '—'}</span>
			</div>
			<div class="balance-due-highlight">
				<span class="balance-label">{balanceSummaryLabel()}:</span>
				<span class="balance-amount">{$toUSCurrency(Math.abs(balanceDue()))}</span>
			</div>
		</div>
	</section>

	<div class="items-card">
		<table class="items-table">
			<thead>
				<tr>
					<th>Item</th>
					<th>Quantity</th>
					<th>Rate</th>
					<th>Amount</th>
				</tr>
			</thead>
			<tbody>
				{#if invoice.items?.length}
					{#each invoice.items as item, index (index)}
						<tr>
							<td>{item.name || `Item ${index + 1}`}</td>
							<td>{item.quantity ?? 0}</td>
							<td>{$toUSCurrency(item.price || 0)}</td>
							<td>{$toUSCurrency(item.amount || (item.price || 0) * (item.quantity || 0))}</td>
						</tr>
					{/each}
				{:else}
					<tr class="empty-row">
						<td colspan="4">Add line items to populate your invoice.</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	<section class="summary">
		<div class="summary-table">
			<div class="summary-row">
				<span>Subtotal:</span>
				<span>{$toUSCurrency(subTotal())}</span>
			</div>
			<div class="summary-row">
				<span>Discount:</span>
				<span>-{$toUSCurrency(discountDisplayValue())}</span>
			</div>
			<div class="summary-row">
				<span>Tax:</span>
				<span>+{$toUSCurrency(taxDisplayValue())}</span>
			</div>
			<div class="summary-row">
				<span>Shipping:</span>
				<span>+{$toUSCurrency(shippingDisplayValue())}</span>
			</div>
			<div class="summary-row emphasize">
				<span>Total:</span>
				<span>{$toUSCurrency(totalAmount())}</span>
			</div>
			<div class="summary-row">
				<span>Amount Paid:</span>
				<span>{$toUSCurrency(amountPaid())}</span>
			</div>
			<div class="summary-row emphasize">
				<span>{balanceDue() < 0 ? 'Credit:' : 'Due:'}</span>
				<span>{$toUSCurrency(Math.abs(balanceDue()))}</span>
			</div>
		</div>
	</section>

	{#if invoice.notes}
		<section class="notes-section">
			<span class="details-label">Notes:</span>
			<p>{invoice.notes}</p>
		</section>
	{/if}

	{#if !invoice.terms || invoice.terms.trim() === ''}
		<!-- Terms moved to details section, only show here if not already shown above -->
	{:else if invoice.notes}
		<section class="notes-section">
			<span class="details-label">Terms:</span>
			<p>{invoice.terms}</p>
		</section>
	{/if}
</div>

<style>
	.invoice-preview {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 2rem;
		border-radius: var(--radius-lg);
		background: var(--color-bg-primary);
		max-width: 1024px;
		margin: 0 auto;
	}

	.preview-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1.25rem;
		flex-wrap: wrap;
		padding-bottom: 1rem;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0;
	}

	.logo-shell {
		max-width: 150px;
		height: 100%;
		border-radius: var(--radius-md);
		background: transparent;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.logo-shell img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.logo-shell.is-placeholder {
		background: var(--color-bg-secondary);
	}

	.invoice-title-section {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.5rem;
	}

	.invoice-title {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
	}

	.invoice-label {
		font-size: 2rem;
		font-weight: 300;
		letter-spacing: 0.02em;
		color: var(--color-text-primary);
	}

	.invoice-number {
		font-size: 1rem;
		font-weight: 400;
		color: var(--color-text-secondary);
	}

	.status-text {
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.status-text.due {
		color: #c2410c;
	}

	.status-text.partial {
		color: var(--color-accent-blue);
	}

	.status-text.settled {
		color: #047857;
	}

	.status-text.credit {
		color: #047857;
	}

	.details-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		padding: 1.5rem 0;
	}

	.details-column {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.left-column {
		justify-content: flex-start;
	}

	.right-column {
		align-items: flex-end;
		text-align: right;
	}

	.details-block {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.from-section {
		margin-top: 0.5rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--color-border-primary);
	}

	.details-label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.details-value {
		font-size: 0.95rem;
		color: var(--color-text-primary);
		word-break: break-word;
		white-space: pre-wrap;
	}

	.balance-due-highlight {
		margin-top: 0.5rem;
		padding: 0.75rem 1rem;
		background: var(--color-bg-secondary);
		border-radius: var(--radius-md);
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		align-items: flex-end;
	}

	.balance-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.balance-amount {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.items-card {
		border-radius: var(--radius-md);
		overflow: hidden;
		border: 1px solid var(--color-border-primary);
	}

	.items-table {
		width: 100%;
		border-collapse: collapse;
		background: var(--color-bg-primary);
		table-layout: fixed;
	}

	.items-table th {
		text-align: left;
		font-size: 0.8rem;
		font-weight: 600;
		padding: 0.85rem 1rem;
		color: var(--color-text-primary);
		background: #f3f4f6;
	}

	:global(.dark) .items-table th {
		background: #1e293b;
		color: #f1f5f9;
	}

	.items-table th:last-child,
	.items-table td:last-child {
		text-align: right;
	}

	.items-table td {
		padding: 0.75rem 1rem;
		font-size: 0.95rem;
		color: var(--color-text-primary);
		border-bottom: 1px solid var(--color-border-primary);
	}

	.items-table tbody tr:last-child td {
		border-bottom: none;
	}

	.empty-row td {
		text-align: center;
		font-style: italic;
		color: var(--color-text-secondary);
		padding: 1.5rem;
	}

	.summary {
		display: flex;
		justify-content: flex-end;
	}

	.summary-table {
		width: 100%;
		max-width: 400px;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.95rem;
		color: var(--color-text-primary);
		padding: 0.4rem 0;
	}

	.summary-row span:first-child {
		color: var(--color-text-secondary);
	}

	.summary-row.emphasize {
		font-weight: 700;
		font-size: 1.05rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--color-border-primary);
	}

	.summary-row.emphasize span:first-child {
		color: var(--color-text-primary);
	}

	.notes-section {
		padding: 1.25rem 0;
		border-top: 1px solid var(--color-border-primary);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.notes-section p {
		margin: 0;
		font-size: 0.95rem;
		color: var(--color-text-primary);
		white-space: pre-wrap;
		line-height: 1.6;
	}

	@media (max-width: 768px) {
		.invoice-preview {
			padding: 1.25rem;
		}

		.preview-header {
			flex-direction: column;
			align-items: stretch;
		}

		.invoice-title-section {
			align-items: flex-start;
		}

		.invoice-title {
			align-items: flex-start;
		}

		.invoice-label {
			font-size: 1.75rem;
		}

		.details-grid {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}

		.right-column {
			align-items: flex-start;
			text-align: left;
		}

		.balance-due-highlight {
			align-items: flex-start;
		}

		.summary {
			justify-content: stretch;
		}

		.summary-table {
			max-width: 100%;
		}

		.items-table th,
		.items-table td {
			padding: 0.65rem 0.75rem;
			font-size: 0.9rem;
		}
	}
</style>
