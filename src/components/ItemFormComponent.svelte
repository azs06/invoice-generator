<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { toUSCurrency } from '$lib/currency.js';
	import type { InvoiceItem } from '$lib/types';

	export let item: InvoiceItem = { name: '', quantity: 1, price: 0, amount: 0 };
	export let onUpdate: (value: InvoiceItem) => void = () => {};
	export let index: number = 0;

	const updateField = (field: 'name' | 'quantity' | 'price', rawValue: string | number): void => {
		const updatedItem = { ...item };
		if (field === 'name') {
			updatedItem.name = typeof rawValue === 'string' ? rawValue : String(rawValue ?? '');
		} else if (field === 'quantity') {
			updatedItem.quantity = typeof rawValue === 'number' ? rawValue : Number(rawValue) || 0;
		} else {
			updatedItem.price = typeof rawValue === 'number' ? rawValue : Number(rawValue) || 0;
		}
		updatedItem.amount = (updatedItem.quantity || 0) * (updatedItem.price || 0);
		onUpdate(updatedItem);
	};

	const lineTotal = (): number => {
		const qty = Number(item.quantity) || 0;
		const price = Number(item.price) || 0;
		const amount = Number.isFinite(item.amount) ? Number(item.amount) : qty * price;
		return Number.isFinite(amount) ? amount : 0;
	};
</script>

<div class="item-row">
	<div class="item-cell item-col">
		<label for={`item-name-${index}`} class="sr-only">{$_('items.item')}</label>
		<input
			id={`item-name-${index}`}
			type="text"
			placeholder={$_('placeholders.item_name')}
			bind:value={item.name}
			oninput={(event) => {
				const target = event.currentTarget;
				if (!(target instanceof HTMLInputElement)) return;
				updateField('name', target.value);
			}}
			class="item-input"
			data-testid={`item-name-${index}`}
		/>
	</div>

	<div class="item-cell qty-col">
		<label for={`item-quantity-${index}`} class="sr-only">{$_('items.quantity')}</label>
		<input
			id={`item-quantity-${index}`}
			type="number"
			min="1"
			placeholder="1"
			bind:value={item.quantity}
			oninput={(event) => {
				const target = event.currentTarget;
				if (!(target instanceof HTMLInputElement)) return;
				updateField('quantity', Number(target.value));
			}}
			class="item-input"
			data-testid={`item-quantity-${index}`}
		/>
	</div>

	<div class="item-cell price-col">
		<label for={`item-price-${index}`} class="sr-only">{$_('items.price')}</label>
		<input
			id={`item-price-${index}`}
			type="number"
			min="0"
			step="0.01"
			placeholder="0.00"
			bind:value={item.price}
			oninput={(event) => {
				const target = event.currentTarget;
				if (!(target instanceof HTMLInputElement)) return;
				updateField('price', Number(target.value));
			}}
			class="item-input"
			data-testid={`item-price-${index}`}
		/>
	</div>

	<div class="item-cell amount-col" data-label={`${$_('items.amount')}:`}>
		<span class="item-amount">{$toUSCurrency(lineTotal())}</span>
	</div>
</div>

<style>
	.item-row {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1fr;
		gap: 0.6rem;
		padding: 0.62rem 0.8rem;
		border-bottom: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		transition: background-color var(--motion-fast) var(--motion-ease);
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
		padding: 0.46rem 0.6rem;
		border-radius: 0.36rem;
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		font-size: 0.84rem;
		transition:
			border-color var(--motion-fast) var(--motion-ease),
			box-shadow var(--motion-fast) var(--motion-ease);
	}

	.item-input:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}

	.item-amount {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--color-text-primary);
		font-family: var(--font-mono-ui);
	}

	@media (max-width: 640px) {
		.item-row {
			grid-template-columns: 1fr;
			gap: 0.55rem;
			padding: 0.75rem;
			border-radius: var(--radius-md);
			background: var(--color-bg-secondary);
			border: 1px solid var(--color-border-secondary);
			margin-bottom: 0.55rem;
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
			padding: 0.4rem 0.65rem;
			border-radius: var(--radius-sm);
			background: color-mix(in srgb, var(--color-accent-blue) 10%, transparent);
		}

		.amount-col::before {
			content: attr(data-label);
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
