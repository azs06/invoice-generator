<script>
	import ItemFormComponent from './ItemFormComponent.svelte';
	import TermsAndNotesComponent from './TermsAndNotesComponent.svelte';
	import AmountPaidComponent from './AmountPaidComponent.svelte';
	import FilePreviewComponent from './FilePreviewComponent.svelte';
	import TotalComponent from './TotalComponent.svelte';

	export let invoice = {
		logo: null,
		items: [],
		amountPaid: 0,
		terms: '',
		notes: '',
		discount: { type: 'flat', rate: 0 },
		tax: { type: 'flat', rate: 0 },
		shipping: { amount: 0 },
		date: '',
		dueDate: '',
		invoiceFrom: '',
		invoiceTo: '',
		invoiceNumber: '',
		paid: false
	};

	const handleFileChange = (e) => {
		const file = e.target.files[0];
		invoice.logo = file;
	};

	const updateItem = (index, updatedItem) => {
		invoice.items[index] = updatedItem;
	};

	const addItem = () => {
		invoice.items = [...invoice.items, { name: '', quantity: 1, price: 0, amount: 0 }];
	};

	const updateTerms = (newTerms) => {
		invoice.terms = newTerms;
	};

	const updateNotes = (newNotes) => {
		invoice.notes = newNotes;
	};
</script>

<form class="invoice-form" on:submit|preventDefault>
	<div class="form-section">
		<label>From</label>
		<input type="text" bind:value={invoice.invoiceFrom} placeholder="Your Company" />
	</div>

	<div class="form-section">
		<label>To</label>
		<input type="text" bind:value={invoice.invoiceTo} placeholder="Client Name" />
	</div>

	<div class="form-section">
		<label>Invoice Date</label>
		<input type="date" bind:value={invoice.date} />
	</div>

	<div class="form-section">
		<label>Due Date</label>
		<input type="date" bind:value={invoice.dueDate} />
	</div>

	<div class="form-section">
		<label>Upload Logo</label>
		<input type="file" accept="image/*" on:change={handleFileChange} />
		{#if invoice.logo}
			<FilePreviewComponent file={invoice.logo} />
		{/if}
	</div>

	<h3>Invoice Items</h3>
	{#each invoice.items as item, index}
		<ItemFormComponent {item} onUpdate={(updatedItem) => updateItem(index, updatedItem)} />
	{/each}

	<button type="button" class="add-item-btn" on:click={addItem}> Add Item </button>

	<TermsAndNotesComponent
		terms={invoice.terms}
		notes={invoice.notes}
		onUpdateTerms={updateTerms}
		onUpdateNotes={updateNotes}
	/>

	<AmountPaidComponent amountPaid={invoice.amountPaid} />

	<TotalComponent {invoice} />
	<div class="paid-status">
		<label>
			<input type="checkbox" bind:checked={invoice.paid} />
			Mark as Paid
		</label>
	</div>
</form>

<style>
	.invoice-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: 2rem;
		background: #f9fafb;
		border-radius: 0.5rem;
		border: 1px solid #e5e7eb;
	}
	.form-section {
		display: flex;
		flex-direction: column;
	}
	.form-section label {
		margin-bottom: 0.5rem;
		font-weight: bold;
	}
	.form-section input[type='text'],
	.form-section input[type='date'],
	.form-section input[type='file'] {
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 1rem;
	}
	.add-item-btn {
		padding: 0.5rem 1rem;
		background-color: #2563eb;
		color: white;
		border: none;
		border-radius: 0.375rem;
		font-size: 1rem;
		cursor: pointer;
		width: fit-content;
	}
	.add-item-btn:hover {
		background-color: #1d4ed8;
	}
	.paid-status {
		margin-top: 1rem;
		font-weight: bold;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.paid-status input {
		transform: scale(1.5);
	}
</style>
