<script lang="ts">
	import { browser } from '$app/environment';
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

	// Compute logo URL safely for both SSR and client-side rendering
	const getLogoUrl = (): string | null => {
		if (!invoice.logo) return null;

		// If logo is already a string (data URL or URL), use it directly
		if (typeof invoice.logo === 'string') {
			return invoice.logo;
		}

		// Only create object URLs on the client side
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

	const balanceLabel = (): string =>
		balanceDue() < 0 ? $_('summary.credit_balance') : $_('summary.balance_due');

	const balanceState = (): BalanceState => {
		const balance = balanceDue();
		if (balance < 0) return 'credit';
		if (invoice.paid === true || balance === 0) return 'settled';
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
</script>

<div class="invoice-preview atlantic-template">
	<header class="header">
		<div class="brand">
			<div class="logo" class:is-placeholder={!getLogoUrl()}>
				{#if getLogoUrl()}
					<img src={getLogoUrl()} alt="Logo" />
				{:else}
					<img src={DEFAULT_LOGO_PATH} alt="Logo" />
				{/if}
			</div>
			<div class="from" aria-label="From">
				<span class="from-label">{$_('invoice.from')}</span>
				<pre>{invoice.invoiceFrom || $_('placeholders.from')}</pre>
			</div>
		</div>
		<div class="titleblock">
			<div class="title-header">
				<h1 class="title">{invoice.invoiceLabel || $_('invoice.invoice_label')}</h1>
				<span class={`status ${balanceState()}`}>{statusLabel()}</span>
			</div>
			<div class="meta">
				<div class="meta-item">
					<span class="label">{$_('invoice.number')}:</span>
					<span class="value">{invoice.invoiceNumber || 'PENDING'}</span>
				</div>
				<div class="meta-item">
					<span class="label">{$_('invoice.date')}:</span>
					<span class="value">{invoice.date || '\u2014'}</span>
				</div>
				<div class="meta-item">
					<span class="label">{$_('invoice.due_date')}:</span>
					<span class="value">{invoice.dueDate || '\u2014'}</span>
				</div>
				{#if invoice.terms}
					<div class="meta-item terms">
						<span class="label">{$_('fields.terms')}:</span>
						<span class="value">{invoice.terms}</span>
					</div>
				{/if}
			</div>
		</div>
	</header>

	<section class="parties">
		<div class="party">
			<div class="party-label">{$_('invoice.to')}</div>
			<div class="party-value"><pre>{invoice.invoiceTo || '\u2014'}</pre></div>
		</div>
		<div class={`balance ${balanceDue() < 0 ? 'credit' : ''}`}>
			<div class="balance-label">{balanceLabel()}</div>
			<div class="balance-amount">{$toUSCurrency(Math.abs(balanceDue()))}</div>
		</div>
	</section>

	<section class="items">
		<table class="table">
			<thead>
				<tr>
					<th>{$_('items.item')}</th>
					<th class="qty">{$_('items.quantity')}</th>
					<th class="price">{$_('items.price')}</th>
					<th class="amount">{$_('items.amount')}</th>
				</tr>
			</thead>
			<tbody>
				{#if invoice.items?.length}
					{#each invoice.items as item, index (index)}
						<tr>
							<td>{item.name || `${$_('items.item')} ${index + 1}`}</td>
							<td class="qty">{item.quantity ?? 0}</td>
							<td class="price">{$toUSCurrency(item.price || 0)}</td>
							<td class="amount">{$toUSCurrency(item.amount || (item.price || 0) * (item.quantity || 0))}</td>
						</tr>
					{/each}
				{:else}
					<tr class="empty">
						<td colspan="4">{$_('items.add_item_prompt')}</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</section>

	<section class="summary">
		<div class="rows">
			<div class="row"><span>{$_('summary.subtotal')}</span><span>{$toUSCurrency(subTotal())}</span></div>
			<div class="row"><span>{$_('summary.discount')}</span><span>-{$toUSCurrency(discountDisplayValue())}</span></div>
			<div class="row"><span>{$_('summary.tax')}</span><span>+{$toUSCurrency(taxDisplayValue())}</span></div>
			<div class="row"><span>{$_('summary.shipping')}</span><span>+{$toUSCurrency(shippingDisplayValue())}</span></div>
			<div class="row total"><span>{$_('summary.total')}</span><span>{$toUSCurrency(totalAmount())}</span></div>
			<div class="row"><span>{$_('summary.amount_paid')}</span><span>{$toUSCurrency(amountPaid())}</span></div>
			<div class={`row grand-total ${balanceDue() < 0 ? 'credit' : ''}`}>
				<span>{balanceLabel()}</span>
				<span>{$toUSCurrency(Math.abs(balanceDue()))}</span>
			</div>
		</div>
	</section>

	{#if invoice.notes}
		<section class="notes">
			<div class="label">{$_('fields.notes')}</div>
			<div class="text">{invoice.notes}</div>
		</section>
	{/if}
</div>

<style>
	.invoice-preview {
		--bg: #faf9f5;
		--text: #141413;
		--muted: #5f5e59;
		--border: #d6d2c6;
		--border-strong: #c7c2b6;
		--surface: rgba(255, 255, 255, 0.85);
		--surface-alt: rgba(20, 20, 19, 0.06);

		font-family: "Tiempos Text", "Times New Roman", serif;
		letter-spacing: -0.01em;
		text-wrap: pretty;
		line-height: 1.5;
		font-variant-numeric: tabular-nums;
		-webkit-font-smoothing: antialiased;

		background: var(--bg);
		color: var(--text);
		border-radius: 12px;
		border: 1px solid var(--border);
		padding: 28px;
		max-width: 960px;
		margin: 0 auto;
		box-shadow: 0 22px 48px rgba(15, 23, 42, 0.08);
	}

	.header {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px;
		padding-bottom: 20px;
	}

	.brand {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 14px;
		align-items: start;
	}
	.logo {
		width: 96px;
		height: 64px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface);
		border-radius: 10px;
		border: 1px solid var(--border);
		overflow: hidden;
	}
	.logo img { width: 100%; height: 100%; object-fit: contain; }
	.logo.is-placeholder { opacity: 0.9; }
	.from { display: flex; flex-direction: column; gap: 6px; }
	.from-label {
		font-size: 0.7rem;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}
	.from pre { margin: 0; white-space: pre-wrap; font-size: 0.95rem; color: var(--text); }

	.titleblock {
		display: flex;
		flex-direction: column;
		gap: 12px;
		align-items: stretch;
	}
	.title-header { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
	.title {
		margin: 0;
		font-size: 2.15rem;
		font-weight: 600;
		letter-spacing: 0.08em;
	}
	.status {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.72rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		font-weight: 600;
		color: var(--muted);
		padding: 0;
	}
	.status::before {
		content: '';
		display: inline-block;
		width: 0.42rem;
		height: 0.42rem;
		border-radius: 999px;
		background: currentColor;
		box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.6);
	}
	.status.due { color: #e11d48; }
	.status.partial { color: #1d4ed8; }
	.status.settled,
	.status.credit { color: #047857; }

	.meta {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 6px 18px;
		align-self: stretch;
	}
	.meta-item { display: contents; }
	.label {
		color: var(--muted);
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}
	.value {
		font-size: 0.95rem;
		justify-self: end;
	}
	.terms .value { white-space: pre-wrap; }

	.parties {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 20px;
		padding: 20px 0;
		border-top: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
	}
	.party-label {
		font-size: 0.8rem;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}
	.party-value pre {
		margin: 0;
		white-space: pre-wrap;
		font-size: 1rem;
	}

	.balance {
		text-align: right;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 6px;
		padding: 14px 18px;
		border-radius: 12px;
		border: 1px solid var(--border);
		background: var(--surface);
	}
	.balance-label {
		font-size: 0.75rem;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.12em;
	}
	.balance-amount { font-size: 1.8rem; font-weight: 700; }
	.balance.credit .balance-amount { color: #047857; }

	.items {
		margin-top: 24px;
		border-radius: 12px;
		border: 1px solid var(--border);
		overflow: hidden;
		background: var(--surface);
	}
	.table { width: 100%; border-collapse: collapse; table-layout: fixed; }
	.table thead th {
		text-align: left;
		font-size: 0.78rem;
		color: var(--muted);
		letter-spacing: 0.1em;
		text-transform: uppercase;
		background: var(--surface-alt);
		padding: 12px 16px;
		font-weight: 600;
		border-bottom: 1px solid var(--border-strong);
	}
	.table td {
		padding: 12px 16px;
		font-size: 0.95rem;
		color: var(--text);
	}
	.table tbody tr { border-bottom: 1px solid var(--border); }
	.table tbody tr:last-child { border-bottom: none; }
	.table tbody tr:nth-child(even) { background: rgba(20, 20, 19, 0.04); }
	.table tr.empty { background: transparent; }
	.table .empty td {
		text-align: center;
		font-style: italic;
		color: var(--muted);
		padding: 18px;
	}
	.table th.qty,
	.table td.qty,
	.table th.price,
	.table td.price,
	.table th.amount,
	.table td.amount {
		text-align: right;
	}

	.summary {
		display: flex;
		justify-content: flex-end;
		margin-top: 24px;
		padding-top: 18px;
		border-top: 1px solid var(--border);
	}
	.rows {
		width: 100%;
		max-width: 380px;
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 8px 18px;
	}
	.row { display: contents; }
	.row span:first-child { color: var(--muted); }
	.total span:first-child { color: var(--text); font-weight: 600; }
	.total span:last-child { font-weight: 600; }
	.grand-total span:first-child { color: var(--text); font-weight: 700; }
	.grand-total span:last-child { font-weight: 700; font-size: 1.1rem; }
	.grand-total.credit span:last-child { color: #047857; }

	.notes {
		margin-top: 28px;
		padding-top: 18px;
		border-top: 1px solid var(--border);
	}
	.notes .label {
		font-size: 0.78rem;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: 8px;
	}
	.notes .text { white-space: pre-wrap; font-size: 0.95rem; }

	@media (max-width: 768px) {
		.invoice-preview { padding: 20px; }
		.header { grid-template-columns: 1fr; gap: 20px; }
		.titleblock { align-items: flex-start; }
		.title-header { flex-direction: column; align-items: flex-start; gap: 8px; }
		.parties { grid-template-columns: 1fr; }
		.balance { text-align: left; }
		.summary { justify-content: stretch; }
		.rows { max-width: 100%; }
	}

	@media print {
		.invoice-preview {
			--bg: #ffffff;
			--text: #1f2937;
			--muted: #4b5563;
			--border: #d1d5db;
			--border-strong: #cbd5f5;
			--surface: #ffffff;
			--surface-alt: #f5f5f5;

			background: #fff !important;
			color: #000 !important;
			max-width: none !important;
			width: 100% !important;
			margin: 0 !important;
			border-radius: 0 !important;
			border: none !important;
			box-shadow: none !important;
			page-break-inside: avoid;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		.items {
			background: #fff !important;
			border-color: #d1d5db !important;
		}
		.table thead th {
			background: #f5f5f5 !important;
			color: #000 !important;
			border-color: #d1d5db !important;
		}
		.table tbody tr {
			background: transparent !important;
			border-color: #e5e7eb !important;
		}
		.balance {
			background: #fff !important;
			border-color: #d1d5db !important;
		}
		.status { color: #1f2937 !important; }
		.status::before { box-shadow: none !important; }
	}
</style>
