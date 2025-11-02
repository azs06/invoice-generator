<script>
	/** @typedef {import('$lib/types').AdditionalPayment} AdditionalPayment */

	/** @type {AdditionalPayment[]} */
	export let additionalPayments = [];
	/** @type {(payments: AdditionalPayment[]) => void} */
	export let onUpdate = () => {};

	const createEmptyPayment = () => ({ date: '', amount: 0, method: '' });

	const addPayment = () => {
		additionalPayments = [...additionalPayments, createEmptyPayment()];
		onUpdate(additionalPayments);
	};

	/**
	 * @param {number} index
	 * @param {'date' | 'amount' | 'method'} field
	 * @param {string | number} value
	 */
	const updatePayment = (index, field, value) => {
		if (index < 0 || index >= additionalPayments.length) {
			return;
		}
		const updated = additionalPayments.map((payment) => ({ ...payment }));
		const target = updated[index];
		if (!target) {
			return;
		}

		if (field === 'amount') {
			target.amount = typeof value === 'number' ? value : Number(value) || 0;
		} else if (field === 'date') {
			target.date = typeof value === 'string' ? value : String(value ?? '');
		} else {
			target.method = typeof value === 'string' ? value : String(value ?? '');
		}

		additionalPayments = updated;
		onUpdate(additionalPayments);
	};

	/**
	 * @param {number} index
	 */
	const removePayment = (index) => {
		const updated = additionalPayments.filter((_, i) => i !== index);
		additionalPayments = updated;
		onUpdate(updated);
	};

	/**
	 * @param {number} index
	 * @param {Event} event
	 */
	const handleDateChange = (index, event) => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		updatePayment(index, 'date', target.value);
	};

	/**
	 * @param {number} index
	 * @param {Event} event
	 */
	const handleAmountChange = (index, event) => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		updatePayment(index, 'amount', Number(target.value));
	};

	/**
	 * @param {number} index
	 * @param {Event} event
	 */
	const handleMethodChange = (index, event) => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		updatePayment(index, 'method', target.value);
	};
</script>

<div class="additional-payments">
	<header class="payments-header">
		<div>
			<span class="eyebrow">Optional</span>
			<h3>Additional Payments</h3>
			<p class="subtitle">Log partial payments you've received so the balance stays accurate.</p>
		</div>
		<button type="button" class="add-btn" onclick={addPayment}>
			<span aria-hidden="true">＋</span>
			Add payment
		</button>
	</header>

	{#if additionalPayments.length === 0}
		<p class="empty-state">No extra payments recorded yet.</p>
	{:else}
		<div class="payments-list">
			{#each additionalPayments as payment, index}
				<div class="payment-entry">
					<div class="field">
						<label for={`payment-date-${index}`}>Date</label>
						<input
							id={`payment-date-${index}`}
							type="date"
							bind:value={payment.date}
							oninput={(event) => handleDateChange(index, event)}
						/>
					</div>
					<div class="field">
						<label for={`payment-amount-${index}`}>Amount</label>
						<input
							id={`payment-amount-${index}`}
							type="number"
							min="0"
							step="0.01"
							placeholder="0.00"
							bind:value={payment.amount}
							oninput={(event) => handleAmountChange(index, event)}
						/>
					</div>
					<div class="field field--wide">
						<label for={`payment-method-${index}`}>Method</label>
						<input
							id={`payment-method-${index}`}
							type="text"
							placeholder="Card, bank transfer, cash..."
							bind:value={payment.method}
							oninput={(event) => handleMethodChange(index, event)}
						/>
					</div>
					<button
						type="button"
						onclick={() => removePayment(index)}
						class="remove-btn"
						aria-label={`Remove payment #${index + 1}`}
					>
						Remove
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.additional-payments {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 1.5rem;
		border-radius: var(--radius-lg);
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-secondary);
	}

	.payments-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.25rem;
		flex-wrap: wrap;
	}

	.eyebrow {
		display: block;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-weight: 600;
		color: var(--color-text-secondary);
		margin-bottom: 0.25rem;
	}

	.payments-header h3 {
		margin: 0;
		font-size: 1.25rem;
		color: var(--color-text-primary);
	}

	.subtitle {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 0.9rem;
	}

	.add-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.65rem 1.1rem;
		border-radius: var(--radius-pill);
		border: 1px solid rgba(59, 130, 246, 0.24);
		background: rgba(59, 130, 246, 0.12);
		color: var(--color-accent-blue);
		font-weight: 600;
		font-size: 0.95rem;
		cursor: pointer;
		transition: background-color 0.2s ease, border-color 0.2s ease;
	}

	.add-btn:hover {
		background: rgba(59, 130, 246, 0.18);
	}

	.empty-state {
		margin: 0;
		padding: 1rem 1.25rem;
		border-radius: var(--radius-md);
		background: var(--color-bg-primary);
		border: 1px dashed var(--color-border-secondary);
		color: var(--color-text-secondary);
		font-size: 0.9rem;
	}

	.payments-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.payment-entry {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
		gap: 1rem;
		padding: 1rem;
		border-radius: var(--radius-md);
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		align-items: end;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.field--wide {
		grid-column: span 1;
	}

	.field label {
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
	}

	.field input {
		padding: 0.7rem 0.85rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-secondary);
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
		font-size: 0.95rem;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.field input:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}

	.remove-btn {
		align-self: center;
		padding: 0.6rem 1rem;
		border-radius: var(--radius-md);
		border: 1px solid rgba(248, 113, 113, 0.3);
		background: rgba(248, 113, 113, 0.12);
		color: #dc2626;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s ease, border-color 0.2s ease;
	}

	.remove-btn:hover {
		background: rgba(248, 113, 113, 0.18);
	}

	@media (max-width: 720px) {
		.payment-entry {
			grid-template-columns: 1fr;
		}

		.remove-btn {
			justify-self: flex-start;
		}
	}
</style>
