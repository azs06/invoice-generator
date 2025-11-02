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
		togglePaidStatus,
		onInvoiceToInput,
		onInvoiceFromInput,
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
	<section class="panel">
		<header class="panel-header">
			<span class="panel-eyebrow">Basics</span>
			<h2>Invoice Details</h2>
			<p class="panel-subtitle">Set the sender, recipient, and important dates.</p>
		</header>

		<div class="field-grid">
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
				<label for="invoiceTo">To</label>
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
					>If you change Invoice Date, Due Date auto-adjusts (+30 days) unless you edit manually.</small
				>
			</div>
		</div>
	</section>

	<section class="panel">
		<header class="panel-header">
			<span class="panel-eyebrow">Branding</span>
			<h2>Logo</h2>
			<p class="panel-subtitle">Optional logo helps your invoice feel polished.</p>
		</header>

		<div class="field">
			<label for="logoUpload">Upload Logo</label>
			<input id="logoUpload" type="file" accept="image/*" onchange={handleFileChange} />
			{#if invoice.logoFilename}
				<small class="loaded-filename">Current: {invoice.logoFilename}</small>
			{/if}
			{#if invoice.logo}
				<FilePreviewComponent file={invoice.logo} />
			{/if}
		</div>
	</section>

	<section class="panel">
		<header class="panel-header">
			<span class="panel-eyebrow">Items</span>
			<h2>Invoice Items</h2>
			<p class="panel-subtitle">Track every product or service going on this invoice.</p>
		</header>

		<div class="items-stack">
			{#each invoice.items as item, index}
				<ItemFormComponent
					{item}
					{index}
					onUpdate={(updatedItem) => updateItem(index, updatedItem)}
				/>
			{/each}
		</div>

		<button type="button" class="add-item-btn" onclick={addItem}>
			<span aria-hidden="true">＋</span>
			Add another line
		</button>
	</section>

	<section class="panel">
		<header class="panel-header">
			<span class="panel-eyebrow">Notes</span>
			<h2>Terms & Notes</h2>
			<p class="panel-subtitle">Clarify payment expectations or leave a personal message.</p>
		</header>

		<TermsAndNotesComponent
			terms={invoice.terms}
			notes={invoice.notes}
			onUpdateTerms={updateTerms}
			onUpdateNotes={updateNotes}
		/>
	</section>

	<section class="panel">
		<header class="panel-header">
			<span class="panel-eyebrow">Payment</span>
			<h2>Totals & Status</h2>
			<p class="panel-subtitle">Keep the running balance up to date.</p>
		</header>

		<div class="summary-section">
			<AmountPaidComponent {updatePaidAmount} amountPaid={invoice.amountPaid} />

			<TotalComponent {invoice} {onUpdateTax} {onUpdateDiscount} {onUpdateShipping} />
		</div>

		<label class="paid-status">
			<input
				type="checkbox"
				onchange={(e) => togglePaidStatus(e.target.checked)}
				checked={invoice.paid}
			/>
			<span class="status-label">Mark invoice as paid</span>
		</label>
	</section>
</form>

<style>
	.invoice-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.75rem 1rem 1rem;
		background: var(--color-bg-primary);
	}

	.panel-header {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.panel-eyebrow {
		font-size: 0.65rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		font-weight: 600;
	}

	.panel-header h2 {
		margin: 0;
		font-size: 1.1rem;
		color: var(--color-text-primary);
	}

	.panel-subtitle {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 0.825rem;
	}

	.field-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 0.65rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.field label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.field input[type='text'],
	.field input[type='date'],
	.field input[type='number'],
	.field input[type='file'] {
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-secondary);
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
		font-size: 0.9rem;
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.field input:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}

	.field input[type='file'] {
		padding: 0.45rem 0.8rem;
		cursor: pointer;
	}

	.field input[type='file']::file-selector-button {
		margin-right: 0.85rem;
		padding: 0.4rem 0.9rem;
		border: none;
		border-radius: var(--radius-sm);
		background: var(--color-accent-blue);
		color: #fff;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.field input[type='file']::file-selector-button:hover {
		background: color-mix(in srgb, var(--color-accent-blue) 85%, black 15%);
	}

	.field-hint {
		color: var(--color-text-secondary);
		font-size: 0.8rem;
		line-height: 1.4;
	}

	.items-stack {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.add-item-btn {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
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

	.summary-section {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}

	.paid-status {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.85rem 1rem;
		border-radius: var(--radius-md);
		background: rgba(59, 130, 246, 0.12);
		border: 1px solid rgba(59, 130, 246, 0.24);
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.paid-status input {
		width: 1.1rem;
		height: 1.1rem;
		accent-color: var(--color-accent-blue);
	}

	.status-label {
		font-size: 0.9rem;
	}

	.loaded-filename {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}

	@media (max-width: 900px) {
		.panel {
			padding: 0.85rem;
			gap: 0.7rem;
		}
	}

	@media (max-width: 640px) {
		.panel {
			padding: 0.8rem;
			border-radius: var(--radius-md);
			gap: 0.65rem;
		}
	}
</style>
