<script>
	export let invoice = {
		logo: null,
		invoiceFrom: '',
		invoiceTo: '',
		date: '',
		dueDate: '',
		items: [],
		amountPaid: 0,
		terms: '',
		notes: '',
		discount: { type: 'flat', rate: 0 },
		tax: { type: 'flat', rate: 0 },
		shipping: { amount: 0 },
		invoiceNumber: '',
		paid: false
	};

	const formatCurrency = (value) => {
		return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value);
	};
</script>

<div class="invoice-preview">
	{#if invoice.logo}
		<div class="logo">
			{#if typeof invoice.logo === 'string'}
				<img src={invoice.logo} alt="Logo" />
			{:else}
				<img src={URL.createObjectURL(invoice.logo)} alt="Logo" />
			{/if}
		</div>
	{/if}

	<div>
		{#if invoice.invoiceNumber}
			<div class="invoice-number">
				<strong>Invoice #:</strong>
				{invoice.invoiceNumber}
			</div>
		{/if}
	</div>
	{#if invoice.paid !== undefined}
		<div class="paid-badge {invoice.paid ? 'paid' : 'unpaid'}">
			{invoice.paid ? 'PAID' : 'UNPAID'}
		</div>
	{/if}

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
					<td>{formatCurrency(item.price)}</td>
					<td>{formatCurrency(item.amount || item.price * item.quantity)}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<div class="summary">
		<div><strong>Amount Paid:</strong> {formatCurrency(invoice.amountPaid)}</div>
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
	}
	.logo {
		text-align: center;
		margin: 0 auto;
		margin-bottom: 2rem;
		max-width: 100%;
	}

	.logo img {
		max-width: 200px; /* or 250px depending on your design */
		width: auto;
		height: auto;
		object-fit: contain; /* optional: forces better scaling inside the box */
	}
	@media (max-width: 640px) {
		.logo img {
			max-width: 150px;
		}
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
		gap: 0.75rem;
	}
	.invoice-number {
		text-align: right;
		font-weight: bold;
		font-size: 1.2rem;
		margin-bottom: 1rem;
	}
	.paid-badge {
		display: inline-block;
		padding: 0.4rem 1rem;
		border-radius: 9999px;
		font-weight: bold;
		font-size: 1rem;
		margin-bottom: 1rem;
	}
	.paid {
		background-color: #10b981; /* green for paid */
		color: white;
	}
	.unpaid {
		background-color: #f97316; /* orange for unpaid */
		color: white;
	}
</style>
