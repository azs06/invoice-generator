<script>
	let { amountPaid, updatePaidAmount } = $props();

	const handleOnChange = (event) => {
		amountPaid = parseFloat(event.target.value);
		updatePaidAmount(amountPaid);
	};
</script>

<div class="amount-paid">
	<label for="amount-paid-input" class="amount-label">
		<span class="label-title">Amount Paid</span>
		<span class="label-hint">Record any payment already received.</span>
	</label>

	<input
		id="amount-paid-input"
		type="number"
		bind:value={amountPaid}
		min="0"
		step="1"
		class="amount-input"
		oninput={handleOnChange}
	/>
</div>

<style>
	.amount-paid {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		padding: 1.05rem;
		background: var(--color-bg-secondary);
	}

	.amount-label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		color: var(--color-text-primary);
	}

	.label-title {
		font-size: 1.05rem;
		font-weight: 600;
	}

	.label-hint {
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}

	.amount-input {
		width: 100%;
		padding: 0.65rem 0.85rem;
		font-size: 0.95rem;
		color: var(--color-text-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-sm);
		background: var(--color-bg-primary);
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.amount-input:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}
</style>
