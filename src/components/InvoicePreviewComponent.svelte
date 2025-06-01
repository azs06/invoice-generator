<script>
	import { defaultInvoice } from '$lib/index.js';
	import { toUSCurrency } from '$lib/currency.js';
	import { calculateDiscount, calculateTax } from '../lib/InvoiceCalculator.js';

	let { invoice = defaultInvoice } = $props();

	// These are derived from the parent's comprehensive calculations
	const totalAmount = $derived(invoice.total || 0);
	const subTotal = $derived(invoice.subTotal || 0);
	const balanceDue = $derived(invoice.balanceDue || 0);

	// Derived values for individual display lines in the summary
	const discountDisplayValue = $derived(calculateDiscount(invoice.discount, subTotal));
	const taxDisplayValue = $derived(() => {
		const amountAfterDiscount = subTotal - discountDisplayValue;
		return calculateTax(invoice.tax, amountAfterDiscount);
	});
	const shippingDisplayValue = $derived(invoice.shipping?.amount || 0);
</script>

<div class="invoice-preview">
	<div class="header-section">
		{#if invoice.logo}
			<div class="logo">
				{#if typeof invoice.logo === 'string'}
					<img src={invoice.logo} alt="Logo" />
				{:else}
					<img src={URL.createObjectURL(invoice.logo)} alt="Logo" />
				{/if}
			</div>
		{/if}

		<div class="invoice-meta-header">
			{#if invoice.invoiceNumber}
				<div class="invoice-number"><strong>Invoice #:</strong> {invoice.invoiceNumber}</div>
			{/if}
			{#if invoice.paid !== undefined}
				<div class="paid-badge {invoice.paid ? 'paid' : 'unpaid'}">
					<span>{invoice.paid ? 'PAID' : 'UNPAID'}</span>
				</div>
			{/if}
		</div>
	</div>

	<div class="addresses">
		<div><strong>From:</strong> {invoice.invoiceFrom}</div>
		<div><strong>To:</strong> {invoice.invoiceTo}</div>
	</div>

	<div class="dates">
		<div><strong>Invoice Date:</strong> {invoice.date}</div>
		<div><strong>Due Date:</strong> {invoice.dueDate}</div>
	</div>

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
			{#each invoice.items as item}
				<tr>
					<td>{item.name}</td>
					<td>{item.quantity}</td>
					<td>{toUSCurrency(item.price)}</td>
					<td>{toUSCurrency(item.amount || item.price * item.quantity)}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<div class="summary">
		<div class="summary-item">
			<span class="summary-item-label">Subtotal:</span>
			<span class="summary-item-value">{toUSCurrency(subTotal)}</span>
		</div>
		<div class="summary-item">
			<span class="summary-item-label">Discount:</span>
			<span class="summary-item-value">-{toUSCurrency(discountDisplayValue)}</span>
		</div>
		<div class="summary-item">
			<span class="summary-item-label">Tax:</span>
			<span class="summary-item-value">+{toUSCurrency(taxDisplayValue())}</span>
		</div>
		<div class="summary-item">
			<span class="summary-item-label">Shipping:</span>
			<span class="summary-item-value">+{toUSCurrency(shippingDisplayValue)}</span>
		</div>
		<div class="summary-item total-line">
			<span class="summary-item-label">Total:</span>
			<span class="summary-item-value">{toUSCurrency(totalAmount)}</span>
		</div>
		<div class="summary-item">
			<span class="summary-item-label">Amount Paid:</span>
			<span class="summary-item-value">{toUSCurrency(invoice.amountPaid || 0)}</span>
		</div>
		<div class="summary-item balance-due-line">
			<span class="summary-item-label">Due:</span>
			<span class="summary-item-value">{toUSCurrency(balanceDue)}</span>
		</div>
	</div>
	<div class="terms">
		<div><strong>Terms:</strong> {invoice.terms}</div>
		<div><strong>Notes:</strong> {invoice.notes}</div>
	</div>
</div>

<style>
	.invoice-preview {
		padding: 2rem;
		background: #ffffff;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
			Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
	}
	.logo {
		text-align: center;
		margin: 0 auto;
		margin-bottom: 1.5rem; /* Increased margin for better separation */
		max-width: 100%;
	}


	.logo img {
		max-width: 150px; /* or 250px depending on your design */
		width: auto;
		height: auto;
		object-fit: contain; /* optional: forces better scaling inside the box */
	}
	@media (max-width: 640px) {
		.logo img {
			max-width: 150px;
		}
	}
	.invoice-meta-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.addresses,
	.dates {
		margin-bottom: 1rem;
		display: flex;
		justify-content: space-between;
	}
	.items-table {
		width: 100%;
		border-collapse: collapse;
		margin-top: 1.5rem;
	}
	.items-table th,
	.items-table td {
		border: 1px solid #d1d5db;
		padding: 0.75rem;
		text-align: left;
	}
	.items-table th {
		background-color: #f3f4f6;
	}
	.summary {
		margin-top: 2rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem; /* Increased gap for readability */
		margin-bottom: 2rem;
		align-items: flex-end;
	}
	.summary-item {
		display: grid;
		grid-template-columns: auto auto; /* Label and Value */
		justify-content: end;
		gap: 1.5em; /* Space between label and value */
		width: auto;
		min-width: 280px; /* Adjust as needed for content */
		font-size: 0.9rem;
	}
	.summary-item-label {
		text-align: right;
		color: #4b5563; /* Slightly muted label color */
	}
	.summary-item-value {
		text-align: right;
		font-weight: 500;
		color: #1f2937;
	}
	.summary-item-value.negative {
		color: #ef4444; /* Red for negative values like discounts */
	}
	.summary-item-value.positive {
		color: #10b981; /* Green for positive values like tax/shipping */
	}
	.total-line .summary-item-label,
	.total-line .summary-item-value {
		font-weight: bold;
		font-size: 1.1em;
		color: #111827;
	}
	.balance-due-line .summary-item-label,
	.balance-due-line .summary-item-value {
		font-weight: bold;
		font-size: 1.05em;
	}

	.terms {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-top: 2rem;
	}
	.paid-badge {
		display: inline-block;
		font-weight: bold;
		font-size: 1rem;
	}
	.paid {
		color: #10b981; /* green for paid */
	}
	.unpaid {
		color: #f97316; /* orange for unpaid */
	}
</style>
