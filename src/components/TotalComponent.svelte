<script>
	import { totalAmounts, calculateDiscount, calculateTax } from '../lib/InvoiceCalculator.js';
	import { toUSCurrency } from '$lib/currency.js';
	import { defaultInvoice } from '$lib/index.js';

	const { invoice = defaultInvoice, onUpdateDiscount, onUpdateTax, onUpdateShipping } = $props();

	// Initialize local state for tax, discount, shipping
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

	// Whenever local discount/tax/shipping changes, fire the relevant callback
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
		<!-- DISCOUNT CONTROL -->
		<div class="control">
			<label class="control-label" for="discount-rate-input">Discount</label>
			<div class="type-toggle">
				<button
					type="button"
					class:selected={discount.type === 'flat'}
					onclick={() => (discount.type = 'flat')}
				>
					Flat
				</button>
				<button
					type="button"
					class:selected={discount.type === 'percent'}
					onclick={() => (discount.type = 'percent')}
				>
					%
				</button>
			</div>
			<input
				id="discount-rate-input"
				type="number"
				bind:value={discount.rate}
				min="0"
				step="0.01"
				placeholder="0.00"
				class="number-input"
			/>
		</div>

		<!-- TAX CONTROL -->
		<div class="control">
			<label class="control-label" for="tax-rate-input">Tax</label>
			<div class="type-toggle">
				<button
					type="button"
					class:selected={tax.type === 'flat'}
					onclick={() => (tax.type = 'flat')}
				>
					Flat
				</button>
				<button
					type="button"
					class:selected={tax.type === 'percent'}
					onclick={() => (tax.type = 'percent')}
				>
					%
				</button>
			</div>
			<input
				id="tax-rate-input"
				type="number"
				bind:value={tax.rate}
				min="0"
				step="0.01"
				placeholder="0.00"
				class="number-input"
			/>
		</div>

		<!-- SHIPPING CONTROL -->
		<div class="control">
			<label class="control-label" for="shipping-amount-input">Shipping</label>
			<input
				id="shipping-amount-input"
				type="number"
				bind:value={shipping.amount}
				min="0"
				step="0.01"
				placeholder="0.00"
				class="number-input shipping-input"
			/>
		</div>
	</div>

	<!-- SUMMARY LINES -->
	<div class="summary-line">
		<span>Subtotal:</span>
		<span>${subTotal().toFixed(2)}</span>
	</div>
	<div class="summary-line">
		<span>Discount:</span>
		<span class="negative">-${discountAmount().toFixed(2)}</span>
	</div>
	<div class="summary-line">
		<span>Tax:</span>
		<span class="positive">+${taxAmount().toFixed(2)}</span>
	</div>
	<div class="summary-line">
		<span>Shipping:</span>
		<span class="positive">
			+${invoice.shipping?.amount?.toFixed(2) ?? '0.00'}
		</span>
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
		color: #111827;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.control {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 220px;
	}
	.control-label {
		font-size: 0.875rem;
		color: #374151;
		font-weight: 500;
	}

	/* ------- TYPE TOGGLE STYLES ------- */
	.type-toggle {
		display: flex;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		overflow: hidden;
		width: max-content;
	}
	.type-toggle button {
		flex: 1;
		padding: 0.5rem 0.75rem;
		background-color: #ffffff;
		border: none;
		font-size: 0.875rem;
		color: #374151;
		cursor: pointer;
		transition: background-color 0.1s ease-in-out, color 0.1s;
	}
	.type-toggle button:hover {
		background-color: #f3f4f6;
	}
	.type-toggle button.selected {
		background-color: #3b82f6;
		color: #ffffff;
	}

	/* ------- NUMBER INPUT STYLES ------- */
	.number-input {
		padding: 0.5rem;
		font-size: 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
		color: #111827;
	}
	.number-input:focus {
		border-color: #3b82f6;
		outline: none;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
	}

	/* Add a bit of spacing if you want the shipping input to be slightly narrower */
	.shipping-input {
		width: 100%;
	}

	/* ------- SUMMARY LINES ------- */
	.summary-line {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.5rem;
		font-size: 1rem;
		color: #374151;
	}
	.summary-line .negative {
		color: #dc2626;
	}
	.summary-line .positive {
		color: #047857;
	}

	.summary-total {
		display: flex;
		justify-content: space-between;
		font-size: 1.25rem;
		margin-top: 1.25rem;
		font-weight: bold;
		color: #111827;
	}
	.summary-total-due {
		display: flex;
		justify-content: space-between;
		font-size: 1rem;
		margin-top: 0.75rem;
		color: #b91c1c;
	}
</style>
