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
		if (onUpdateDiscount && discount) onUpdateDiscount(discount);
		if (onUpdateTax && tax) onUpdateTax(tax);
		if (onUpdateShipping && shipping) onUpdateShipping(shipping);
	});
</script>

<div class="total-summary">
	<div class="summary-header">
		<h3>Invoice Summary</h3>
		<p>Adjust totals without leaving the form.</p>
	</div>

	<div class="controls">
		<div class="control">
			<div class="control-header">
				<label class="control-label" for="discount-rate">Discount</label>
				<div class="type-choice" role="radiogroup" aria-label="Discount type">
					<label class:selected={discount.type === 'flat'}>
						<input type="radio" value="flat" aria-label="Flat discount" bind:group={discount.type} />
						<span>Flat</span>
					</label>
					<label class:selected={discount.type === 'percent'}>
						<input
							type="radio"
							value="percent"
							aria-label="Percent discount"
							bind:group={discount.type}
						/>
						<span>%</span>
					</label>
				</div>
			</div>
			<input
				id="discount-rate"
				type="number"
				bind:value={discount.rate}
				min="0"
				step="0.01"
				placeholder="0.00"
				class="number-input"
			/>
		</div>

		<div class="control">
			<div class="control-header">
				<label class="control-label" for="tax-rate">Tax</label>
				<div class="type-choice" role="radiogroup" aria-label="Tax type">
					<label class:selected={tax.type === 'flat'}>
						<input type="radio" value="flat" aria-label="Flat tax" bind:group={tax.type} />
						<span>Flat</span>
					</label>
					<label class:selected={tax.type === 'percent'}>
						<input type="radio" value="percent" aria-label="Percent tax" bind:group={tax.type} />
						<span>%</span>
					</label>
				</div>
			</div>
			<input
				id="tax-rate"
				type="number"
				bind:value={tax.rate}
				min="0"
				step="0.01"
				placeholder="0.00"
				class="number-input"
			/>
		</div>

		<div class="control">
			<label class="control-label" for="shipping-amount">Shipping</label>
			<input
				id="shipping-amount"
				type="number"
				bind:value={shipping.amount}
				min="0"
				step="0.01"
				placeholder="0.00"
				class="number-input shipping-input"
			/>
		</div>
	</div>

	<div class="summary">
		<div class="summary-line">
			<span>Subtotal</span>
			<span>{toUSCurrency(subTotal())}</span>
		</div>
		<div class="summary-line">
			<span>Discount</span>
			<span class="negative">-{toUSCurrency(discountAmount())}</span>
		</div>
		<div class="summary-line">
			<span>Tax</span>
			<span class="positive">+{toUSCurrency(taxAmount())}</span>
		</div>
		<div class="summary-line">
			<span>Shipping</span>
			<span class="positive">+{toUSCurrency(invoice.shipping?.amount || 0)}</span>
		</div>
	</div>

	<div class="summary-callout">
		<div class="summary-total">
			<span>Total</span>
			<strong>{toUSCurrency(totalAmount())}</strong>
		</div>
		<div class="summary-due">
			<span>Balance Due</span>
			<strong>{toUSCurrency(invoice.balanceDue)}</strong>
		</div>
	</div>
</div>

<style>
	.total-summary {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		padding: 1.05rem;
		background: var(--color-bg-secondary);
	}

	.summary-header {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.summary-header h3 {
		margin: 0;
		font-size: 1.2rem;
		color: var(--color-text-primary);
	}

	.summary-header p {
		margin: 0;
		font-size: 0.9rem;
		color: var(--color-text-secondary);
	}

	.controls {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.7rem;
	}

	.control {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		border-radius: var(--radius-md);
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
	}

	.control-label {
		font-size: 0.82rem;
		color: var(--color-text-secondary);
		font-weight: 600;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	.control-header {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.35rem;
	}

	.type-choice {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		flex-wrap: wrap;
	}

	.type-choice label {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.24rem 0.58rem;
		position: relative;
		border-radius: var(--radius-pill);
		border: 1px solid var(--color-border-secondary);
		background: var(--color-bg-secondary);
		color: var(--color-text-secondary);
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
	}

	.type-choice label.selected {
		border-color: var(--color-accent-blue);
		background: rgba(59, 130, 246, 0.16);
		color: var(--color-accent-blue);
		box-shadow: var(--shadow-soft);
	}

	.type-choice input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
		pointer-events: none;
	}

	.number-input {
		padding: 0.6rem;
		font-size: 0.95rem;
		border: 1px solid var(--color-border-secondary);
		border-radius: var(--radius-sm);
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.number-input:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}

	.summary {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 0.85rem;
		border-radius: var(--radius-md);
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
	}

	.summary-line {
		display: flex;
		justify-content: space-between;
		font-size: 0.95rem;
		color: var(--color-text-secondary);
	}

	.summary-line .negative {
		color: #dc2626;
	}

	.summary-line .positive {
		color: #047857;
	}

	.summary-callout {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 0.85rem;
		padding: 0.85rem;
		border-radius: var(--radius-md);
		border: 1px solid rgba(59, 130, 246, 0.24);
		background: rgba(59, 130, 246, 0.1);
	}

	.summary-total,
	.summary-due {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.summary-total span,
	.summary-due span {
		font-size: 0.85rem;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		font-weight: 600;
	}

	.summary-total strong,
	.summary-due strong {
		font-size: 1.25rem;
		color: var(--color-text-primary);
	}

	.summary-due strong {
		color: #b91c1c;
	}

	@media (max-width: 640px) {
		.total-summary {
			padding: 0.9rem;
		}

		.control {
			padding: 0.6rem;
		}

		.summary-callout {
			grid-template-columns: 1fr;
		}
	}
</style>
