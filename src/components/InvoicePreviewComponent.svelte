<script>
	import { defaultInvoice } from '$lib/index.js';
	import { toUSCurrency } from '$lib/currency.js';
	import { calculateDiscount, calculateTax } from '../lib/InvoiceCalculator.js';

	let { invoice = defaultInvoice } = $props();

	const DEFAULT_LOGO_PATH = '/logo.png';

	const totalAmount = () => invoice.total ?? 0;
	const subTotal = () => invoice.subTotal ?? 0;

	const discountDisplayValue = () => calculateDiscount(invoice.discount, subTotal());

	const taxDisplayValue = () => {
		const amountAfterDiscount = subTotal() - discountDisplayValue();
		return calculateTax(invoice.tax, amountAfterDiscount);
	};

	const shippingDisplayValue = () => invoice.shipping?.amount ?? 0;
	const amountPaid = () => invoice.amountPaid ?? 0;

	const balanceDue = () => {
		if (typeof invoice.balanceDue === 'number') {
			return invoice.balanceDue;
		}

		const fallback = totalAmount() - amountPaid();
		return Number.isFinite(fallback) ? fallback : 0;
	};

	const balanceState = () => {
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

	const statusLabel = () => {
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

	const balanceSummaryLabel = () =>
		balanceDue() < 0 ? 'Credit balance' : 'Balance due';
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
			<div class="invoice-meta">
				<span class="meta-label">Invoice #</span>
				<span class="meta-value">{invoice.invoiceNumber || 'Pending'}</span>
			</div>
		</div>

		<div class="status-stack">
			<span class={`status-pill ${balanceState()}`}>{statusLabel()}</span>
			<div class="balance">
				<span class="balance-label">{balanceSummaryLabel()}</span>
				<span class="balance-amount">
					{toUSCurrency(Math.abs(balanceDue()))}
				</span>
				{#if invoice.dueDate}
					<span class="balance-meta">Due {invoice.dueDate}</span>
				{/if}
			</div>
		</div>
	</header>

	<section class="details-grid">
		<div class="details-block">
			<span class="details-label">From</span>
			<span class="details-value">{invoice.invoiceFrom || '—'}</span>
		</div>
		<div class="details-block">
			<span class="details-label">To</span>
			<span class="details-value">{invoice.invoiceTo || '—'}</span>
		</div>
		<div class="details-block">
			<span class="details-label">Invoice Date</span>
			<span class="details-value">{invoice.date || '—'}</span>
		</div>
		<div class="details-block">
			<span class="details-label">Due Date</span>
			<span class="details-value">{invoice.dueDate || '—'}</span>
		</div>
	</section>

	<div class="items-card">
		<table class="items-table">
			<thead>
				<tr>
					<th>Item</th>
					<th>Quantity</th>
					<th>Price</th>
					<th>Amount</th>
				</tr>
			</thead>
			<tbody>
				{#if invoice.items?.length}
					{#each invoice.items as item, index (index)}
						<tr>
							<td>{item.name || `Item ${index + 1}`}</td>
							<td>{item.quantity ?? 0}</td>
							<td>{toUSCurrency(item.price || 0)}</td>
							<td>{toUSCurrency(item.amount || (item.price || 0) * (item.quantity || 0))}</td>
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
				<span>{toUSCurrency(subTotal())}</span>
			</div>
			<div class="summary-row">
				<span>Discount:</span>
				<span>-{toUSCurrency(discountDisplayValue())}</span>
			</div>
			<div class="summary-row">
				<span>Tax:</span>
				<span>+{toUSCurrency(taxDisplayValue())}</span>
			</div>
			<div class="summary-row">
				<span>Shipping:</span>
				<span>+{toUSCurrency(shippingDisplayValue())}</span>
			</div>
			<div class="summary-row emphasize">
				<span>Total:</span>
				<span>{toUSCurrency(totalAmount())}</span>
			</div>
			<div class="summary-row">
				<span>Amount Paid:</span>
				<span>{toUSCurrency(amountPaid())}</span>
			</div>
			<div class="summary-row emphasize">
				<span>{balanceDue() < 0 ? 'Credit:' : 'Due:'}</span>
				<span>{toUSCurrency(Math.abs(balanceDue()))}</span>
			</div>
		</div>
	</section>

	<section class="terms">
		<div class="terms-block">
			<span class="details-label">Terms</span>
			<p>{invoice.terms || '—'}</p>
		</div>
		<div class="terms-block">
			<span class="details-label">Notes</span>
			<p>{invoice.notes || '—'}</p>
		</div>
	</section>
</div>

<style>
	.invoice-preview {
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
		padding: 1.5rem;
		border-radius: var(--radius-lg);
		background: var(--color-bg-primary);
	}

	.preview-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1.25rem;
		flex-wrap: wrap;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.logo-shell {
		width: 64px;
		height: 64px;
		border-radius: var(--radius-md);
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-secondary);
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
		border-style: dashed;
		border-color: rgba(59, 130, 246, 0.45);
	}

	.invoice-meta {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.meta-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		letter-spacing: 0.08em;
	}

	.meta-value {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.status-stack {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.5rem;
		min-width: 180px;
	}

	.status-pill {
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 0.3rem 0.75rem;
		border-radius: var(--radius-pill);
		border: 1px solid transparent;
	}

	.status-pill.due {
		background: rgba(249, 115, 22, 0.12);
		color: #c2410c;
		border-color: rgba(249, 115, 22, 0.22);
	}

	.status-pill.partial {
		background: rgba(59, 130, 246, 0.12);
		color: var(--color-accent-blue);
		border-color: rgba(59, 130, 246, 0.22);
	}

	.status-pill.settled {
		background: rgba(16, 185, 129, 0.12);
		color: #047857;
		border-color: rgba(16, 185, 129, 0.22);
	}

	.status-pill.credit {
		background: rgba(16, 185, 129, 0.12);
		color: #047857;
		border-color: rgba(16, 185, 129, 0.22);
	}

	.balance {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.15rem;
		text-align: right;
	}

	.balance-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		letter-spacing: 0.08em;
	}

	.balance-amount {
		font-size: 1.6rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.balance-meta {
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}

	.details-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1rem;
		padding: 1rem;
		border-radius: var(--radius-md);
		background: var(--color-bg-secondary);
	}

	.details-block {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.details-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-secondary);
	}

	.details-value {
		font-size: 0.95rem;
		color: var(--color-text-primary);
		word-break: break-word;
	}

	.items-card {
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.items-table {
		width: 100%;
		border-collapse: collapse;
		background: var(--color-bg-primary);
	}

	.items-table th {
		text-align: left;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.75rem;
		color: var(--color-text-secondary);
		background: var(--color-bg-secondary);
	}

	.items-table td {
		padding: 0.75rem;
		font-size: 0.92rem;
		color: var(--color-text-primary);
	}

	.items-table tbody tr:nth-child(odd):not(.empty-row) {
		background: rgba(148, 163, 184, 0.08);
	}

	.empty-row td {
		text-align: center;
		font-style: italic;
		color: var(--color-text-secondary);
	}

	.summary {
		display: flex;
		justify-content: stretch;
	}

	.summary-table {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 1rem;
		border-radius: var(--radius-md);
		background: var(--color-bg-secondary);
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.95rem;
		color: var(--color-text-primary);
	}

	.summary-row span:first-child {
		color: var(--color-text-secondary);
	}

	.summary-row.emphasize {
		font-weight: 600;
	}

	.summary-row.emphasize span:first-child {
		color: var(--color-text-primary);
	}

	.terms {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1rem;
	}

	.terms-block {
		padding: 1rem;
		border-radius: var(--radius-md);
		background: var(--color-bg-secondary);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.terms-block p {
		margin: 0;
		font-size: 0.95rem;
		color: var(--color-text-primary);
		white-space: pre-wrap;
		min-height: 1.2rem;
	}

	@media (max-width: 640px) {
		.invoice-preview {
			padding: 1.25rem;
		}

		.status-stack {
			align-items: flex-start;
			min-width: unset;
			width: 100%;
		}

		.status-stack .balance {
			align-items: flex-start;
			text-align: left;
		}

		.summary {
			justify-content: stretch;
		}
	}
</style>
