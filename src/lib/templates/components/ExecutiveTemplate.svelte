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
		if (typeof invoice.balanceDue === 'number') return invoice.balanceDue;
		const fallback = totalAmount() - amountPaid();
		return Number.isFinite(fallback) ? fallback : 0;
	};

	const balanceState = (): BalanceState => {
		const balance = balanceDue();
		if (balance < 0) return 'credit';
		if (invoice.paid === true) return 'settled';
		if (amountPaid() > 0 && balance > 0) return 'partial';
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

	const companyName = (): string => {
		if (!invoice.invoiceFrom) return '';
		return invoice.invoiceFrom.split('\n')[0] || '';
	};

	const companyDetails = (): string => {
		if (!invoice.invoiceFrom) return '';
		const lines = invoice.invoiceFrom.split('\n');
		return lines.slice(1).join('\n').trim();
	};
</script>

<div class="invoice-preview executive-template">
	<!-- Navy accent bar -->
	<div class="accent-bar"></div>

	<div class="content">
		<header class="exec-header">
			<div class="header-brand">
				{#if getLogoUrl()}
					<img class="logo" src={getLogoUrl()} alt="Logo" />
				{/if}
				<div class="brand-text">
					{#if companyName()}
						<h2 class="company-name">{companyName()}</h2>
					{/if}
					{#if companyDetails()}
						<pre class="company-details">{companyDetails()}</pre>
					{/if}
				</div>
			</div>
			<div class="header-title">
				<h1 class="invoice-label">{invoice.invoiceLabel || $_('invoice.invoice_label')}</h1>
				{#if invoice.invoiceNumber}
					<div class="invoice-number">#{invoice.invoiceNumber}</div>
				{/if}
				<span class={`status-badge ${balanceState()}`}>{statusLabel()}</span>
			</div>
		</header>

		<section class="details-grid">
			<div class="detail-card">
				<span class="card-label">{$_('invoice.to')}</span>
				<div class="card-value">
					{#if invoice.invoiceTo}
						<pre>{invoice.invoiceTo}</pre>
					{:else}
						<span class="placeholder">{$_('placeholders.to')}</span>
					{/if}
				</div>
			</div>
			<div class="detail-card">
				<div class="meta-grid">
					<span class="meta-label">{$_('invoice.date')}:</span>
					<span class="meta-value">{invoice.date || '—'}</span>
					<span class="meta-label">{$_('invoice.due_date')}:</span>
					<span class="meta-value">{invoice.dueDate || '—'}</span>
					{#if invoice.terms}
						<span class="meta-label">{$_('fields.terms')}:</span>
						<span class="meta-value">{invoice.terms}</span>
					{/if}
				</div>
			</div>
		</section>

		<section class="balance-strip">
			<span class="balance-label"
				>{balanceDue() < 0 ? $_('summary.credit_balance') : $_('summary.balance_due')}</span
			>
			<span class="balance-amount">{$toUSCurrency(Math.abs(balanceDue()))}</span>
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
						<tr class="empty-row">
							<td colspan="4">{$_('items.no_items')}</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</section>

		<section class="summary-section">
			<div class="summary-table">
				<div class="summary-row">
					<span>{$_('summary.subtotal')}:</span>
					<span>{$toUSCurrency(subTotal())}</span>
				</div>
				{#if discountDisplayValue() > 0}
					<div class="summary-row">
						<span>{$_('summary.discount')}:</span>
						<span>-{$toUSCurrency(discountDisplayValue())}</span>
					</div>
				{/if}
				{#if taxDisplayValue() > 0}
					<div class="summary-row">
						<span>{$_('summary.tax')}:</span>
						<span>+{$toUSCurrency(taxDisplayValue())}</span>
					</div>
				{/if}
				{#if shippingDisplayValue() > 0}
					<div class="summary-row">
						<span>{$_('summary.shipping')}:</span>
						<span>+{$toUSCurrency(shippingDisplayValue())}</span>
					</div>
				{/if}
				<div class="summary-row total-row">
					<span>{$_('summary.total')}:</span>
					<span>{$toUSCurrency(totalAmount())}</span>
				</div>
				{#if amountPaid() > 0}
					<div class="summary-row">
						<span>{$_('summary.amount_paid')}:</span>
						<span>{$toUSCurrency(amountPaid())}</span>
					</div>
				{/if}
				<div class="summary-row balance-row">
					<span
						>{balanceDue() < 0
							? `${$_('summary.credit_balance')}:`
							: `${$_('summary.balance_due')}:`}</span
					>
					<span>{$toUSCurrency(Math.abs(balanceDue()))}</span>
				</div>
			</div>
		</section>

		{#if invoice.notes || invoice.terms}
			<section class="footer-section">
				{#if invoice.notes}
					<div class="footer-block">
						<span class="footer-label">{$_('fields.notes')}:</span>
						<p>{invoice.notes}</p>
					</div>
				{/if}
				{#if invoice.terms}
					<div class="footer-block">
						<span class="footer-label">{$_('fields.terms')}:</span>
						<p>{invoice.terms}</p>
					</div>
				{/if}
			</section>
		{/if}
	</div>
</div>

<style>
	.invoice-preview {
		display: flex;
		flex-direction: column;
		background: white;
		color: #1e293b;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		width: 100%;
		box-sizing: border-box;
		line-height: 1.5;
	}

	/* ── Accent Bar ── */
	.accent-bar {
		height: 6px;
		background: linear-gradient(90deg, #1e293b 0%, #334155 100%);
		flex-shrink: 0;
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding: 1.75rem 2rem;
	}

	/* ── Header ── */
	.exec-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1.5rem;
	}

	.header-brand {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		flex: 1;
	}

	.logo {
		max-width: 72px;
		max-height: 72px;
		object-fit: contain;
		border-radius: 6px;
	}

	.company-name {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 700;
		color: #1e293b;
		font-family: Georgia, 'Times New Roman', serif;
	}

	.company-details {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		margin: 0.15rem 0 0 0;
		white-space: pre-wrap;
		font-size: 0.8rem;
		color: #64748b;
		line-height: 1.4;
	}

	.header-title {
		text-align: right;
		flex-shrink: 0;
	}

	.invoice-label {
		margin: 0;
		font-size: 1.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #1e293b;
		font-family: Georgia, 'Times New Roman', serif;
	}

	.invoice-number {
		font-size: 0.9rem;
		color: #64748b;
		margin-top: 0.15rem;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		margin-top: 0.4rem;
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #64748b;
	}

	.status-badge::before {
		content: '';
		display: inline-block;
		width: 0.4rem;
		height: 0.4rem;
		border-radius: 50%;
		background: currentColor;
	}

	.status-badge.due {
		color: #dc2626;
	}
	.status-badge.partial {
		color: #2563eb;
	}
	.status-badge.settled,
	.status-badge.credit {
		color: #059669;
	}

	/* ── Details Grid ── */
	.details-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}

	.detail-card {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.card-label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #94a3b8;
	}

	.card-value pre {
		font-family: inherit;
		margin: 0;
		white-space: pre-wrap;
		font-size: 0.9rem;
		color: #1e293b;
	}

	.placeholder {
		color: #cbd5e1;
		font-style: italic;
	}

	.meta-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.2rem 0.75rem;
		align-items: baseline;
	}

	.meta-label {
		font-size: 0.78rem;
		color: #94a3b8;
		font-weight: 600;
	}

	.meta-value {
		font-size: 0.9rem;
		color: #1e293b;
		font-weight: 500;
	}

	/* ── Balance Strip ── */
	.balance-strip {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 0.75rem 1.25rem;
	}

	.balance-label {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #64748b;
	}

	.balance-amount {
		font-size: 1.35rem;
		font-weight: 800;
		color: #1e293b;
		font-family: Georgia, 'Times New Roman', serif;
	}

	/* ── Items Table ── */
	.items-section {
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		overflow: hidden;
	}

	.items-table {
		width: 100%;
		border-collapse: collapse;
		table-layout: fixed;
	}

	.items-table th {
		text-align: left;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 0.6rem 0.85rem;
		color: #f1f5f9;
		background: #1e293b;
	}

	.items-table td {
		padding: 0.55rem 0.85rem;
		font-size: 0.875rem;
		color: #334155;
		border-bottom: 1px solid #f1f5f9;
	}

	.items-table tbody tr:last-child td {
		border-bottom: none;
	}

	.items-table tbody tr:nth-child(even) {
		background: #f8fafc;
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

	.empty-row td {
		text-align: center;
		font-style: italic;
		color: #94a3b8;
		padding: 1.5rem !important;
	}

	/* ── Summary ── */
	.summary-section {
		display: flex;
		justify-content: flex-end;
	}

	.summary-table {
		width: 100%;
		max-width: 340px;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.875rem;
		padding: 0.15rem 0;
	}

	.summary-row span:first-child {
		color: #64748b;
	}

	.summary-row span:last-child {
		font-weight: 500;
	}

	.total-row {
		font-weight: 700;
		padding-top: 0.4rem;
		border-top: 1px solid #e2e8f0;
		margin-top: 0.2rem;
	}

	.total-row span:first-child {
		color: #1e293b;
	}

	.balance-row {
		font-weight: 800;
		font-size: 0.95rem;
		padding-top: 0.4rem;
		border-top: 2px solid #1e293b;
		margin-top: 0.2rem;
	}

	.balance-row span:first-child {
		color: #1e293b;
	}

	/* ── Footer ── */
	.footer-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid #e2e8f0;
	}

	.footer-label {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #94a3b8;
	}

	.footer-block p {
		margin: 0.1rem 0 0 0;
		font-size: 0.85rem;
		color: #475569;
		white-space: pre-wrap;
		line-height: 1.5;
	}

	/* ── Print ── */
	@media print {
		.invoice-preview {
			background: white !important;
			color: black !important;
		}
		.accent-bar {
			background: #1e293b !important;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		.items-table th {
			background: #1e293b !important;
			color: #f1f5f9 !important;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		.items-table tbody tr:nth-child(even) {
			background: #f8fafc !important;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		.balance-strip {
			background: #f8fafc !important;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		.status-badge {
			color: #1f2937 !important;
		}
		.status-badge::before {
			box-shadow: none !important;
		}
	}

	/* ── Mobile ── */
	@media only screen and (max-width: 768px) {
		.content {
			padding: 1.25rem;
		}

		.exec-header {
			flex-direction: column;
			gap: 1rem;
		}

		.header-title {
			text-align: left;
		}

		.details-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.summary-section {
			justify-content: stretch;
		}

		.summary-table {
			max-width: 100%;
		}
	}
</style>
