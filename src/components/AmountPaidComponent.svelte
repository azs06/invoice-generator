<script>
	import { _ } from 'svelte-i18n';
	import { toUSCurrency } from '$lib/currency.js';

	/** @type {number} */
	export let amountPaid = 0;
	/** @type {(value: number) => void} */
	export let updatePaidAmount = () => {};
	/** @type {{ balanceDue?: number } | null | undefined } */
	export let invoice = null;

	/**
	 * @param {Event} event
	 */
	const handleOnChange = (event) => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		amountPaid = parseFloat(target.value) || 0;
		updatePaidAmount(amountPaid);
	};
</script>

<div class="amount-paid-summary">
	<div class="summary-row">
		<span class="summary-label">{$_('summary.amount_paid')}:</span>
		<div class="input-with-value">
			<input
				id="amount-paid-input"
				type="number"
				bind:value={amountPaid}
				min="0"
				step="1"
				placeholder="0"
				class="summary-input"
				oninput={handleOnChange}
			/>
			<span class="summary-value">{$toUSCurrency(amountPaid || 0)}</span>
		</div>
	</div>

	<div class="summary-row due-row">
		<span class="summary-label">{$_('summary.balance_due')}:</span>
		<span class="summary-value">{$toUSCurrency(Math.abs(invoice?.balanceDue || 0))}</span>
	</div>
</div>

<style>
	.amount-paid-summary {
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

	.summary-label {
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.summary-value {
		color: var(--color-text-primary);
		font-weight: 600;
		white-space: nowrap;
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

	.due-row {
		padding-top: 0.75rem;
		margin-top: 0.5rem;
		border-top: 1px solid var(--color-border-primary);
		font-size: 1.05rem;
	}

	.due-row .summary-label,
	.due-row .summary-value {
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
