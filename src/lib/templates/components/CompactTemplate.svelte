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

	const balanceState = () => {
		const balance = balanceDue();
		if (balance < 0) return 'credit';
		if (invoice.paid === true) return 'settled';
		if (amountPaid() > 0 && balance > 0) return 'partial';
		return 'due';
	};

	const statusLabel = () => {
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

<div class="invoice-preview compact-template">
	<header class="header">
		<div class="left">
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
		</div>
		<div class="right">
			<div class="title-row">
				<h1 class="title">{invoice.invoiceLabel || $_('invoice.invoice_label')}</h1>
				<div class="meta">
					<span class="number">#{invoice.invoiceNumber || 'PENDING'}</span>
					<span class={`status ${balanceState()}`}>{statusLabel()}</span>
				</div>
			</div>
			<div class="meta-grid">
				<div class="meta-item">
					<span class="label">{$_('invoice.date')}:</span>
					<span class="value">{invoice.date || '—'}</span>
				</div>
				<div class="meta-item">
					<span class="label">{$_('invoice.due_date')}:</span>
					<span class="value">{invoice.dueDate || '—'}</span>
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
			<div class="party-label">{$_('invoice.from')}</div>
			<div class="party-value"><pre>{invoice.invoiceFrom || $_('placeholders.from')}</pre></div>
		</div>
		<div class="party">
			<div class="party-label">{$_('invoice.to')}</div>
			<div class="party-value"><pre>{invoice.invoiceTo || $_('placeholders.to')}</pre></div>
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

	<section class="totals">
		<div class="totals-grid">
			<div class="row"><span>{$_('summary.subtotal')}:</span><span>{$toUSCurrency(subTotal())}</span></div>
			<div class="row"><span>{$_('summary.discount')}:</span><span>-{$toUSCurrency(discountDisplayValue())}</span></div>
			<div class="row"><span>{$_('summary.tax')}:</span><span>+{$toUSCurrency(taxDisplayValue())}</span></div>
			<div class="row"><span>{$_('summary.shipping')}:</span><span>+{$toUSCurrency(shippingDisplayValue())}</span></div>
			<div class="row total"><span>{$_('summary.total')}:</span><span>{$toUSCurrency(totalAmount())}</span></div>
			<div class="row"><span>{$_('summary.amount_paid')}:</span><span>{$toUSCurrency(amountPaid())}</span></div>
			<div class="row total">
				<span>{balanceDue() < 0 ? $_('summary.credit_balance') : $_('summary.balance_due')}:</span>
				<span>{$toUSCurrency(Math.abs(balanceDue()))}</span>
			</div>
		</div>
	</section>

	{#if invoice.notes}
		<section class="notes">
			<div class="label">{$_('fields.notes')}:</div>
			<div class="text">{invoice.notes}</div>
		</section>
	{/if}
</div>

<style>
	.invoice-preview {
		--color-bg: #fff;
		--color-text: #111827;
		--color-subtle: #6b7280;
		--color-border: #e5e7eb;
		--radius: 0.5rem;

		background: var(--color-bg);
		color: var(--color-text);
		max-width: 960px;
		margin: 0 auto;
		padding: 1.25rem;
		border-radius: var(--radius);
		/* no outer border per design */
		font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
	}

	:global(.dark) .invoice-preview {
		--color-bg: #111827;
		--color-text: #f9fafb;
		--color-subtle: #9ca3af;
		--color-border: #374151;
	}

	.header {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 1rem;
		align-items: start;
		padding-bottom: 0.75rem;
		/* no section divider border per design */
	}

	.logo {
		width: 120px;
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.375rem;
		background: transparent;
		overflow: hidden;
	}
	.logo img { width: 100%; height: 100%; object-fit: contain; }
	.logo.is-placeholder { background: rgba(0,0,0,0.03); }

	.title-row { display: flex; justify-content: space-between; align-items: baseline; gap: .75rem; }
	.title { margin: 0; font-size: 1.5rem; font-weight: 600; letter-spacing: .02em; }
	.meta { display: flex; align-items: center; gap: .5rem; }
	.number { color: var(--color-subtle); font-size: .9rem; }
	.status { font-size: .7rem; font-weight: 700; padding: .15rem .4rem; border-radius: .25rem; letter-spacing: .05em; }
	.status.due { background: #fef2f2; color: #b91c1c; }
	.status.partial { background: #eff6ff; color: #1d4ed8; }
	.status.settled, .status.credit { background: #ecfdf5; color: #047857; }

	.meta-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: .5rem 1rem; margin-top: .5rem; }
	.meta-item { display: flex; gap: .35rem; align-items: baseline; min-width: 0; }
	.label { color: var(--color-subtle); font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; }
	.value { font-size: .9rem; word-break: break-word; }
	.terms .value { white-space: pre-wrap; }

	.parties { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: .75rem 0; }
	.party-label { font-size: .75rem; color: var(--color-subtle); text-transform: uppercase; letter-spacing: .05em; }
	.party-value pre { margin: 0; white-space: pre-wrap; font-family: inherit; font-size: .9rem; }

	.items { margin-top: .5rem; }
	.table { width: 100%; border-collapse: collapse; table-layout: fixed; }
	.table th, .table td { padding: .5rem .5rem; border-bottom: 0; font-size: .9rem; }
	.table thead th { text-align: left; background: rgba(0,0,0,0.03); color: var(--color-text); font-weight: 600; }
	:global(.dark) .table thead th { background: #0b1220; }
	.table th.qty, .table td.qty, .table th.price, .table td.price { text-align: right; }
	.table th.amount, .table td.amount { text-align: right; font-weight: 600; }
	.table .empty td { text-align: center; font-style: italic; color: var(--color-subtle); padding: 1rem; }

	.totals { display: flex; justify-content: flex-end; margin-top: .5rem; }
	.totals-grid { width: 100%; max-width: 360px; display: grid; grid-template-columns: 1fr auto; gap: .25rem 1rem; }
	.row { display: contents; }
	.row > span:first-child { color: var(--color-subtle); }
	.total > span:first-child { color: var(--color-text); font-weight: 600; }
	.total > span:last-child { font-weight: 700; }

	.notes { margin-top: .75rem; padding-top: .5rem; }
	.notes .label { font-size: .8rem; color: var(--color-subtle); margin-bottom: .25rem; }
	.notes .text { white-space: pre-wrap; font-size: .9rem; }

	@media (max-width: 768px) {
		.invoice-preview { padding: 1rem; }
		.header { grid-template-columns: 1fr; }
		.meta-grid { grid-template-columns: 1fr 1fr; }
		.parties { grid-template-columns: 1fr; }
		.totals { justify-content: stretch; }
		.totals-grid { max-width: 100%; }
	}

	@media print {
		.invoice-preview { background: #fff !important; color: #000 !important; border: none !important; }
		.table thead th { background: #f5f5f5 !important; color: #000 !important; }
		.status { background: #eee !important; color: #000 !important; }
	}
</style>
