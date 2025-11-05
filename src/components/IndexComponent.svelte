<script lang="ts">
	import AmountPaidComponent from './AmountPaidComponent.svelte';
	import ItemInputComponent from './ItemInputComponent.svelte';
	import TermsAndNotesComponent from './TermsAndNotesComponent.svelte';
	import TotalComponent from './TotalComponent.svelte';
	import { defaultInvoice } from '$lib/index.js';
	import type { InvoiceData, InvoiceItem, MonetaryAdjustment } from '$lib/types';

	export let invoice: InvoiceData = structuredClone(defaultInvoice);

	const ensureItems = (): void => {
		if (!Array.isArray(invoice.items)) {
			invoice.items = [];
		}
	};

	const updateItem = (index: number, updatedItem: InvoiceItem): void => {
		ensureItems();
		invoice.items[index] = updatedItem;
	};

	const createItemUpdater = (index: number): ((updatedItem: InvoiceItem) => void) => {
		return (updatedItem: InvoiceItem) => {
			updateItem(index, updatedItem);
		};
	};

	const addItem = (): void => {
		ensureItems();
		invoice.items = [...invoice.items, { name: '', quantity: 1, price: 0, amount: 0 }];
	};

	const updateTerms = (newTerms: string = ''): void => {
		invoice.terms = newTerms;
	};

	const updateNotes = (newNotes: string = ''): void => {
		invoice.notes = newNotes;
	};

	const updatePaidAmount = (amountPaid: number = 0): void => {
		invoice.amountPaid = amountPaid;
	};

	const handleDiscountChange = (next: MonetaryAdjustment): void => {
		invoice.discount = next;
	};

	const handleTaxChange = (next: MonetaryAdjustment): void => {
		invoice.tax = next;
	};

	const handleShippingChange = (next: { amount: number }): void => {
		invoice.shipping = next;
	};
</script>

<div class="invoice-index">
	<h2>Invoice</h2>

	<div class="items-list">
		{#each invoice.items as item, index}
			<ItemInputComponent {item} onUpdate={createItemUpdater(index)} />
		{/each}

		<button type="button" onclick={addItem} class="add-item-btn"> Add Item </button>
	</div>

	<TermsAndNotesComponent
		terms={invoice.terms}
		notes={invoice.notes}
		onUpdateTerms={updateTerms}
		onUpdateNotes={updateNotes}
	/>

	<AmountPaidComponent {invoice} {updatePaidAmount} amountPaid={invoice.amountPaid} />

	<TotalComponent
		{invoice}
		onUpdateDiscount={handleDiscountChange}
		onUpdateTax={handleTaxChange}
		onUpdateShipping={handleShippingChange}
	/>
</div>

<style>
	.invoice-index {
		padding: 2rem;
	}
	.items-list {
		margin-bottom: 2rem;
	}
	.add-item-btn {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		background-color: #2563eb;
		color: white;
		border: none;
		border-radius: var(--radius-sm);
		font-size: 1rem;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}
	.add-item-btn:hover {
		background-color: #1d4ed8;
	}
</style>
