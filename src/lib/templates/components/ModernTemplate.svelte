<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { toUSCurrency } from '$lib/currency.js';
	import { calculateDiscount, calculateTax } from '$lib/InvoiceCalculator.js';
	import { DEFAULT_LOGO_PATH } from '$lib/index.js';
	import type { InvoiceData, InvoiceTotals } from '$lib/types';

	interface Props {
		invoice: InvoiceData;
		totals?: InvoiceTotals;
	}

	let { invoice, totals = {} as InvoiceTotals }: Props = $props();

	type BalanceState = 'credit' | 'settled' | 'partial' | 'due';

	const totalAmount = (): number => totals.total ?? invoice.total ?? 0;
	const subTotal = (): number => totals.subTotal ?? invoice.subTotal ?? 0;

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
				return $_('status.credit_owed');
			case 'settled':
				return $_('status.paid');
			case 'partial':
				return $_('status.partially_paid');
			default:
				return $_('status.unpaid');
		}
	};

	const balanceSummaryLabel = (): string =>
		balanceDue() < 0 ? $_('summary.credit_balance') : $_('summary.balance_due');
</script>

<div class="invoice-preview modern-template">
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
				<span class="invoice-label">{invoice.invoiceLabel || $_('invoice.invoice_label')}</span>
				<span class="invoice-number">#{invoice.invoiceNumber || 'PENDING'}</span>
			</div>
			<span class={`status-text ${balanceState()}`}>{statusLabel()}</span>
		</div>
	</header>

	<section class="details-grid">
		<div class="details-column left-column">
			<div class="details-block">
				<span class="details-label">{$_('invoice.to')}:</span>
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
				<span class="details-label">{$_('invoice.date')}:</span>
				<span class="details-value">{invoice.date || '—'}</span>
			</div>
			{#if invoice.terms}
				<div class="details-block">
					<span class="details-label">{$_('fields.terms')}:</span>
					<span class="details-value">{invoice.terms}</span>
				</div>
			{/if}
			<div class="details-block">
				<span class="details-label">{$_('invoice.due_date')}:</span>
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
					<th>{$_('items.item')}</th>
					<th>{$_('items.quantity')}</th>
					<th>{$_('items.price')}</th>
					<th>{$_('items.amount')}</th>
				</tr>
			</thead>
			<tbody>
				{#if invoice.items?.length}
					{#each invoice.items as item, index (index)}
						<tr>
							<td>{item.name || `${$_('items.item')} ${index + 1}`}</td>
							<td>{item.quantity ?? 0}</td>
							<td>{$toUSCurrency(item.price || 0)}</td>
							<td>{$toUSCurrency(item.amount || (item.price || 0) * (item.quantity || 0))}</td>
						</tr>
					{/each}
				{:else}
					<tr class="empty-row">
						<td colspan="4">{$_('items.add_item_prompt')}</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	<section class="summary">
		<div class="summary-table">
			<div class="summary-row">
				<span>{$_('summary.subtotal')}:</span>
				<span>{$toUSCurrency(subTotal())}</span>
			</div>
			<div class="summary-row">
				<span>{$_('summary.discount')}:</span>
				<span>-{$toUSCurrency(discountDisplayValue())}</span>
			</div>
			<div class="summary-row">
				<span>{$_('summary.tax')}:</span>
				<span>+{$toUSCurrency(taxDisplayValue())}</span>
			</div>
			<div class="summary-row">
				<span>{$_('summary.shipping')}:</span>
				<span>+{$toUSCurrency(shippingDisplayValue())}</span>
			</div>
			<div class="summary-row emphasize">
				<span>{$_('summary.total')}:</span>
				<span>{$toUSCurrency(totalAmount())}</span>
			</div>
			<div class="summary-row">
				<span>{$_('summary.amount_paid')}:</span>
				<span>{$toUSCurrency(amountPaid())}</span>
			</div>
			<div class="summary-row emphasize">
				<span
					>{balanceDue() < 0 ? `${$_('summary.credit_balance')}:` : `${$_('summary.due')}:`}</span
				>
				<span>{$toUSCurrency(Math.abs(balanceDue()))}</span>
			</div>
		</div>
	</section>

	{#if invoice.notes}
		<section class="notes-section">
			<span class="details-label">{$_('fields.notes')}:</span>
			<p>{invoice.notes}</p>
		</section>
	{/if}

	{#if !invoice.terms || invoice.terms.trim() === ''}
		<!-- Terms moved to details section, only show here if not already shown above -->
	{:else if invoice.notes}
		<section class="notes-section">
			<span class="details-label">{$_('fields.terms')}:</span>
			<p>{invoice.terms}</p>
		</section>
	{/if}
</div>

<style>
	.invoice-preview {
		/* Define CSS variables for this template */
		--radius-lg: 0.75rem;
		--radius-md: 0.5rem;
		--radius-sm: 0.25rem;
		--color-bg-primary: #ffffff;
		--color-bg-secondary: #f9fafb;
		--color-text-primary: #111827;
		--color-text-secondary: #6b7280;
		--color-border-primary: #e5e7eb;
		--color-accent-blue: #2563eb;

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

	/* Print-specific styles */
	@media print {
		.invoice-preview {
			--color-bg-primary: #ffffff !important;
			--color-bg-secondary: #f5f5f5 !important;
			--color-text-primary: #000000 !important;
			--color-text-secondary: #4b5563 !important;
			--color-border-primary: #d1d5db !important;

			background: white !important;
			color: black !important;
		}

		.items-table th {
			background: #f5f5f5 !important;
			color: #000 !important;
		}

		.balance-due-highlight {
			background: #f5f5f5 !important;
		}
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
