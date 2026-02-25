<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { toUSCurrency } from '$lib/currency.js';
	import { calculateDiscount, calculateTax } from '$lib/InvoiceCalculator.js';
	import type { InvoiceData, InvoiceTotals } from '$lib/types';

	interface Props {
		invoice: InvoiceData;
		totals?: InvoiceTotals;
	}

	let { invoice, totals = {} as InvoiceTotals }: Props = $props();

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
		if (typeof invoice.balanceDue === 'number') return invoice.balanceDue;
		const fallback = totalAmount() - amountPaid();
		return Number.isFinite(fallback) ? fallback : 0;
	};

	const taxRate = (): string => {
		if (!invoice.tax) return '0%';
		if (invoice.tax.type === 'percent') return `${invoice.tax.rate}%`;
		return '';
	};

	// Extract company name from first line of invoiceFrom
	const companyName = (): string => {
		if (!invoice.invoiceFrom) return '';
		return invoice.invoiceFrom.split('\n')[0] || '';
	};
</script>

<div class="invoice-preview simple-template">
	<header class="document-header">
		<div class="header-left">
			<span class="company-name">{companyName()}</span>
		</div>
		<div class="header-right">
			<div class="invoice-number"># {invoice.invoiceNumber || ''}</div>
			<div class="invoice-date">{invoice.date || ''}</div>
		</div>
	</header>
	<div class="header-divider"></div>

	<header class="simple-header">
		<h1 class="invoice-title">{invoice.invoiceLabel || $_('invoice.invoice_label')}</h1>
	</header>

	<section class="parties-row">
		<div class="bill-to">
			<h2>BILL TO</h2>
			<div class="party-content">
				{#if invoice.invoiceTo}
					<pre>{invoice.invoiceTo}</pre>
				{:else}
					<span class="placeholder">{$_('placeholders.to')}</span>
				{/if}
			</div>
		</div>
		<div class="payment-info">
			<h2>PAYMENT</h2>
			<div class="payment-details">
				<div class="payment-row">
					<span class="label">Due Date:</span>
					<span class="value">{invoice.dueDate || '—'}</span>
				</div>
				{#if invoice.terms}
					<div class="payment-row">
						<span class="label">Payment Terms:</span>
						<span class="value">{invoice.terms}</span>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<section class="items-section">
		<table class="items-table">
			<thead>
				<tr>
					<th class="item-col">ITEM</th>
					<th class="qty-col">QUANTITY</th>
					<th class="rate-col">RATE</th>
					<th class="amount-col">AMOUNT</th>
				</tr>
			</thead>
			<tbody>
				{#if invoice.items?.length}
					{#each invoice.items as item, index (index)}
						<tr>
							<td class="item-col">
								<strong>{item.name || `${$_('items.item')} ${index + 1}`}</strong>
							</td>
							<td class="qty-col">{item.quantity ?? 0}</td>
							<td class="rate-col">{$toUSCurrency(item.price || 0)}</td>
							<td class="amount-col"
								>{$toUSCurrency(item.amount || (item.price || 0) * (item.quantity || 0))}</td
							>
						</tr>
					{/each}
				{:else}
					<tr>
						<td colspan="4" class="empty-row">{$_('items.no_items')}</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</section>

	<section class="summary-section">
		<div class="summary-row">
			<span class="label">Subtotal</span>
			<span class="value">{$toUSCurrency(subTotal())}</span>
		</div>
		{#if discountDisplayValue() > 0}
			<div class="summary-row">
				<span class="label">Discount</span>
				<span class="value">-{$toUSCurrency(discountDisplayValue())}</span>
			</div>
		{/if}
		{#if taxDisplayValue() > 0}
			<div class="summary-row">
				<span class="label">Tax ({taxRate()})</span>
				<span class="value">{$toUSCurrency(taxDisplayValue())}</span>
			</div>
		{/if}
		{#if shippingDisplayValue() > 0}
			<div class="summary-row">
				<span class="label">Shipping</span>
				<span class="value">{$toUSCurrency(shippingDisplayValue())}</span>
			</div>
		{/if}
		<div class="summary-row total">
			<span class="label">Total</span>
			<span class="value">{$toUSCurrency(totalAmount())}</span>
		</div>
		{#if amountPaid() > 0}
			<div class="summary-row">
				<span class="label">Amount Paid</span>
				<span class="value">{$toUSCurrency(amountPaid())}</span>
			</div>
		{/if}
	</section>

	{#if invoice.notes}
		<section class="notes-section">
			<h3>NOTES</h3>
			<p>{invoice.notes}</p>
		</section>
	{/if}

	{#if invoice.terms}
		<section class="terms-section">
			<h3>TERMS</h3>
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
		background: white;
		color: #333;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		width: 100%;
		box-sizing: border-box;
		line-height: 1.5;
	}

	.document-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.header-left {
		display: flex;
		align-items: center;
	}

	.company-name {
		font-size: 1rem;
		font-weight: 500;
		color: #333;
	}

	.header-right {
		text-align: right;
	}

	.invoice-number {
		font-size: 1rem;
		font-weight: 600;
		color: #333;
	}

	.invoice-date {
		font-size: 0.875rem;
		color: #666;
		margin-top: 0.125rem;
	}

	.header-divider {
		height: 3px;
		background: #e5e5e5;
		margin: 1rem 0 1.5rem 0;
	}

	.simple-header {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.invoice-title {
		font-size: 2rem;
		font-weight: 300;
		margin: 0;
		color: #333;
		letter-spacing: 0.1em;
	}

	.parties-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		margin-top: 1rem;
	}

	.bill-to h2,
	.payment-info h2 {
		font-size: 0.75rem;
		font-weight: 600;
		color: #666;
		margin: 0 0 0.5rem 0;
		letter-spacing: 0.05em;
	}

	.party-content pre {
		font-family: inherit;
		margin: 0;
		white-space: pre-wrap;
		font-size: 0.95rem;
	}

	.placeholder {
		color: #999;
		font-style: italic;
	}

	.payment-details {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.payment-row {
		font-size: 0.9rem;
	}

	.payment-row .label {
		color: #666;
	}

	.items-section {
		margin-top: 1rem;
	}

	.items-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	.items-table thead tr {
		background: #f7f7f7;
	}

	.items-table th {
		padding: 0.75rem 1rem;
		text-align: left;
		font-weight: 600;
		font-size: 0.75rem;
		color: #333;
		letter-spacing: 0.05em;
		border-bottom: 1px solid #e5e5e5;
	}

	.items-table td {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #f0f0f0;
		vertical-align: top;
	}

	.items-table tbody tr:last-child td {
		border-bottom: none;
	}

	.qty-col,
	.rate-col,
	.amount-col {
		text-align: right;
	}

	.items-table th.qty-col,
	.items-table th.rate-col,
	.items-table th.amount-col {
		text-align: right;
	}

	.empty-row {
		text-align: center;
		color: #999;
		font-style: italic;
		padding: 2rem !important;
	}

	.summary-section {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.5rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e5e5;
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		width: 280px;
		font-size: 0.9rem;
	}

	.summary-row .label {
		color: #666;
	}

	.summary-row .value {
		font-weight: 500;
	}

	.summary-row.total {
		font-weight: 600;
		font-size: 1rem;
		padding-top: 0.5rem;
		border-top: 2px solid #333;
		margin-top: 0.5rem;
	}

	.summary-row.total .label,
	.summary-row.total .value {
		color: #333;
	}

	.notes-section,
	.terms-section {
		padding-top: 1rem;
	}

	.notes-section h3,
	.terms-section h3 {
		font-size: 0.75rem;
		font-weight: 600;
		color: #666;
		margin: 0 0 0.5rem 0;
		letter-spacing: 0.05em;
	}

	.notes-section p,
	.terms-section p {
		margin: 0;
		font-size: 0.9rem;
		color: #555;
		white-space: pre-wrap;
		line-height: 1.6;
	}

	@media print {
		.invoice-preview {
			background: white !important;
			color: black !important;
		}
		.items-table thead tr {
			background: #f7f7f7 !important;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
	}

	@media only screen and (max-width: 768px) {
		.invoice-preview {
			padding: 1.5rem;
		}

		.parties-row {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}

		.summary-row {
			width: 100%;
		}
	}
</style>
