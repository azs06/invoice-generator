<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ItemFormComponent from './ItemFormComponent.svelte';
	import TermsAndNotesComponent from './TermsAndNotesComponent.svelte';
	import AmountPaidComponent from './AmountPaidComponent.svelte';
	import TotalComponent from './TotalComponent.svelte';
	import { DEFAULT_LOGO_PATH, defaultInvoice } from '$lib';
	import type { InvoiceData, InvoiceItem, MonetaryAdjustment, ShippingInfo } from '$lib/types';

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
		onInvoiceLabelInput = () => {}
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
				<input
					type="text"
					value={invoice.invoiceNumber}
					placeholder={$_('placeholders.invoice_number')}
					class="invoice-number-input"
					oninput={onInvoiceNumberInput}
				/>
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
		--editor-input-radius: 0.36rem;
		display: flex;
		flex-direction: column;
		gap: 1.35rem;
		padding: 1rem;
		background: var(--color-surface);
		border-radius: 0;
		max-width: none;
		margin: 0;
	}

	.form-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		padding: 0.9rem;
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
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
		width: 136px;
		height: 70px;
		border-radius: var(--radius-md);
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-primary);
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
		padding: 0.42rem 0.72rem;
		border-radius: var(--radius-pill);
		background: var(--color-bg-primary);
		color: #fff;
		color: var(--color-text-primary);
		font-weight: 600;
		font-size: 0.78rem;
		cursor: pointer;
		border: 1px solid var(--color-border-primary);
		transition:
			background-color var(--motion-fast) var(--motion-ease),
			border-color var(--motion-fast) var(--motion-ease);
	}

	.logo-upload-label:hover {
		background: var(--color-bg-secondary);
		border-color: var(--color-border-secondary);
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
		gap: 0.55rem;
	}

	.invoice-title-group {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.4rem;
	}

	.invoice-label-input {
		font-size: 1.4rem;
		font-weight: 700;
		letter-spacing: 0.01em;
		color: var(--color-text-primary);
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		padding: 0.35rem 0.55rem;
		border-radius: var(--editor-input-radius);
		text-align: right;
		transition:
			border-color var(--motion-fast) var(--motion-ease),
			box-shadow var(--motion-fast) var(--motion-ease);
		text-transform: uppercase;
	}

	.invoice-label-input:hover {
		border-color: var(--color-border-secondary);
	}

	.invoice-label-input:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}

	.invoice-number-input {
		width: min(170px, 100%);
		padding: 0.42rem 0.6rem;
		border: 1px solid var(--color-border-primary);
		border-radius: var(--editor-input-radius);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		font-size: 0.86rem;
		font-family: var(--font-mono-ui);
		text-align: right;
		transition:
			border-color var(--motion-fast) var(--motion-ease),
			box-shadow var(--motion-fast) var(--motion-ease);
	}

	.invoice-number-input:hover {
		border-color: var(--color-border-secondary);
	}

	.invoice-number-input:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}

	.paid-status-inline {
		display: flex;
		align-items: center;
		gap: 0.42rem;
		padding: 0.42rem 0.72rem;
		border-radius: var(--radius-pill);
		background: color-mix(in srgb, var(--color-accent-blue) 10%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-accent-blue) 26%, var(--color-border-primary));
		font-weight: 600;
		font-size: 0.76rem;
		color: var(--color-text-primary);
		cursor: pointer;
	}

	.paid-status-inline input {
		width: 1rem;
		height: 1rem;
		accent-color: var(--color-accent-blue);
		cursor: pointer;
	}

	.details-section {
		padding: 0;
	}

	.details-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
		gap: 0.75rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.field label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.field input[type='text'],
	.field input[type='date'] {
		padding: 0.56rem 0.72rem;
		border-radius: var(--editor-input-radius);
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		font-size: 0.86rem;
		transition:
			border-color var(--motion-fast) var(--motion-ease),
			box-shadow var(--motion-fast) var(--motion-ease);
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

	.items-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.items-table-container {
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.items-table-header {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1fr;
		gap: 0.7rem;
		padding: 0.62rem 0.8rem;
		background: var(--color-bg-primary);
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	:global(.dark) .items-table-header {
		background: var(--color-bg-primary);
		color: var(--color-text-secondary);
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
		padding: 0.5rem 0.88rem;
		border-radius: var(--radius-pill);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		font-weight: 600;
		font-size: 0.8rem;
		border: 1px solid var(--color-border-primary);
		cursor: pointer;
		transition:
			background-color var(--motion-fast) var(--motion-ease),
			border-color var(--motion-fast) var(--motion-ease),
			color var(--motion-fast) var(--motion-ease);
	}

	.add-item-btn:hover {
		background: var(--color-bg-secondary);
		border-color: var(--color-border-secondary);
		color: var(--color-accent-blue);
	}

	.summary-section {
		display: flex;
		justify-content: flex-end;
		padding-top: 0.6rem;
	}

	.summary-container {
		width: 100%;
		max-width: 450px;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
		padding: 0.8rem;
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		background: var(--color-bg-primary);
	}

	.footer-section {
		padding-top: 0.8rem;
		border-top: 1px solid var(--color-border-primary);
	}

	@media (max-width: 768px) {
		.invoice-form {
			padding: 0.5rem;
			gap: 1rem;
		}

		.form-header {
			flex-direction: column;
			align-items: stretch;
			gap: 0.85rem;
		}

		.invoice-title-section {
			align-items: flex-start;
		}

		.invoice-title-group {
			align-items: flex-start;
		}

		.invoice-label-input {
			font-size: 1.15rem;
		}

		.details-grid {
			grid-template-columns: 1fr;
			gap: 0.68rem;
		}

		.items-table-header {
			grid-template-columns: 2fr 1fr 1fr 1fr;
			padding: 0.6rem;
			font-size: 0.75rem;
		}

		.summary-section {
			justify-content: stretch;
		}

		.summary-container {
			max-width: 100%;
		}

		.invoice-number-input {
			width: 100%;
		}
	}

	@media (max-width: 640px) {
		.invoice-form {
			padding: 0.5rem;
		}

		.items-table-header {
			display: none;
		}
	}
</style>
