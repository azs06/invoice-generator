<script>
	import ItemFormComponent from './ItemFormComponent.svelte';
	import TermsAndNotesComponent from './TermsAndNotesComponent.svelte';
	import AmountPaidComponent from './AmountPaidComponent.svelte';
	import FilePreviewComponent from './FilePreviewComponent.svelte';
	import TotalComponent from './TotalComponent.svelte';
	import { defaultInvoice } from '$lib';

	let {
		invoice = defaultInvoice,
		updateInvoiceItems,
		addInvoiceItem,
		updateInvoiceTerms,
		updateInvoiceNotes,
		updateInvoicePaidAmount,
		handleInvoiceDateChange,
		handleDueDateChange,
		onUpdateTax,
		onUpdateDiscount,
		onUpdateShipping,
		onUpdateLogo,
		togglePaidStatus
	} = $props();

	const handleFileChange = (e) => {
		const file = e.target.files[0];
		onUpdateLogo(file);
	};

	const updateItem = (index, updatedItem) => {
		updateInvoiceItems(index, updatedItem);
	};

	const addItem = () => {
		addInvoiceItem();
	};

	const updateTerms = (newTerms = '') => {
		updateInvoiceTerms(newTerms);
	};

	const updateNotes = (newNotes = '') => {
		updateInvoiceNotes(newNotes);
	};

	const updatePaidAmount = (amountPaid = 0) => {
		updateInvoicePaidAmount(amountPaid);
	};

</script>

<form class="invoice-form" onsubmit={(e) => e.preventDefault()}>
	<div class="form-section">
		<label for="invoiceFrom">From</label>
		<input
			id="invoiceFrom"
			type="text"
			value={invoice.invoiceFrom}
			placeholder="Your Company"
		/>
	</div>

	<div class="form-section">
		<label for="invoiceTo">To</label>
		<input id="invoiceTo" type="text" value={invoice.invoiceTo} placeholder="Client Name" />
	</div>

	<div class="form-section">
		<label for="invoiceDate">Invoice Date</label>
		<input
			id="invoiceDate"
			type="date"
			value={invoice.date}
			oninput={handleInvoiceDateChange}
		/>
	</div>

	<div class="form-section">
		<label for="dueDate">Due Date</label>
		<input id="dueDate" type="date" value={invoice.dueDate} oninput={handleDueDateChange} />
		<small
			>If you change Invoice Date, Due Date will auto-adjust (+30 days) unless you edit manually.</small
		>
	</div>

	<div class="form-section">
		<label for="logoUpload">Upload Logo</label>
		<input id="logoUpload" type="file" accept="image/*" onchange={handleFileChange} />
		{#if invoice.logo}
			<FilePreviewComponent file={invoice.logo} />
		{/if}
	</div>

	<h3>Invoice Items</h3>
	{#each invoice.items as item, index}
		<ItemFormComponent {item} onUpdate={(updatedItem) => updateItem(index, updatedItem)} />
	{/each}

	<button type="button" class="add-item-btn" onclick={addItem}> Add Item </button>

	<TermsAndNotesComponent
		terms={invoice.terms}
		notes={invoice.notes}
		onUpdateTerms={updateTerms}
		onUpdateNotes={updateNotes}
	/>

	<AmountPaidComponent {updatePaidAmount} amountPaid={invoice.amountPaid} />

	<TotalComponent {invoice} {onUpdateTax} {onUpdateDiscount} {onUpdateShipping} />
	<div class="paid-status">
		<label>
			<input type="checkbox" onchange={(e) => togglePaidStatus(e.target.checked)} checked={invoice.paid} />
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
