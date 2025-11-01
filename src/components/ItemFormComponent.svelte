<script>
  
    let { item ={ name: '', quantity: 1, price: 0, amount: 0 }, onUpdate, index = 0 } = $props();
  
    const updateField = (field, value) => {
      const updatedItem = { ...item, [field]: value };
      updatedItem.amount = updatedItem.quantity * updatedItem.price;
      onUpdate(updatedItem);
    };
	const lineTotal = () => {
		const qty = Number(item.quantity) || 0;
		const price = Number(item.price) || 0;
		const amount = Number.isFinite(item.amount) ? Number(item.amount) : qty * price;
		return Number.isFinite(amount) ? amount : 0;
	};

	const formatCurrency = (value) =>
		new Intl.NumberFormat(undefined, {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(value || 0);
</script>

<div class="item-form">
	<div class="item-grid">
		<div class="field field--wide">
			<label for={`item-name-${index}`}>Item name</label>
			<input
				id={`item-name-${index}`}
				type="text"
				placeholder="Describe the work or product"
				value={item.name}
				oninput={(e) => updateField('name', e.target.value)}
			/>
		</div>

		<div class="field">
			<label for={`item-quantity-${index}`}>Quantity</label>
			<input
				id={`item-quantity-${index}`}
				type="number"
				min="1"
				placeholder="1"
				value={item.quantity}
				oninput={(e) => updateField('quantity', +e.target.value)}
			/>
		</div>

		<div class="field">
			<label for={`item-price-${index}`}>Price</label>
			<input
				id={`item-price-${index}`}
				type="number"
				min="0"
				step="0.01"
				placeholder="0.00"
				value={item.price}
				oninput={(e) => updateField('price', +e.target.value)}
			/>
		</div>
	</div>

	<p class="item-amount" aria-live="polite">
		<span>Line total</span>
		<strong>{formatCurrency(lineTotal())}</strong>
	</p>
</div>

<style>
	.item-form {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		padding: 1rem;
		border-radius: var(--radius-lg);
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-secondary);
	}

	.item-grid {
		display: grid;
		grid-template-columns: minmax(0, 2fr) repeat(2, minmax(0, 1fr));
		gap: 0.8rem;
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
		letter-spacing: 0.01em;
		color: var(--color-text-secondary);
		text-transform: uppercase;
	}

	.field input {
		padding: 0.6rem 0.8rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		font-size: 0.95rem;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.field input:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}

	.item-amount {
		margin: 0;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.65rem 0.9rem;
		border-radius: var(--radius-md);
		background: rgba(59, 130, 246, 0.1);
		color: var(--color-text-primary);
		font-size: 0.87rem;
		font-weight: 500;
	}

	.item-amount strong {
		font-size: 1rem;
		color: var(--color-accent-blue);
		font-weight: 700;
	}

	@media (max-width: 720px) {
		.item-grid {
			grid-template-columns: 1fr;
		}

		.field--wide {
			grid-column: auto;
		}
	}
</style>
  
