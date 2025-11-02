
<script>
	import ItemFormComponent from './ItemFormComponent.svelte';
	import TermsAndNotesComponent from './TermsAndNotesComponent.svelte';
	import AmountPaidComponent from './AmountPaidComponent.svelte';
	import TotalComponent from './TotalComponent.svelte';
	import { DEFAULT_LOGO_PATH, defaultInvoice } from '$lib';
	/** @typedef {import('$lib/types').InvoiceData} InvoiceData */
	/** @typedef {import('$lib/types').InvoiceItem} InvoiceItem */

	/** @type {InvoiceData} */
	export let invoice = defaultInvoice;
	/** @type {(index: number, item: InvoiceItem) => void} */
	export let updateInvoiceItems = () => {};
	/** @type {() => void} */
	export let addInvoiceItem = () => {};
	/** @type {(value?: string) => void} */
	export let updateInvoiceTerms = () => {};
	/** @type {(value?: string) => void} */
	export let updateInvoiceNotes = () => {};
	/** @type {(value?: number) => void} */
	export let updateInvoicePaidAmount = () => {};
	/** @type {(event: Event) => void} */
	export let handleInvoiceDateChange = () => {};
	/** @type {(event: Event) => void} */
	export let handleDueDateChange = () => {};
	/** @type {(value: import('$lib/types').MonetaryAdjustment) => void} */
	export let onUpdateTax = () => {};
	/** @type {(value: import('$lib/types').MonetaryAdjustment) => void} */
	export let onUpdateDiscount = () => {};
	/** @type {(value: import('$lib/types').ShippingInfo) => void} */
	export let onUpdateShipping = () => {};
	/** @type {(value: File | string | null) => void} */
	export let onUpdateLogo = () => {};
	/** @type {(value: boolean) => void} */
	export let togglePaidStatus = () => {};
	/** @type {(event: Event) => void} */
	export let onInvoiceToInput = () => {};
	/** @type {(event: Event) => void} */
	export let onInvoiceFromInput = () => {};
	/** @type {(event: Event) => void} */
	export let onInvoiceNumberInput = () => {};
	/** @type {(event: Event) => void} */
	export let onInvoiceLabelInput = () => {};

	/**
	 * @param {Event} event
	 */
	const handleFileChange = (event) => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement) || !target.files?.length) {
			return;
		}
		onUpdateLogo(target.files[0]);
	};

	/**
	 * @param {number} index
	 * @param {import('$lib/types').InvoiceItem} updatedItem
	 */
	const updateItem = (index, updatedItem) => {
		updateInvoiceItems(index, updatedItem);
	};

	/**
	 * @param {number} index
	 * @returns {(updatedItem: import('$lib/types').InvoiceItem) => void}
	 */
	const createItemUpdater = (index) => (updatedItem) => {
		updateItem(index, updatedItem);
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

	/**
	 * @param {Event} event
	 */
	const handlePaidToggle = (event) => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		togglePaidStatus(target.checked);
	};

</script>

<form class="invoice-form" onsubmit={(e) => e.preventDefault()}>
	<!-- Header: Logo + Invoice Title -->
	<header class="form-header">
		<div class="logo-section">
			<div class="logo-upload-area">
				<div class="logo-preview">
					{#if invoice.logo}
						{#if typeof invoice.logo === 'string'}
							<img src={invoice.logo} alt="Uploaded logo" />
						{:else}
							<img src={URL.createObjectURL(invoice.logo)} alt="Uploaded logo" />
						{/if}
					{:else}
						<img src={DEFAULT_LOGO_PATH} alt="Default logo" />
					{/if}
				</div>
				<input
					id="logoUpload"
					type="file"
					accept="image/*"
					onchange={handleFileChange}
					class="logo-file-input"
				/>
				<label for="logoUpload" class="logo-upload-label">
					Change Logo
				</label>
			</div>
		</div>

		<div class="invoice-title-section">
			<div class="invoice-title-group">
				<input
					type="text"
					value={invoice.invoiceLabel || 'INVOICE'}
					placeholder="INVOICE"
					class="invoice-label-input"
					oninput={onInvoiceLabelInput}
				/>
				<div class="invoice-number-field">
					<span class="number-prefix">#</span>
					<input
						type="text"
						value={invoice.invoiceNumber}
						placeholder="Invoice Number"
						class="invoice-number-input"
						oninput={onInvoiceNumberInput}
					/>
				</div>
			</div>

			<label class="paid-status-inline">
				<input
					type="checkbox"
					onchange={handlePaidToggle}
					checked={invoice.paid}
				/>
				<span>Mark as paid</span>
			</label>
		</div>
	</header>

	<!-- Invoice Details Grid -->
	<section class="details-section">
		<div class="details-grid">
			<div class="field">
				<label for="invoiceFrom">From</label>
				<input
					id="invoiceFrom"
					type="text"
					value={invoice.invoiceFrom}
					placeholder="Your Company"
					oninput={onInvoiceFromInput}
				/>
			</div>

			<div class="field">
				<label for="invoiceTo">Bill To</label>
				<input
					id="invoiceTo"
					type="text"
					oninput={onInvoiceToInput}
					value={invoice.invoiceTo}
					placeholder="Client Name"
				/>
			</div>

			<div class="field">
				<label for="invoiceDate">Invoice Date</label>
				<input id="invoiceDate" type="date" value={invoice.date} oninput={handleInvoiceDateChange} />
			</div>

			<div class="field">
				<label for="dueDate">Due Date</label>
				<input id="dueDate" type="date" value={invoice.dueDate} oninput={handleDueDateChange} />
				<small class="field-hint"
					>Auto-adjusts +30 days from Invoice Date unless edited manually.</small
				>
			</div>
		</div>
	</section>

	<!-- Items Table -->
	<section class="items-section">
		<div class="items-table-container">
			<div class="items-table-header">
				<div class="header-cell item-col">Item</div>
				<div class="header-cell qty-col">Quantity</div>
				<div class="header-cell price-col">Rate</div>
				<div class="header-cell amount-col">Amount</div>
			</div>

			<div class="items-table-body">
				{#each invoice.items as item, index}
					<ItemFormComponent {item} {index} onUpdate={createItemUpdater(index)} />
				{/each}
			</div>
		</div>

		<button type="button" class="add-item-btn" onclick={addItem}>
			<span aria-hidden="true">+</span>
			Add another line
		</button>
	</section>

	<!-- Summary Section (Right-aligned) -->
	<section class="summary-section">
		<div class="summary-container">
			<TotalComponent {invoice} {onUpdateTax} {onUpdateDiscount} {onUpdateShipping} />
			<AmountPaidComponent {invoice} {updatePaidAmount} amountPaid={invoice.amountPaid} />
		</div>
	</section>

	<!-- Terms & Notes Footer -->
	<section class="footer-section">
		<TermsAndNotesComponent
			terms={invoice.terms}
			notes={invoice.notes}
			onUpdateTerms={updateTerms}
			onUpdateNotes={updateNotes}
		/>
	</section>
</form>

<style>
	.invoice-form {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		padding: 2rem;
		background: var(--color-bg-primary);
		border-radius: var(--radius-lg);
		max-width: 1024px;
		margin: 0 auto;
	}

	/* Header Section */
	.form-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1.5rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-border-primary);
	}

	.logo-section {
		flex: 0 0 auto;
	}

	.logo-upload-area {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.logo-preview {
		width: 150px;
		height: 80px;
		border-radius: var(--radius-md);
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-primary);
	}

	.logo-preview img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.logo-file-input {
		display: none;
	}

	.logo-upload-label {
		padding: 0.5rem 1rem;
		border-radius: var(--radius-sm);
		background: var(--color-accent-blue);
		color: #fff;
		font-weight: 600;
		font-size: 0.875rem;
		cursor: pointer;
		transition: background 0.2s ease;
		border: none;
	}

	.logo-upload-label:hover {
		background: color-mix(in srgb, var(--color-accent-blue) 85%, black 15%);
	}

	.invoice-title-section {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.75rem;
	}

	.invoice-title-group {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.5rem;
	}

	.invoice-label-input {
		font-size: 2rem;
		font-weight: 300;
		letter-spacing: 0.02em;
		color: var(--color-text-primary);
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-secondary);
		padding: 0.4rem 0.65rem;
		border-radius: var(--radius-sm);
		text-align: right;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
		text-transform: uppercase;
	}

	.invoice-label-input:hover {
		border-color: var(--color-border-primary);
	}

	.invoice-label-input:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}

	.invoice-number-field {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.number-prefix {
		font-size: 1rem;
		font-weight: 400;
		color: var(--color-text-secondary);
	}

	.invoice-number-input {
		width: 180px;
		padding: 0.4rem 0.6rem;
		border: 1px solid var(--color-border-secondary);
		border-radius: var(--radius-sm);
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
		font-size: 0.95rem;
		text-align: left;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.invoice-number-input:hover {
		border-color: var(--color-border-primary);
	}

	.invoice-number-input:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}

	.paid-status-inline {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.65rem 1rem;
		border-radius: var(--radius-md);
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.24);
		font-weight: 600;
		font-size: 0.875rem;
		color: var(--color-text-primary);
		cursor: pointer;
	}

	.paid-status-inline input {
		width: 1rem;
		height: 1rem;
		accent-color: var(--color-accent-blue);
		cursor: pointer;
	}

	/* Details Section */
	.details-section {
		padding: 0;
	}

	.details-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.field label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.field input[type='text'],
	.field input[type='date'] {
		padding: 0.65rem 0.85rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-secondary);
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
		font-size: 0.95rem;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.field input:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}

	.field-hint {
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		line-height: 1.4;
	}

	/* Items Section */
	.items-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.items-table-container {
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.items-table-header {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1fr;
		gap: 1rem;
		padding: 0.85rem 1rem;
		background: #f3f4f6;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	:global(.dark) .items-table-header {
		background: #1e293b;
		color: #f1f5f9;
	}

	.header-cell {
		text-align: left;
	}

	.amount-col {
		text-align: right;
	}

	.items-table-body {
		display: flex;
		flex-direction: column;
	}

	.add-item-btn {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.65rem 1.1rem;
		border-radius: var(--radius-pill);
		background: rgba(59, 130, 246, 0.12);
		color: var(--color-accent-blue);
		font-weight: 600;
		border: 1px solid rgba(59, 130, 246, 0.24);
		cursor: pointer;
		transition: background-color 0.2s ease, border-color 0.2s ease;
	}

	.add-item-btn:hover {
		background: rgba(59, 130, 246, 0.18);
	}

	/* Summary Section */
	.summary-section {
		display: flex;
		justify-content: flex-end;
		padding-top: 1rem;
	}

	.summary-container {
		width: 100%;
		max-width: 450px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Footer Section */
	.footer-section {
		padding-top: 1rem;
		border-top: 1px solid var(--color-border-primary);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.invoice-form {
			padding: 1.25rem;
			gap: 1.5rem;
		}

		.form-header {
			flex-direction: column;
			align-items: stretch;
			gap: 1.25rem;
		}

		.invoice-title-section {
			align-items: flex-start;
		}

		.invoice-title-group {
			align-items: flex-start;
		}

		.invoice-label-input {
			font-size: 1.75rem;
		}

		.details-grid {
			grid-template-columns: 1fr;
			gap: 0.85rem;
		}

		.items-table-header {
			grid-template-columns: 2fr 1fr 1fr 1fr;
			padding: 0.75rem;
			font-size: 0.75rem;
		}

		.summary-section {
			justify-content: stretch;
		}

		.summary-container {
			max-width: 100%;
		}
	}

	@media (max-width: 640px) {
		.invoice-form {
			padding: 1rem;
		}

		.items-table-header {
			display: none;
		}
	}
</style>
