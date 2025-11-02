<script>
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
				return 'CREDIT';
			case 'settled':
				return 'PAID';
			case 'partial':
				return 'PARTIAL';
			default:
				return 'DUE';
		}
	};
</script>

<div class="invoice-preview minimal-template">
	<header class="minimal-header">
		<div class="header-row">
			<div class="logo-section" class:has-logo={invoice.logo}>
				{#if invoice.logo}
					{#if typeof invoice.logo === 'string'}
						<img src={invoice.logo} alt="Logo" />
					{:else}
						<img src={URL.createObjectURL(invoice.logo)} alt="Logo" />
					{/if}
				{/if}
			</div>
			<div class="title-section">
				<h1 class="invoice-title">{invoice.invoiceLabel || 'INVOICE'}</h1>
				<div class="invoice-meta">
					<span class="invoice-number">#{invoice.invoiceNumber || 'PENDING'}</span>
					<span class="status {balanceState()}">{statusLabel()}</span>
				</div>
			</div>
		</div>
	</header>

	<section class="parties-section">
		<div class="party-block">
			<h2>From</h2>
			<div class="party-info">
				{#if invoice.invoiceFrom}
					<pre>{invoice.invoiceFrom}</pre>
				{:else}
					<span class="placeholder">Your company details</span>
				{/if}
			</div>
		</div>
		<div class="party-block">
			<h2>To</h2>
			<div class="party-info">
				{#if invoice.invoiceTo}
					<pre>{invoice.invoiceTo}</pre>
				{:else}
					<span class="placeholder">Client details</span>
				{/if}
			</div>
		</div>
	</section>

	<section class="dates-section">
		<div class="date-item">
			<span class="date-label">Date</span>
			<span class="date-value">{invoice.date || '—'}</span>
		</div>
		<div class="date-item">
			<span class="date-label">Due</span>
			<span class="date-value">{invoice.dueDate || '—'}</span>
		</div>
		{#if invoice.terms}
			<div class="date-item">
				<span class="date-label">Terms</span>
				<span class="date-value">{invoice.terms}</span>
			</div>
		{/if}
	</section>

	<section class="items-section">
		{#if invoice.items?.length}
			<div class="items-list">
				{#each invoice.items as item, index (index)}
					<div class="item-row">
						<div class="item-details">
							<span class="item-name">{item.name || `Item ${index + 1}`}</span>
							<span class="item-quantity">× {item.quantity ?? 0}</span>
						</div>
						<span class="item-amount"
							>{$toUSCurrency(item.amount || (item.price || 0) * (item.quantity || 0))}</span
						>
					</div>
				{/each}
			</div>
		{:else}
			<div class="empty-items">
				<span>No items added</span>
			</div>
		{/if}
	</section>

	<section class="summary-section">
		<div class="summary-row">
			<span>Subtotal</span>
			<span>{$toUSCurrency(subTotal())}</span>
		</div>
		{#if discountDisplayValue() > 0}
			<div class="summary-row">
				<span>Discount</span>
				<span>-{$toUSCurrency(discountDisplayValue())}</span>
			</div>
		{/if}
		{#if taxDisplayValue() > 0}
			<div class="summary-row">
				<span>Tax</span>
				<span>+{$toUSCurrency(taxDisplayValue())}</span>
			</div>
		{/if}
		{#if shippingDisplayValue() > 0}
			<div class="summary-row">
				<span>Shipping</span>
				<span>+{$toUSCurrency(shippingDisplayValue())}</span>
			</div>
		{/if}
		<div class="summary-row total">
			<span>Total</span>
			<span>{$toUSCurrency(totalAmount())}</span>
		</div>
		{#if amountPaid() > 0}
			<div class="summary-row">
				<span>Paid</span>
				<span>{$toUSCurrency(amountPaid())}</span>
			</div>
		{/if}
		<div class="summary-row balance">
			<span>{balanceDue() < 0 ? 'Credit' : 'Balance'}</span>
			<span>{$toUSCurrency(Math.abs(balanceDue()))}</span>
		</div>
	</section>

	{#if invoice.notes}
		<section class="notes-section">
			<div class="notes-content">
				{invoice.notes}
			</div>
		</section>
	{/if}
</div>

<style>
	.invoice-preview {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		padding: 2rem;
		background: white;
		color: #333;
		font-family:
			'Inter',
			-apple-system,
			BlinkMacSystemFont,
			sans-serif;
		max-width: 800px;
		margin: 0 auto;
		line-height: 1.5;
	}

	.minimal-header {
		border-bottom: 1px solid #e5e5e5;
		padding-bottom: 1.5rem;
	}

	.header-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 2rem;
	}

	.logo-section {
		flex: 0 0 auto;
		max-width: 120px;
	}

	.logo-section img {
		max-width: 100%;
		height: auto;
		object-fit: contain;
	}

	.logo-section:not(.has-logo) {
		display: none;
	}

	.title-section {
		text-align: right;
	}

	.invoice-title {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
		letter-spacing: 0.05em;
	}

	.invoice-meta {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 1rem;
		font-size: 0.9rem;
	}

	.invoice-number {
		color: #666;
	}

	.status {
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.8rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.status.due {
		background: #fef2f2;
		color: #dc2626;
	}

	.status.partial {
		background: #eff6ff;
		color: #2563eb;
	}

	.status.settled,
	.status.credit {
		background: #f0fdf4;
		color: #16a34a;
	}

	.parties-section {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
	}

	.party-block h2 {
		font-size: 0.875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.5rem 0;
		color: #666;
	}

	.party-info {
		font-size: 0.95rem;
	}

	.party-info pre {
		font-family: inherit;
		margin: 0;
		white-space: pre-wrap;
	}

	.placeholder {
		color: #999;
		font-style: italic;
	}

	.dates-section {
		display: flex;
		gap: 2rem;
		padding: 1rem 0;
		border-bottom: 1px solid #e5e5e5;
	}

	.date-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.date-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #666;
	}

	.date-value {
		font-size: 0.95rem;
		font-weight: 500;
	}

	.items-section {
		padding: 1rem 0;
	}

	.items-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.item-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		padding: 0.5rem 0;
		border-bottom: 1px solid #f5f5f5;
	}

	.item-details {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.item-name {
		font-weight: 500;
	}

	.item-quantity {
		font-size: 0.875rem;
		color: #666;
	}

	.item-amount {
		font-weight: 500;
		text-align: right;
	}

	.empty-items {
		text-align: center;
		padding: 2rem;
		color: #999;
		font-style: italic;
	}

	.summary-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem 0;
		border-top: 1px solid #e5e5e5;
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.95rem;
	}

	.summary-row.total {
		font-weight: 600;
		font-size: 1.1rem;
		padding-top: 0.5rem;
		border-top: 1px solid #e5e5e5;
	}

	.summary-row.balance {
		font-weight: 600;
		font-size: 1.1rem;
	}

	.notes-section {
		padding: 1rem 0;
		border-top: 1px solid #e5e5e5;
	}

	.notes-content {
		font-size: 0.9rem;
		color: #666;
		white-space: pre-wrap;
		line-height: 1.6;
	}

	/* Print-specific styles */
	@media print {
		.invoice-preview {
			background: white !important;
			color: black !important;
		}

		.status {
			background: #f0f0f0 !important;
			color: black !important;
		}

		.item-row {
			border-bottom: 1px solid #e5e5e5 !important;
		}
	}

	@media (max-width: 768px) {
		.invoice-preview {
			padding: 1.5rem;
			gap: 1.5rem;
		}

		.header-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.title-section {
			text-align: left;
		}

		.invoice-meta {
			justify-content: flex-start;
		}

		.parties-section {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}

		.dates-section {
			flex-wrap: wrap;
			gap: 1rem;
		}

		.date-item {
			flex: 1;
			min-width: 120px;
		}
	}
</style>
