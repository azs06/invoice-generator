<script>
	import { _ } from 'svelte-i18n';
	import { toUSCurrency } from '$lib/currency.js';
	import { calculateDiscount, calculateTax } from '$lib/InvoiceCalculator.js';
	import { DEFAULT_LOGO_PATH } from '$lib/index.js';

	let { invoice, totals = {} } = $props();

	const totalAmount = () => totals.total ?? invoice.total ?? 0;
	const subTotal = () => totals.subTotal ?? invoice.subTotal ?? 0;

	const discountDisplayValue = () => calculateDiscount(invoice.discount, subTotal());

	const taxDisplayValue = () => {
		const amountAfterDiscount = subTotal() - discountDisplayValue();
		return calculateTax(invoice.tax, amountAfterDiscount);
	};

	const shippingDisplayValue = () => invoice.shipping?.amount ?? 0;
	const amountPaid = () => invoice.amountPaid ?? 0;

	const balanceDue = () => {
		if (typeof invoice.balanceDue === 'number') return invoice.balanceDue;
		const fallback = totalAmount() - amountPaid();
		return Number.isFinite(fallback) ? fallback : 0;
	};
</script>

<div class="invoice-preview atlantic-template">
	<header class="header">
		<div class="brand">
			<div class="logo" class:is-placeholder={!invoice.logo}>
				{#if invoice.logo}
					{#if typeof invoice.logo === 'string'}
						<img src={invoice.logo} alt="Logo" />
					{:else}
						<img src={URL.createObjectURL(invoice.logo)} alt="Logo" />
					{/if}
				{:else}
					<img src={DEFAULT_LOGO_PATH} alt="Logo" />
				{/if}
			</div>
			<div class="from" aria-label="From">
				{#if invoice.invoiceFrom}
					<pre>{invoice.invoiceFrom}</pre>
				{/if}
			</div>
		</div>
		<div class="titleblock">
			<h1 class="title">{invoice.invoiceLabel || $_('invoice.invoice_label')}</h1>
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
		<div class="balance">
			<div class="balance-label">{$_('summary.balance_due')}</div>
			<div class="balance-amount">{$toUSCurrency(Math.abs((totals.total ?? 0) - (invoice.amountPaid ?? 0)))}</div>
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
			{#if (invoice.amountPaid ?? 0) > 0}
				<div class="row"><span>{$_('summary.amount_paid')}</span><span>{$toUSCurrency(invoice.amountPaid || 0)}</span></div>
			{/if}
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
		/* Palette */
		--bg: #faf9f5;
		--text: #141413;
		--border: #b0aea5;

		/* Typography */
		font-family: "Tiempos Text", "Times New Roman", sans-serif;
		letter-spacing: -0.02em;
		text-wrap: pretty;

		background: var(--bg);
		color: var(--text);
		/* no outer border per design */
		border-radius: 12px;
		padding: 24px;
		max-width: 960px;
		margin: 0 auto;
	}

	.header {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
		padding-bottom: 16px;
		/* no section divider border per design */
	}
	.brand { display: grid; grid-template-columns: auto 1fr; gap: 12px; align-items: start; }
	.logo { width: 96px; height: 64px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.03); border-radius: 8px; overflow: hidden; }
	.logo img { width: 100%; height: 100%; object-fit: contain; }
	.logo.is-placeholder { opacity: 0.9; }
	.from pre { margin: 0; white-space: pre-wrap; font-size: 0.95rem; }

	.titleblock { display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
	.title { margin: 0; font-size: 2rem; font-weight: 600; }
	.meta { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; align-self: stretch; }
	.meta-item { display: contents; }
	.label { color: #5f5e59; font-size: 0.8rem; text-transform: uppercase; }
	.value { font-size: 0.95rem; justify-self: end; }
	.terms .value { white-space: pre-wrap; }

	.parties { display: grid; grid-template-columns: 1fr auto; gap: 16px; padding: 16px 0; border-bottom: 1px solid var(--border); }
	.party-label { font-size: 0.85rem; color: #5f5e59; text-transform: uppercase; }
	.party-value pre { margin: 0; white-space: pre-wrap; font-size: 1rem; }
	.balance { text-align: right; }
	.balance-label { font-size: 0.85rem; color: #5f5e59; text-transform: uppercase; }
	.balance-amount { font-size: 1.5rem; font-weight: 700; }

	.items { padding-top: 8px; }
	.table { width: 100%; border-collapse: collapse; table-layout: fixed; }
	.table thead th { text-align: left; font-size: 0.8rem; color: #3e3d3a; background: rgba(0,0,0,0.03); padding: 10px 8px; }
	.table td { padding: 10px 8px; }
	.table th.qty, .table td.qty, .table th.price, .table td.price, .table th.amount, .table td.amount { text-align: right; }
	.table .empty td { text-align: center; font-style: italic; color: #5f5e59; padding: 16px; }

	.summary { display: flex; justify-content: flex-end; padding-top: 8px; }
	.rows { width: 100%; max-width: 380px; display: grid; grid-template-columns: 1fr auto; gap: 6px 12px; }
	.row { display: contents; }
	.row span:first-child { color: #5f5e59; }
	.total span:first-child { color: var(--text); font-weight: 600; }
	.total span:last-child { font-weight: 700; }

	.notes { margin-top: 12px; padding-top: 12px; }
	.notes .label { font-size: 0.85rem; color: #5f5e59; text-transform: uppercase; margin-bottom: 6px; }
	.notes .text { white-space: pre-wrap; }

	@media (max-width: 768px) {
		.header { grid-template-columns: 1fr; align-items: start; }
		.titleblock { align-items: flex-start; }
		.parties { grid-template-columns: 1fr; }
		.summary { justify-content: stretch; }
		.rows { max-width: 100%; }
	}

	@media print {
		.invoice-preview { background: #fff !important; color: #000 !important; border-color: var(--border) !important; }
		.table thead th { background: #f5f5f5 !important; color: #000 !important; }
	}
</style>
