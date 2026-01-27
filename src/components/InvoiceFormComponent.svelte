<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ItemFormComponent from './ItemFormComponent.svelte';
	import TermsAndNotesComponent from './TermsAndNotesComponent.svelte';
	import AmountPaidComponent from './AmountPaidComponent.svelte';
	import TotalComponent from './TotalComponent.svelte';
	import OcrUploadComponent from './OcrUploadComponent.svelte';
	import { DEFAULT_LOGO_PATH, defaultInvoice } from '$lib';
	import type { InvoiceData, InvoiceItem, MonetaryAdjustment, ShippingInfo } from '$lib/types';
	import type { OcrInvoiceData } from '$lib/ocrParser';

	interface Props {
		invoice?: InvoiceData;
		updateInvoiceItems?: (index: number, item: InvoiceItem) => void;
		addInvoiceItem?: () => void;
		updateInvoiceTerms?: (value?: string) => void;
		updateInvoiceNotes?: (value?: string) => void;
		updateInvoicePaidAmount?: (value?: number) => void;
		handleInvoiceDateChange?: (event: Event) => void;
		handleDueDateChange?: (event: Event) => void;
		onUpdateTax?: (value: MonetaryAdjustment) => void;
		onUpdateDiscount?: (value: MonetaryAdjustment) => void;
		onUpdateShipping?: (value: ShippingInfo) => void;
		onUpdateLogo?: (value: File | string | null) => void;
		togglePaidStatus?: (value: boolean) => void;
		onInvoiceToInput?: (event: Event) => void;
		onInvoiceFromInput?: (event: Event) => void;
		onInvoiceNumberInput?: (event: Event) => void;
		onInvoiceLabelInput?: (event: Event) => void;
		onOcrDataExtracted?: (data: OcrInvoiceData) => void;
	}

	let {
		invoice = defaultInvoice,
		updateInvoiceItems = () => {},
		addInvoiceItem = () => {},
		updateInvoiceTerms = () => {},
		updateInvoiceNotes = () => {},
		updateInvoicePaidAmount = () => {},
		handleInvoiceDateChange = () => {},
		handleDueDateChange = () => {},
		onUpdateTax = () => {},
		onUpdateDiscount = () => {},
		onUpdateShipping = () => {},
		onUpdateLogo = () => {},
		togglePaidStatus = () => {},
		onInvoiceToInput = () => {},
		onInvoiceFromInput = () => {},
		onInvoiceNumberInput = () => {},
		onInvoiceLabelInput = () => {},
		onOcrDataExtracted = () => {}
	}: Props = $props();

	const handleFileChange = (event: Event): void => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement) || !target.files?.length) {
			return;
		}
		onUpdateLogo(target.files[0]);
	};

	const updateItem = (index: number, updatedItem: InvoiceItem): void => {
		updateInvoiceItems(index, updatedItem);
	};

	const createItemUpdater = (index: number): ((updatedItem: InvoiceItem) => void) => {
		return (updatedItem: InvoiceItem): void => {
			updateItem(index, updatedItem);
		};
	};

	const addItem = (): void => {
		addInvoiceItem();
	};

	const updateTerms = (newTerms: string = ''): void => {
		updateInvoiceTerms(newTerms);
	};

	const updateNotes = (newNotes: string = ''): void => {
		updateInvoiceNotes(newNotes);
	};

	const updatePaidAmount = (amountPaid: number = 0): void => {
		updateInvoicePaidAmount(amountPaid);
	};

	const handlePaidToggle = (event: Event): void => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		togglePaidStatus(target.checked);
	};
</script>

<form class="invoice-form" onsubmit={(e) => e.preventDefault()}>
	<!-- OCR Upload Section -->
	<section class="ocr-section">
		<OcrUploadComponent onDataExtracted={onOcrDataExtracted} />
	</section>

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
					{$_('invoice.change_logo')}
				</label>
			</div>
		</div>

		<div class="invoice-title-section">
			<div class="invoice-title-group">
				<input
					type="text"
					value={invoice.invoiceLabel || $_('invoice.invoice_label')}
					placeholder={$_('placeholders.invoice_label')}
					class="invoice-label-input"
					oninput={onInvoiceLabelInput}
				/>
				<div class="invoice-number-field">
					<span class="number-prefix">#</span>
					<input
						type="text"
						value={invoice.invoiceNumber}
						placeholder={$_('placeholders.invoice_number')}
						class="invoice-number-input"
						oninput={onInvoiceNumberInput}
					/>
				</div>
			</div>

			<label class="paid-status-inline">
				<input type="checkbox" onchange={handlePaidToggle} checked={invoice.paid} />
				<span>{$_('fields.paid_status')}</span>
			</label>
		</div>
	</header>

	<!-- Invoice Details Grid -->
	<section class="details-section">
		<div class="details-grid">
			<div class="field">
				<label for="invoiceFrom">{$_('invoice.from')}</label>
				<input
					id="invoiceFrom"
					type="text"
					value={invoice.invoiceFrom}
					placeholder={$_('placeholders.your_company')}
					oninput={onInvoiceFromInput}
					data-testid="invoice-from"
				/>
			</div>

			<div class="field">
				<label for="invoiceTo">{$_('invoice.to')}</label>
				<input
					id="invoiceTo"
					type="text"
					oninput={onInvoiceToInput}
					value={invoice.invoiceTo}
					placeholder={$_('placeholders.client_name')}
					data-testid="invoice-to"
				/>
			</div>

			<div class="field">
				<label for="invoiceDate">{$_('invoice.date')}</label>
				<input
					id="invoiceDate"
					type="date"
					value={invoice.date}
					oninput={handleInvoiceDateChange}
				/>
			</div>

			<div class="field">
				<label for="dueDate">{$_('invoice.due_date')}</label>
				<input id="dueDate" type="date" value={invoice.dueDate} oninput={handleDueDateChange} />
				<small class="field-hint">{$_('helpers.due_date_auto')}</small>
			</div>
		</div>
	</section>

	<!-- Items Table -->
	<section class="items-section">
		<div class="items-table-container">
			<div class="items-table-header">
				<div class="header-cell item-col">{$_('items.item')}</div>
				<div class="header-cell qty-col">{$_('items.quantity')}</div>
				<div class="header-cell price-col">{$_('items.price')}</div>
				<div class="header-cell amount-col">{$_('items.amount')}</div>
			</div>

			<div class="items-table-body">
				{#each invoice.items as item, index}
					<ItemFormComponent {item} {index} onUpdate={createItemUpdater(index)} />
				{/each}
			</div>
		</div>

		<button type="button" class="add-item-btn" onclick={addItem}>
			<span aria-hidden="true">+</span>
			{$_('items.add_another_line')}
		</button>
	</section>

	<div class="section-divider" aria-hidden="true"></div>

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

	/* OCR Section */
	.ocr-section {
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--color-border-primary);
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

	.section-divider {
		height: 1px;
		width: 100%;
		background: var(--color-border-primary);
		border-radius: 999px;
		align-self: stretch;
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
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease;
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
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease;
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
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease;
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
		transition:
			background-color 0.2s ease,
			border-color 0.2s ease;
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
