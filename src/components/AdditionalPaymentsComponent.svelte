<script>
	let { additionalPayments, onUpdate } = $props();

	const addPayment = () => {
		additionalPayments = [...additionalPayments, { date: '', amount: 0, method: '' }];
		onUpdate(additionalPayments);
	};

	const updatePayment = (index, field, value) => {
		const updated = [...additionalPayments];
		updated[index][field] = value;
		onUpdate(updated);
	};

	const removePayment = (index) => {
		const updated = additionalPayments.filter((_, i) => i !== index);
		onUpdate(updated);
	};
</script>

<div class="additional-payments">
	<h3>Additional Payments</h3>

	{#each additionalPayments as payment, index}
		<div class="payment-entry">
			<input
				type="date"
				bind:value={payment.date}
				oninput={(e) => updatePayment(index, 'date', e.target.value)}
			/>
			<input
				type="number"
				min="0"
				placeholder="Amount"
				bind:value={payment.amount}
				oninput={(e) => updatePayment(index, 'amount', +e.target.value)}
			/>
			<input
				type="text"
				placeholder="Payment Method"
				bind:value={payment.method}
				oninput={(e) => updatePayment(index, 'method', e.target.value)}
			/>
			<button type="button" onclick={() => removePayment(index)} class="remove-btn">Remove</button>
		</div>
	{/each}

	<button type="button" class="add-btn" onclick={addPayment}> Add Payment </button>
</div>

<style>
	.additional-payments {
		margin-top: 2rem;
		padding: 1rem;
		background-color: #f3f4f6;
		border-radius: 0.5rem;
	}
	.payment-entry {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}
	.payment-entry input {
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		flex: 1 1 30%;
		font-size: 1rem;
	}
	.remove-btn {
		background-color: #ef4444;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		cursor: pointer;
		font-size: 0.875rem;
	}
	.remove-btn:hover {
		background-color: #dc2626;
	}
	.add-btn {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		background-color: #10b981;
		color: white;
		border: none;
		border-radius: 0.375rem;
		font-size: 1rem;
		cursor: pointer;
	}
	.add-btn:hover {
		background-color: #059669;
	}
</style>
