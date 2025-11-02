<script>
	import AmountPaidComponent from './AmountPaidComponent.svelte';
	import ItemInputComponent from './ItemInputComponent.svelte';
	import TermsAndNotesComponent from './TermsAndNotesComponent.svelte';
	import TotalComponent from './TotalComponent.svelte';
	import { defaultInvoice } from '$lib/index.js';

	/**
	 * @typedef {typeof defaultInvoice} InvoiceData
	 * @typedef {InvoiceData['items'][number]} InvoiceItem
	 */

	/** @type {InvoiceData} */
	export let invoice = /** @type {InvoiceData} */ (structuredClone(defaultInvoice));

	const ensureItems = () => {
		if (!Array.isArray(invoice.items)) {
			invoice.items = [];
		}
	};

	/**
	 * @param {number} index
	 * @param {InvoiceItem} updatedItem
	 */
	const updateItem = (index, updatedItem) => {
		ensureItems();
		invoice.items[index] = updatedItem;
	};

	/**
	 * @param {number} index
	 * @returns {(updatedItem: InvoiceItem) => void}
	 */
	const createItemUpdater = (index) => (updatedItem) => {
		updateItem(index, updatedItem);
	};

	const addItem = () => {
		ensureItems();
		invoice.items = [...invoice.items, { name: '', quantity: 1, price: 0, amount: 0 }];
	};

	/**
	 * @param {string} [newTerms='']
	 */
	const updateTerms = (newTerms = '') => {
		invoice.terms = newTerms;
	};

	/**
	 * @param {string} [newNotes='']
	 */
	const updateNotes = (newNotes = '') => {
		invoice.notes = newNotes;
	};

	/**
	 * @param {number} [amountPaid=0]
	 */
	const updatePaidAmount = (amountPaid = 0) => {
		invoice.amountPaid = amountPaid;
	};

	/**
	 * @param {InvoiceData['discount']} next
	 */
	const handleDiscountChange = (next) => {
		invoice.discount = next;
	};

	/**
	 * @param {InvoiceData['tax']} next
	 */
	const handleTaxChange = (next) => {
		invoice.tax = next;
	};

	/**
	 * @param {InvoiceData['shipping']} next
	 */
	const handleShippingChange = (next) => {
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
