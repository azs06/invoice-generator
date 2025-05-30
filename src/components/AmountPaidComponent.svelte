<script>
	let { amountPaid, updatePaidAmount } = $props();
	import { toUSCurrency } from '$lib/currency.js';

	const handleOnChange = (event) => {
		amountPaid = parseFloat(event.target.value);
		updatePaidAmount(amountPaid);
	};
</script>

<div class="amount-paid">
	<h3>Amount Paid</h3>

	<!-- editable field -->
	<input
		type="number"
		bind:value={amountPaid}
		min="0"
		step="1"
		class="amount-input"
		oninput={handleOnChange}
	/>

	<!-- optional: live formatted display -->
	<p class="formatted">You’ve entered: {toUSCurrency(amountPaid)}</p>
</div>

<style>
	.amount-paid {
		margin-top: 1rem;
		padding: 1rem;
		background-color: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
	}
	.amount-paid h3 {
		margin-bottom: 0.5rem;
		font-size: 1.25rem;
	}

	.amount-input {
		width: 100%;
		padding: 0.5rem;
		font-size: 1rem;
		color: #4b5563;
		border: 1px solid #e5e7eb;
		border-radius: 0.25rem;
		margin-bottom: 0.75rem;
	}

	.formatted {
		font-size: 0.875rem;
		color: #6b7280;
	}
</style>
