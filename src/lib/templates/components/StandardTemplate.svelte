<script lang="ts">
	import { browser } from '$app/environment';
	import { _ } from 'svelte-i18n';
	import { toUSCurrency } from '$lib/currency.js';
	import { calculateDiscount, calculateTax } from '$lib/InvoiceCalculator.js';
	import type { InvoiceData, InvoiceTotals } from '$lib/types';

	interface Props {
		invoice: InvoiceData;
		totals?: InvoiceTotals;
	}

	let { invoice, totals = {} as InvoiceTotals }: Props = $props();

	const getLogoUrl = (): string | null => {
		if (!invoice.logo) return null;
		if (typeof invoice.logo === 'string') return invoice.logo;
		if (browser && invoice.logo instanceof File) {
			return URL.createObjectURL(invoice.logo);
		}
		return null;
	};

	// Extract company name from invoiceFrom (first line)
	const companyName = (): string => {
		if (!invoice.invoiceFrom) return '';
		const lines = invoice.invoiceFrom.split('\n');
		return lines[0] || '';
	};

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
</script>

<div class="invoice-preview standard-template">
	<header class="standard-header">
		<div class="header-left">
			{#if getLogoUrl()}
				<div class="logo-section">
					<img src={getLogoUrl()} alt="Logo" />
				</div>
			{/if}
			{#if companyName()}
				<h1 class="company-name">{companyName()}</h1>
			{/if}
		</div>
		<div class="header-right">
			<h2 class="invoice-title">{invoice.invoiceLabel || $_('invoice.invoice_label')}</h2>
			{#if invoice.invoiceNumber}
				<div class="invoice-number"># {invoice.invoiceNumber}</div>
			{/if}
		</div>
	</header>

	<section class="info-section">
		<div class="bill-to">
			<h3>Bill To:</h3>
			{#if invoice.invoiceTo}
				<pre class="client-info">{invoice.invoiceTo}</pre>
			{:else}
				<span class="placeholder">{$_('placeholders.to')}</span>
			{/if}
		</div>
		<div class="invoice-details">
			<div class="detail-row">
				<span class="label">Date:</span>
				<span class="value">{invoice.date || '—'}</span>
			</div>
			{#if invoice.terms}
				<div class="detail-row">
					<span class="label">Payment Terms:</span>
					<span class="value">{invoice.terms}</span>
				</div>
			{/if}
			<div class="detail-row">
				<span class="label">Due Date:</span>
				<span class="value">{invoice.dueDate || '—'}</span>
			</div>
			<div class="balance-due-box">
				<span class="label">Balance Due:</span>
				<span class="value">{$toUSCurrency(balanceDue())}</span>
			</div>
		</div>
	</section>

	<section class="items-section">
		<table class="items-table">
			<thead>
				<tr>
					<th class="item-col">Item</th>
					<th class="qty-col">Quantity</th>
					<th class="rate-col">Rate</th>
					<th class="amount-col">Amount</th>
				</tr>
			</thead>
			<tbody>
				{#if invoice.items?.length}
					{#each invoice.items as item, index (index)}
						<tr>
							<td class="item-col">
								{item.name || `${$_('items.item')} ${index + 1}`}
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
			<span class="label">Subtotal:</span>
			<span class="value">{$toUSCurrency(subTotal())}</span>
		</div>
		{#if discountDisplayValue() > 0}
			<div class="summary-row">
				<span class="label">Discount:</span>
				<span class="value">-{$toUSCurrency(discountDisplayValue())}</span>
			</div>
		{/if}
		{#if taxDisplayValue() > 0}
			<div class="summary-row">
				<span class="label">Tax ({taxRate()}):</span>
				<span class="value">{$toUSCurrency(taxDisplayValue())}</span>
			</div>
		{/if}
		{#if shippingDisplayValue() > 0}
			<div class="summary-row">
				<span class="label">Shipping:</span>
				<span class="value">{$toUSCurrency(shippingDisplayValue())}</span>
			</div>
		{/if}
		<div class="summary-row total">
			<span class="label">Total:</span>
			<span class="value">{$toUSCurrency(totalAmount())}</span>
		</div>
		{#if amountPaid() > 0}
			<div class="summary-row">
				<span class="label">Amount Paid:</span>
				<span class="value">{$toUSCurrency(amountPaid())}</span>
			</div>
		{/if}
	</section>

	{#if invoice.notes}
		<section class="notes-section">
			<h3>Notes</h3>
			<p>{invoice.notes}</p>
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

	.standard-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.header-left {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.logo-section {
		max-width: 120px;
	}

	.logo-section img {
		max-width: 100%;
		height: auto;
		object-fit: contain;
	}

	.company-name {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
		color: #333;
	}

	.header-right {
		text-align: right;
	}

	.invoice-title {
		font-size: 1.75rem;
		font-weight: 600;
		margin: 0;
		color: #333;
	}

	.invoice-number {
		font-size: 1rem;
		color: #666;
		margin-top: 0.25rem;
	}

	.info-section {
		display: flex;
		justify-content: space-between;
		gap: 2rem;
		margin-top: 1rem;
	}

	.bill-to h3 {
		font-size: 0.85rem;
		font-weight: 600;
		color: #666;
		margin: 0 0 0.5rem 0;
	}

	.client-info {
		font-family: inherit;
		margin: 0;
		white-space: pre-wrap;
		font-size: 0.95rem;
	}

	.placeholder {
		color: #999;
		font-style: italic;
	}

	.invoice-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		text-align: right;
	}

	.detail-row {
		font-size: 0.9rem;
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	.detail-row .label {
		color: #666;
	}

	.detail-row .value {
		min-width: 100px;
	}

	.balance-due-box {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		background: #f5f5f5;
		padding: 0.75rem 1rem;
		margin-top: 0.5rem;
		font-weight: 600;
		font-size: 0.95rem;
	}

	.balance-due-box .label {
		color: #333;
	}

	.balance-due-box .value {
		color: #333;
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
		background: #333;
		color: white;
	}

	.items-table th {
		padding: 0.75rem 1rem;
		text-align: left;
		font-weight: 500;
		font-size: 0.85rem;
	}

	.items-table td {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #e5e5e5;
		vertical-align: top;
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
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		width: 250px;
		font-size: 0.9rem;
	}

	.summary-row .label {
		color: #666;
	}

	.summary-row .value {
		font-weight: 500;
		text-align: right;
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

	.notes-section {
		padding-top: 1rem;
		border-top: 1px solid #e5e5e5;
	}

	.notes-section h3 {
		font-size: 0.85rem;
		font-weight: 600;
		color: #666;
		margin: 0 0 0.5rem 0;
	}

	.notes-section p {
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
			background: #333 !important;
			color: white !important;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		.balance-due-box {
			background: #f5f5f5 !important;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
	}

	@media only screen and (max-width: 768px) {
		.invoice-preview {
			padding: 1.5rem;
		}

		.standard-header {
			flex-direction: column;
			gap: 1rem;
		}

		.header-right {
			text-align: left;
		}

		.info-section {
			flex-direction: column;
			gap: 1.5rem;
		}

		.invoice-details {
			text-align: left;
		}

		.detail-row {
			justify-content: flex-start;
		}

		.summary-row {
			width: 100%;
		}

		.balance-due-box {
			width: 100%;
		}
	}
</style>
