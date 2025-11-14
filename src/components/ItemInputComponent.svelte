<script lang="ts">
	import type { InvoiceItem } from '$lib/types';

	export let item: InvoiceItem = { name: '', quantity: 1, price: 0, amount: 0 };
	export let onUpdate: (item: InvoiceItem) => void = () => {};

	const updateItem = (field: 'name' | 'quantity' | 'price', rawValue: string | number): void => {
		const nextItem = { ...item };
		if (field === 'name') {
			nextItem.name = typeof rawValue === 'string' ? rawValue : String(rawValue ?? '');
		} else if (field === 'quantity') {
			nextItem.quantity = typeof rawValue === 'number' ? rawValue : Number(rawValue) || 0;
		} else {
			nextItem.price = typeof rawValue === 'number' ? rawValue : Number(rawValue) || 0;
		}
		nextItem.amount = (nextItem.price || 0) * (nextItem.quantity || 0);
		onUpdate(nextItem);
	};

	const handleNameInput = (event: Event): void => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		updateItem('name', target.value);
	};

	const handleQuantityInput = (event: Event): void => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		updateItem('quantity', Number(target.value));
	};

	const handlePriceInput = (event: Event): void => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		updateItem('price', Number(target.value));
	};
</script>

<div class="item-input">
	<input type="text" placeholder="Item Name" bind:value={item.name} oninput={handleNameInput} />

	<input
		type="number"
		placeholder="Quantity"
		min="1"
		bind:value={item.quantity}
		oninput={handleQuantityInput}
	/>

	<input
		type="number"
		placeholder="Price"
		min="0"
		step="0.01"
		bind:value={item.price}
		oninput={handlePriceInput}
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
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease;
	}

	.item-input input:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}
</style>
