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
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 1rem;
	}
</style>
