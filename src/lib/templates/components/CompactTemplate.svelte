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
</script>

<div class="invoice-preview compact-template">
	<header class="compact-header">
		<div class="header-left">
			{#if getLogoUrl()}
				<img class="logo" src={getLogoUrl()} alt="Logo" />
			{/if}
			<div class="company-block">
				{#if invoice.invoiceFrom}
					<pre class="from-text">{invoice.invoiceFrom}</pre>
				{/if}
			</div>
		</div>
		<div class="header-right">
			<h1 class="invoice-title">{invoice.invoiceLabel || $_('invoice.invoice_label')}</h1>
			{#if invoice.invoiceNumber}
				<div class="meta-row">
					<span class="meta-label">{$_('invoice.number')}:</span>
					<span class="meta-value">#{invoice.invoiceNumber}</span>
				</div>
			{/if}
			<div class="meta-row">
				<span class="meta-label">{$_('invoice.date')}:</span>
				<span class="meta-value">{invoice.date || '—'}</span>
			</div>
			<div class="meta-row">
				<span class="meta-label">{$_('invoice.due_date')}:</span>
				<span class="meta-value">{invoice.dueDate || '—'}</span>
			</div>
			{#if invoice.terms}
				<div class="meta-row">
					<span class="meta-label">{$_('fields.terms')}:</span>
					<span class="meta-value">{invoice.terms}</span>
				</div>
			{/if}
		</div>
	</header>

	<section class="bill-to-section">
		<span class="section-label">{$_('invoice.to')}:</span>
		<div class="bill-to-value">
			{#if invoice.invoiceTo}
				<pre>{invoice.invoiceTo}</pre>
			{:else}
				<span class="placeholder">{$_('placeholders.to')}</span>
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
					<th class="amount-col">{$_('items.amount')}</th>
				</tr>
			</thead>
			<tbody>
				{#if invoice.items?.length}
					{#each invoice.items as item, index (index)}
						<tr>
							<td class="item-col">{item.name || `${$_('items.item')} ${index + 1}`}</td>
							<td class="qty-col">{item.quantity ?? 0}</td>
							<td class="price-col">{$toUSCurrency(item.price || 0)}</td>
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

	<section class="bottom-section">
		<div class="bottom-left">
			{#if invoice.notes}
				<div class="notes-block">
					<span class="section-label">{$_('fields.notes')}:</span>
					<p>{invoice.notes}</p>
				</div>
			{/if}
			{#if invoice.terms}
				<div class="terms-block">
					<span class="section-label">{$_('fields.terms')}:</span>
					<p>{invoice.terms}</p>
				</div>
			{/if}
		</div>
		<div class="bottom-right">
			<div class="totals-table">
				<div class="totals-row">
					<span>{$_('summary.subtotal')}:</span>
					<span>{$toUSCurrency(subTotal())}</span>
				</div>
				{#if discountDisplayValue() > 0}
					<div class="totals-row">
						<span>{$_('summary.discount')}:</span>
						<span>-{$toUSCurrency(discountDisplayValue())}</span>
					</div>
				{/if}
				{#if taxDisplayValue() > 0}
					<div class="totals-row">
						<span>{$_('summary.tax')}:</span>
						<span>+{$toUSCurrency(taxDisplayValue())}</span>
					</div>
				{/if}
				{#if shippingDisplayValue() > 0}
					<div class="totals-row">
						<span>{$_('summary.shipping')}:</span>
						<span>+{$toUSCurrency(shippingDisplayValue())}</span>
					</div>
				{/if}
				<div class="totals-row total-row">
					<span>{$_('summary.total')}:</span>
					<span>{$toUSCurrency(totalAmount())}</span>
				</div>
				{#if amountPaid() > 0}
					<div class="totals-row">
						<span>{$_('summary.amount_paid')}:</span>
						<span>{$toUSCurrency(amountPaid())}</span>
					</div>
				{/if}
				<div class="totals-row balance-row">
					<span>{balanceDue() < 0 ? $_('summary.credit_balance') : $_('summary.balance_due')}:</span
					>
					<span>{$toUSCurrency(Math.abs(balanceDue()))}</span>
				</div>
			</div>
		</div>
	</section>
</div>

<style>
	.invoice-preview {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem 2rem;
		background: white;
		color: #374151;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		font-size: 0.875rem;
		width: 100%;
		box-sizing: border-box;
		line-height: 1.45;
	}

	/* ── Header ── */
	.compact-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1.5rem;
		padding-bottom: 0.75rem;
		border-bottom: 2px solid #e5e7eb;
	}

	.header-left {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		flex: 1;
	}

	.logo {
		max-width: 64px;
		max-height: 64px;
		object-fit: contain;
		border-radius: 4px;
	}

	.from-text {
		font-family: inherit;
		margin: 0;
		white-space: pre-wrap;
		font-size: 0.8rem;
		line-height: 1.4;
		color: #4b5563;
	}

	.header-right {
		text-align: right;
		flex-shrink: 0;
	}

	.invoice-title {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0 0 0.35rem 0;
		color: #111827;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.meta-row {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		font-size: 0.8rem;
		line-height: 1.6;
	}

	.meta-label {
		color: #6b7280;
	}

	.meta-value {
		font-weight: 500;
		color: #374151;
		min-width: 80px;
		text-align: right;
	}

	/* ── Bill To ── */
	.bill-to-section {
		display: flex;
		gap: 0.5rem;
		align-items: flex-start;
	}

	.section-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		flex-shrink: 0;
		padding-top: 0.1rem;
	}

	.bill-to-value pre {
		font-family: inherit;
		margin: 0;
		white-space: pre-wrap;
		font-size: 0.85rem;
	}

	.placeholder {
		color: #9ca3af;
		font-style: italic;
	}

	/* ── Items Table ── */
	.items-section {
		margin-top: 0.25rem;
	}

	.items-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.82rem;
	}

	.items-table th {
		padding: 0.45rem 0.6rem;
		text-align: left;
		font-weight: 600;
		font-size: 0.72rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		border-bottom: 1px solid #d1d5db;
		background: #f9fafb;
	}

	.items-table td {
		padding: 0.4rem 0.6rem;
		border-bottom: 1px solid #f3f4f6;
		vertical-align: top;
	}

	.qty-col,
	.price-col,
	.amount-col {
		text-align: right;
	}

	.items-table th.qty-col,
	.items-table th.price-col,
	.items-table th.amount-col {
		text-align: right;
	}

	.empty-row {
		text-align: center;
		color: #9ca3af;
		font-style: italic;
		padding: 1.5rem !important;
	}

	/* ── Bottom: Notes + Totals side by side ── */
	.bottom-section {
		display: grid;
		grid-template-columns: 1fr 260px;
		gap: 2rem;
		margin-top: 0.5rem;
		padding-top: 0.75rem;
		border-top: 1px solid #e5e7eb;
	}

	.bottom-left {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.notes-block p,
	.terms-block p {
		margin: 0.15rem 0 0 0;
		font-size: 0.8rem;
		color: #4b5563;
		white-space: pre-wrap;
		line-height: 1.5;
	}

	.bottom-right {
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
	}

	.totals-table {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.totals-row {
		display: flex;
		justify-content: space-between;
		font-size: 0.82rem;
		padding: 0.15rem 0;
	}

	.totals-row span:first-child {
		color: #6b7280;
	}

	.totals-row span:last-child {
		font-weight: 500;
	}

	.total-row {
		font-weight: 600;
		padding-top: 0.35rem;
		border-top: 1px solid #d1d5db;
		margin-top: 0.25rem;
	}

	.total-row span:first-child {
		color: #111827;
	}

	.balance-row {
		font-weight: 700;
		font-size: 0.9rem;
		padding-top: 0.35rem;
		border-top: 1px solid #374151;
		margin-top: 0.25rem;
	}

	.balance-row span:first-child {
		color: #111827;
	}

	/* ── Print ── */
	@media print {
		.invoice-preview {
			background: white !important;
			color: black !important;
		}
		.items-table th {
			background: #f9fafb !important;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		.bottom-section {
			grid-template-columns: 1fr 260px !important;
		}
	}

	/* ── Mobile ── */
	@media only screen and (max-width: 768px) {
		.invoice-preview {
			padding: 1.25rem;
		}

		.compact-header {
			flex-direction: column;
			gap: 1rem;
		}

		.header-right {
			text-align: left;
		}

		.meta-row {
			justify-content: flex-start;
		}

		.bottom-section {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
	}
</style>
