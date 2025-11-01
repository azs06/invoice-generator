<script>
	let { item = { name: '', quantity: 1, price: 0 }, onUpdate = () => {} } = $props();

	const updateItem = (field, value) => {
		const updatedItem = { ...item, [field]: value };
		onUpdate(updatedItem);
	};
</script>

<div class="item-input">
	<input
		type="text"
		placeholder="Item Name"
		bind:value={item.name}
		oninput={(e) => updateItem('name', e.target.value)}
	/>

	<input
		type="number"
		placeholder="Quantity"
		min="1"
		bind:value={item.quantity}
		oninput={(e) => updateItem('quantity', +e.target.value)}
	/>

	<input
		type="number"
		placeholder="Price"
		min="0"
		step="0.01"
		bind:value={item.price}
		oninput={(e) => updateItem('price', +e.target.value)}
	/>
</div>

<style>
	.item-input {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.item-input input {
		flex: 1;
		padding: 0.55rem 0.75rem;
		border: 1px solid var(--color-border-secondary);
		border-radius: var(--radius-sm);
		background: var(--color-bg-secondary);
		font-size: 1rem;
		color: var(--color-text-primary);
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.item-input input:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}
</style>
