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
</script>

<div class="invoice-preview classic-template">
	<header class="classic-header">
		<div class="header-top">
			<div class="company-info">
				<div class="logo-container" class:is-placeholder={!invoice.logo}>
					{#if invoice.logo}
						{#if typeof invoice.logo === 'string'}
							<img src={invoice.logo} alt="Company logo" />
						{:else}
							<img src={URL.createObjectURL(invoice.logo)} alt="Company logo" />
						{/if}
					{:else}
						<img src={DEFAULT_LOGO_PATH} alt="Company logo" />
					{/if}
				</div>
				{#if invoice.invoiceFrom}
					<div class="company-details">
						<pre>{invoice.invoiceFrom}</pre>
					</div>
				{/if}
			</div>

			<div class="invoice-info">
				<h1 class="invoice-title">{invoice.invoiceLabel || $_('invoice.invoice_label')}</h1>
				<div class="invoice-number">#{invoice.invoiceNumber || 'PENDING'}</div>
				<div class="status-badge {balanceState()}">{statusLabel()}</div>
			</div>
		</div>
	</header>

	<section class="billing-details">
		<div class="bill-to">
			<h2>{$_('invoice.to')}:</h2>
			<div class="client-info">
				<pre>{invoice.invoiceTo || '—'}</pre>
			</div>
		</div>

		<div class="invoice-meta">
			<div class="meta-item">
				<span class="meta-label">{$_('invoice.date')}:</span>
				<span class="meta-value">{invoice.date || '—'}</span>
			</div>
			<div class="meta-item">
				<span class="meta-label">{$_('invoice.due_date')}:</span>
				<span class="meta-value">{invoice.dueDate || '—'}</span>
			</div>
			{#if invoice.terms}
				<div class="meta-item">
					<span class="meta-label">{$_('fields.terms')}:</span>
					<span class="meta-value">{invoice.terms}</span>
				</div>
			{/if}
		</div>
	</section>

	<section class="items-section">
		<table class="items-table">
			<thead>
				<tr>
					<th class="item-col">{$_('items.item')}</th>
					<th class="qty-col">{$_('items.quantity')}</th>
					<th class="price-col">{$_('items.price')}</th>
					<th class="total-col">{$_('items.amount')}</th>
				</tr>
			</thead>
			<tbody>
				{#if invoice.items?.length}
					{#each invoice.items as item, index (index)}
						<tr>
							<td class="item-col">{item.name || `${$_('items.item')} ${index + 1}`}</td>
							<td class="qty-col">{item.quantity ?? 0}</td>
							<td class="price-col">{$toUSCurrency(item.price || 0)}</td>
							<td class="total-col"
								>{$toUSCurrency(item.amount || (item.price || 0) * (item.quantity || 0))}</td
							>
						</tr>
					{/each}
				{:else}
					<tr class="empty-row">
						<td colspan="4">{$_('items.no_items')}</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</section>

	<section class="totals-section">
		<div class="totals-container">
			<div class="totals-row">
				<span class="totals-label">{$_('summary.subtotal')}:</span>
				<span class="totals-value">{$toUSCurrency(subTotal())}</span>
			</div>
			{#if discountDisplayValue() > 0}
				<div class="totals-row">
					<span class="totals-label">{$_('summary.discount')}:</span>
					<span class="totals-value">-{$toUSCurrency(discountDisplayValue())}</span>
				</div>
			{/if}
			{#if taxDisplayValue() > 0}
				<div class="totals-row">
					<span class="totals-label">{$_('summary.tax')}:</span>
					<span class="totals-value">+{$toUSCurrency(taxDisplayValue())}</span>
				</div>
			{/if}
			{#if shippingDisplayValue() > 0}
				<div class="totals-row">
					<span class="totals-label">{$_('summary.shipping')}:</span>
					<span class="totals-value">+{$toUSCurrency(shippingDisplayValue())}</span>
				</div>
			{/if}
			<div class="totals-row total-row">
				<span class="totals-label">{$_('summary.total')}:</span>
				<span class="totals-value">{$toUSCurrency(totalAmount())}</span>
			</div>
			{#if amountPaid() > 0}
				<div class="totals-row">
					<span class="totals-label">{$_('summary.amount_paid')}:</span>
					<span class="totals-value">{$toUSCurrency(amountPaid())}</span>
				</div>
			{/if}
			<div class="totals-row balance-row">
				<span class="totals-label"
					>{balanceDue() < 0
						? `${$_('summary.credit_balance')}:`
						: `${$_('summary.balance_due')}:`}</span
				>
				<span class="totals-value">{$toUSCurrency(Math.abs(balanceDue()))}</span>
			</div>
		</div>
	</section>

	{#if invoice.notes || invoice.terms}
		<section class="notes-section">
			{#if invoice.notes}
				<div class="notes-block">
					<h3>{$_('fields.notes')}:</h3>
					<p>{invoice.notes}</p>
				</div>
			{/if}
			{#if invoice.terms && !invoice.notes}
				<div class="notes-block">
					<h3>{$_('fields.terms')}:</h3>
					<p>{invoice.terms}</p>
				</div>
			{/if}
		</section>
	{/if}
</div>

<style>
	.invoice-preview {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 2rem;
		background: white;
		color: #333;
		font-family: 'Times New Roman', serif;
		max-width: 1024px;
		margin: 0 auto;
		border: 1px solid #ddd;
	}

	.classic-header {
		border-bottom: 2px solid #333;
		padding-bottom: 1rem;
	}

	.header-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 2rem;
	}

	.company-info {
		flex: 1;
	}

	.logo-container {
		max-width: 120px;
		margin-bottom: 1rem;
	}

	.logo-container img {
		width: 100%;
		height: auto;
		object-fit: contain;
	}

	.logo-container.is-placeholder {
		background: #f5f5f5;
		padding: 1rem;
		border-radius: 4px;
	}

	.company-details {
		font-size: 0.9rem;
		line-height: 1.4;
		white-space: pre-wrap;
	}

	.company-details pre {
		font-family: inherit;
		margin: 0;
		white-space: pre-wrap;
	}

	.invoice-info {
		text-align: right;
	}

	.invoice-title {
		font-size: 2.5rem;
		font-weight: bold;
		margin: 0 0 0.5rem 0;
		letter-spacing: 2px;
	}

	.invoice-number {
		font-size: 1.2rem;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.78rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: #6b7280;
		padding: 0;
	}
	.status-badge::before {
		content: '';
		display: inline-block;
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 999px;
		background: currentColor;
		box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.55);
	}

	.status-badge.due { color: #dc2626; }
	.status-badge.partial { color: #2563eb; }
	.status-badge.settled,
	.status-badge.credit { color: #059669; }

	.billing-details {
		display: flex;
		justify-content: space-between;
		gap: 2rem;
		margin: 1.5rem 0;
		padding: 1rem 0;
		border-bottom: 1px solid #ddd;
	}

	.bill-to {
		flex: 1;
	}

	.bill-to h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.1rem;
		font-weight: bold;
	}

	.client-info pre {
		font-family: inherit;
		margin: 0;
		white-space: pre-wrap;
		line-height: 1.4;
	}

	.invoice-meta {
		text-align: right;
		min-width: 200px;
	}

	.meta-item {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.meta-label {
		font-weight: bold;
		margin-right: 1rem;
	}

	.items-section {
		margin: 1.5rem 0;
	}

	.items-table {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 1rem;
	}

	.items-table th {
		background-color: #f8f8f8;
		border: 1px solid #ddd;
		padding: 0.75rem;
		text-align: left;
		font-weight: bold;
	}

	.items-table td {
		border: 1px solid #ddd;
		padding: 0.75rem;
		vertical-align: top;
	}

	.item-col {
		width: 50%;
	}

	.qty-col {
		width: 15%;
		text-align: center;
	}

	.price-col {
		width: 17%;
		text-align: right;
	}

	.total-col {
		width: 18%;
		text-align: right;
		font-weight: bold;
	}

	.empty-row td {
		text-align: center;
		font-style: italic;
		color: #666;
	}

	.totals-section {
		display: flex;
		justify-content: flex-end;
		margin: 1.5rem 0;
	}

	.totals-container {
		width: 100%;
		max-width: 400px;
	}

	.totals-row {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem 0;
		border-bottom: 1px dotted #ddd;
	}

	.total-row {
		font-weight: bold;
		font-size: 1.1rem;
		border-bottom: 1px solid #333;
	}

	.balance-row {
		font-weight: bold;
		font-size: 1.1rem;
		border-bottom: none;
	}

	.notes-section {
		margin-top: 2rem;
		padding-top: 1rem;
		border-top: 1px solid #ddd;
	}

	.notes-block {
		margin-bottom: 1rem;
	}

	.notes-block h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		font-weight: bold;
	}

	.notes-block p {
		margin: 0;
		line-height: 1.4;
		white-space: pre-wrap;
	}

	/* Print-specific styles */
	@media print {
		.invoice-preview {
			background: white !important;
			color: black !important;
			border: none !important;
		}

		.items-table th {
			background: #f8f8f8 !important;
			color: black !important;
		}

		.status-badge { color: #1f2937 !important; }
		.status-badge::before { box-shadow: none !important; }
	}

	@media (max-width: 768px) {
		.invoice-preview {
			padding: 1rem;
		}

		.header-top {
			flex-direction: column;
			gap: 1rem;
		}

		.invoice-info {
			text-align: left;
		}

		.billing-details {
			flex-direction: column;
			gap: 1rem;
		}

		.invoice-meta {
			text-align: left;
		}

		.items-table {
			font-size: 0.9rem;
		}

		.items-table th,
		.items-table td {
			padding: 0.5rem;
		}

		.totals-section {
			justify-content: stretch;
		}

		.totals-container {
			max-width: 100%;
		}
	}
</style>
