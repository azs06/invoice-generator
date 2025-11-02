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

<div class="item-row">
	<div class="item-cell item-col">
		<label for={`item-name-${index}`} class="sr-only">Item name</label>
		<input
			id={`item-name-${index}`}
			type="text"
			placeholder="Describe the work or product"
			value={item.name}
			oninput={(e) => updateField('name', e.target.value)}
			class="item-input"
		/>
	</div>

	<div class="item-cell qty-col">
		<label for={`item-quantity-${index}`} class="sr-only">Quantity</label>
		<input
			id={`item-quantity-${index}`}
			type="number"
			min="1"
			placeholder="1"
			value={item.quantity}
			oninput={(e) => updateField('quantity', +e.target.value)}
			class="item-input"
		/>
	</div>

	<div class="item-cell price-col">
		<label for={`item-price-${index}`} class="sr-only">Price</label>
		<input
			id={`item-price-${index}`}
			type="number"
			min="0"
			step="0.01"
			placeholder="0.00"
			value={item.price}
			oninput={(e) => updateField('price', +e.target.value)}
			class="item-input"
		/>
	</div>

	<div class="item-cell amount-col">
		<span class="item-amount">{formatCurrency(lineTotal())}</span>
	</div>
</div>

<style>
	.item-row {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1fr;
		gap: 1rem;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		transition: background-color 0.15s ease;
	}

	.item-row:hover {
		background: var(--color-bg-secondary);
	}

	.item-row:last-child {
		border-bottom: none;
	}

	.item-cell {
		display: flex;
		align-items: center;
	}

	.amount-col {
		justify-content: flex-end;
		text-align: right;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	.item-input {
		width: 100%;
		padding: 0.5rem 0.65rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-secondary);
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
		font-size: 0.9rem;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.item-input:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}

	.item-amount {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	/* Mobile: Stack vertically */
	@media (max-width: 640px) {
		.item-row {
			grid-template-columns: 1fr;
			gap: 0.75rem;
			padding: 1rem;
			border-radius: var(--radius-md);
			background: var(--color-bg-secondary);
			border: 1px solid var(--color-border-secondary);
			margin-bottom: 0.75rem;
		}

		.item-row:last-child {
			border-bottom: 1px solid var(--color-border-secondary);
			margin-bottom: 0;
		}

		.item-cell {
			flex-direction: column;
			align-items: stretch;
			gap: 0.3rem;
		}

		.amount-col {
			justify-content: space-between;
			flex-direction: row;
			padding: 0.5rem 0.75rem;
			border-radius: var(--radius-sm);
			background: rgba(59, 130, 246, 0.1);
		}

		.amount-col::before {
			content: 'Amount:';
			font-size: 0.85rem;
			font-weight: 600;
			color: var(--color-text-secondary);
		}

		.sr-only {
			position: static;
			width: auto;
			height: auto;
			padding: 0;
			margin: 0;
			overflow: visible;
			clip: auto;
			white-space: normal;
			font-size: 0.75rem;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.01em;
			color: var(--color-text-secondary);
		}
	}
</style>

