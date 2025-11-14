<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { totalAmounts, calculateDiscount, calculateTax } from '../lib/InvoiceCalculator.js';
	import { toUSCurrency, currencySymbol } from '$lib/currency.js';
	import { defaultInvoice } from '$lib/index.js';
	import type { InvoiceData, MonetaryAdjustment, ShippingInfo } from '$lib/types';

	interface Props {
		invoice?: InvoiceData;
		onUpdateDiscount?: (value: MonetaryAdjustment) => void;
		onUpdateTax?: (value: MonetaryAdjustment) => void;
		onUpdateShipping?: (value: ShippingInfo) => void;
	}

	let {
		invoice = defaultInvoice,
		onUpdateDiscount,
		onUpdateTax,
		onUpdateShipping
	}: Props = $props();

	let tax = $state<MonetaryAdjustment>(invoice.tax || { type: 'flat', rate: 0 });
	let discount = $state<MonetaryAdjustment>(invoice.discount || { type: 'flat', rate: 0 });
	let shipping = $state<ShippingInfo>(invoice.shipping || { amount: 0 });

	const subTotal = (): number => invoice.subTotal || 0;
	const discountAmount = (): number => calculateDiscount(invoice.discount, subTotal());
	const taxAmount = (): number => {
		const afterDiscount = subTotal() - discountAmount();
		return calculateTax(invoice.tax, afterDiscount);
	};
	const totalAmount = (): number => totalAmounts(invoice, subTotal());

	$effect(() => {
		if (onUpdateDiscount && discount) onUpdateDiscount(discount);
		if (onUpdateTax && tax) onUpdateTax(tax);
		if (onUpdateShipping && shipping) onUpdateShipping(shipping);
	});
</script>

<div class="total-summary">
	<!-- Summary Display -->
	<div class="summary-row">
		<span class="summary-label">{$_('summary.subtotal')}:</span>
		<span class="summary-value">{$toUSCurrency(subTotal())}</span>
	</div>

	<!-- Discount Control -->
	<div class="summary-row with-control">
		<div class="control-group">
			<span class="summary-label">{$_('summary.discount')}:</span>
			<div class="type-toggle">
				<label class:active={discount.type === 'flat'}>
					<input type="radio" value="flat" bind:group={discount.type} />
					<span>{$currencySymbol}</span>
				</label>
				<label class:active={discount.type === 'percent'}>
					<input type="radio" value="percent" bind:group={discount.type} />
					<span>%</span>
				</label>
			</div>
		</div>
		<div class="input-with-value">
			<input
				type="number"
				bind:value={discount.rate}
				min="0"
				step="0.01"
				placeholder="0"
				class="summary-input"
			/>
			<span class="summary-value">-{$toUSCurrency(discountAmount())}</span>
		</div>
	</div>

	<!-- Tax Control -->
	<div class="summary-row with-control">
		<div class="control-group">
			<span class="summary-label">{$_('summary.tax')}:</span>
			<div class="type-toggle">
				<label class:active={tax.type === 'flat'}>
					<input type="radio" value="flat" bind:group={tax.type} />
					<span>{$currencySymbol}</span>
				</label>
				<label class:active={tax.type === 'percent'}>
					<input type="radio" value="percent" bind:group={tax.type} />
					<span>%</span>
				</label>
			</div>
		</div>
		<div class="input-with-value">
			<input
				type="number"
				bind:value={tax.rate}
				min="0"
				step="0.01"
				placeholder="0"
				class="summary-input"
			/>
			<span class="summary-value">+{$toUSCurrency(taxAmount())}</span>
		</div>
	</div>

	<!-- Shipping Control -->
	<div class="summary-row with-control">
		<span class="summary-label">{$_('summary.shipping')}:</span>
		<div class="input-with-value">
			<input
				type="number"
				bind:value={shipping.amount}
				min="0"
				step="0.01"
				placeholder="0"
				class="summary-input"
			/>
			<span class="summary-value">+{$toUSCurrency(invoice.shipping?.amount || 0)}</span>
		</div>
	</div>

	<!-- Total -->
	<div class="summary-row total-row">
		<span class="summary-label">{$_('summary.total')}:</span>
		<span class="summary-value">{$toUSCurrency(totalAmount())}</span>
	</div>
</div>

<style>
	.total-summary {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.summary-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0;
		font-size: 0.95rem;
		gap: 1rem;
	}

	.summary-row.with-control {
		flex-wrap: wrap;
	}

	.summary-label {
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.summary-value {
		color: var(--color-text-primary);
		font-weight: 600;
		white-space: nowrap;
	}

	.control-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.type-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.15rem;
		border-radius: var(--radius-sm);
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-secondary);
	}

	.type-toggle label {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.5rem;
		padding: 0.2rem 0.4rem;
		border-radius: var(--radius-xs);
		background: transparent;
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.type-toggle label.active {
		background: var(--color-accent-blue);
		color: #fff;
	}

	.type-toggle input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.input-with-value {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		justify-content: flex-end;
	}

	.summary-input {
		width: 80px;
		padding: 0.35rem 0.5rem;
		font-size: 0.875rem;
		border: 1px solid var(--color-border-secondary);
		border-radius: var(--radius-sm);
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
		text-align: right;
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease;
	}

	.summary-input:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}

	.total-row {
		padding-top: 0.75rem;
		margin-top: 0.5rem;
		border-top: 1px solid var(--color-border-primary);
		font-size: 1.05rem;
	}

	.total-row .summary-label,
	.total-row .summary-value {
		font-weight: 700;
		color: var(--color-text-primary);
	}

	@media (max-width: 640px) {
		.summary-row {
			font-size: 0.9rem;
		}

		.summary-input {
			width: 70px;
			font-size: 0.825rem;
		}
	}
</style>
