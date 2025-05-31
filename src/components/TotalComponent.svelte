<script>
	import { totalAmounts, calculateDiscount, calculateTax } from '../lib/InvoiceCalculator.js';
	import { toUSCurrency } from '$lib/currency.js';
	import { defaultInvoice } from '$lib/index.js';

	const { invoice = defaultInvoice, onUpdateDiscount, onUpdateTax, onUpdateShipping } = $props();

	let tax = $state(invoice.tax || { type: 'flat', rate: 0 });
	let discount = $state(invoice.discount || { type: 'flat', rate: 0 });
	let shipping = $state(invoice.shipping || { amount: 0 });

	const subTotal = () => invoice.subTotal || 0;
	const discountAmount = () => calculateDiscount(invoice.discount, subTotal());

	const taxAmount = () => {
		const afterDiscount = subTotal() - discountAmount();
		return calculateTax(invoice.tax, afterDiscount);
	};

	const totalAmount = () => totalAmounts(invoice, subTotal());

	$effect(() => {
		if (onUpdateDiscount && discount) {
			onUpdateDiscount(discount);
		}
		if (onUpdateTax && tax) {
			onUpdateTax(tax);
		}
		if (onUpdateShipping && shipping) {
			onUpdateShipping(shipping);
		}
	});
</script>

<div class="total-summary">
	<h3>Invoice Summary</h3>

	<!-- Editable controls -->
	<div class="controls invoice-summary-controls">
		<div class="control">
			<label>
				Discount:
				<select bind:value={discount.type}>
					<option value="flat">Flat</option>
					<option value="percent">%</option>
				</select>
				<input type="number" bind:value={discount.rate} min="0" step="1" />
			</label>
		</div>
		<div class="control">
			<label>
				Tax:
				<select bind:value={tax.type}>
					<option value="flat">Flat</option>
					<option value="percent">%</option>
				</select>
				<input type="number" bind:value={tax.rate} min="0" step="1" />
			</label>
		</div>
		<div class="control">
			<label>
				Shipping:
				<input type="number" bind:value={shipping.amount} min="0" step="1" />
			</label>
		</div>
	</div>

	<div class="summary-line">
		<span>Subtotal:</span>
		<span>${subTotal().toFixed(2)}</span>
	</div>
	<div class="summary-line">
		<span>Discount:</span>
		<span>-${discountAmount().toFixed(2)}</span>
	</div>
	<div class="summary-line">
		<span>Tax:</span>
		<span>+${taxAmount().toFixed(2)}</span>
	</div>
	<div class="summary-line">
		<span>Shipping:</span>
		<span>+${invoice.shipping?.amount?.toFixed(2) ?? '0.00'}</span>
	</div>
	<div class="summary-total">
		<strong>Total:</strong>
		<strong>{toUSCurrency(totalAmount().toFixed(2))}</strong>
	</div>
	<div class="summary-total-due">
		<strong>Balance Due:</strong>
		<strong>{toUSCurrency(invoice.balanceDue)}</strong>
	</div>
</div>

<style>
	.total-summary {
		margin-top: 2rem;
		padding: 1.5rem;
		background-color: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
	}
	.total-summary h3 {
		margin-bottom: 1rem;
		font-size: 1.25rem;
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.control {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.control label {
		font-size: 0.875rem;
		color: #374151;
	}
	.control input,
	.control select {
		padding: 0.5rem;
		font-size: 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.25rem;
	}
	.summary-line {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.5rem;
		font-size: 1rem;
	}
	.summary-total {
		display: flex;
		justify-content: space-between;
		font-size: 1.25rem;
		margin-top: 1rem;
		font-weight: bold;
	}
	.summary-total-due {
		display: flex;
		justify-content: space-between;
		font-size: 1rem;
		margin-top: 0.5rem;
		color: #dc2626;
	}
	.invoice-summary-controls {
		display: flex;
		margin-bottom: 1rem;
		flex-direction: row;
	}
</style>
