<script>
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import InvoiceFormComponent from '$components/InvoiceFormComponent.svelte';
	import InvoicePreviewComponent from '$components/InvoicePreviewComponent.svelte';
	import TemplateSelector from '$components/TemplateSelector.svelte';
	import { saveInvoice, getAllInvoices, getInvoice } from '$lib/db.js';
	import { v4 as uuidv4 } from 'uuid';
	import { totalAmounts  } from '$lib/InvoiceCalculator.js';

	export const prerender = true;

	let invoice = $state(null); // Initialize invoice state as null
	let previewRef = $state(null); // Reference for the preview section
	let isGeneratingPDF = $state(false); // State to track PDF generation status
	let showMobilePreview = $state(false); // Track mobile preview visibility
	let activeTab = $state('edit'); // Track active tab: 'edit' or 'preview'

	let userEditedDueDate = $state(false); // Track if user has edited the due date
	let showSaveDraftModal = $state(false); // Track save draft modal visibility
	let draftName = $state(''); // Track draft name input

	const createNewInvoice = () => ({
		id: uuidv4(),
		invoiceLabel: 'INVOICE',
		invoiceNumber: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
		logo: '/logo.png',
		logoFilename: 'logo.png',
		invoiceFrom: '',
		invoiceTo: '',
		date: new Date().toISOString().split('T')[0],
		dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
		items: [{ name: '', quantity: 1, price: 0, amount: 0 }],
		amountPaid: 0,
		terms: '',
		notes: '',
		discount: { type: 'flat', rate: 0 },
		tax: { type: 'flat', rate: 0 },
		shipping: { amount: 0 },
		paid: false,
		archived: false,
		draft: true,
		draftName: '',
		total: 0,
		subTotal: 0,
		balanceDue: 0
	});

	const startNewInvoice = () => {
		invoice = createNewInvoice();
	};

	const saveAsPDF = async () => {
		if (typeof window === 'undefined' || !previewRef) return;

		isGeneratingPDF = true; // 👈 start loading

		try {
			// Wait for images to load
			const images = previewRef?.querySelectorAll('img');
			await Promise.all(
				Array.from(images).map((img) => {
					if (img.complete) return Promise.resolve();
					return new Promise((resolve) => {
						img.onload = resolve;
						img.onerror = resolve;
					});
				})
			);

			const html2pdf = (await import('html2pdf.js')).default;

			await html2pdf()
				.from(previewRef)
				.set({
					margin: 0.5,
					filename: `invoice-${invoice.invoiceTo || 'unknown'}.pdf`,
					html2canvas: {
						scale: 3,
						useCORS: true
					},
					jsPDF: {
						unit: 'in',
						format: 'letter',
						orientation: 'portrait'
					}
				})
				.save();
		} catch (error) {
			console.error('Failed to export PDF:', error);
		} finally {
			isGeneratingPDF = false; // 👈 stop loading
		}
	};

	onMount(async () => {
		const invoicesFromDb = await getAllInvoices();
		let loadedInvoice = null;

		if (typeof window !== 'undefined') {
			const currentUrl = new URL(window.location.href);
			const invoiceIdFromQuery = currentUrl.searchParams.get('invoice');

			if (invoiceIdFromQuery) {
				const storedInvoice = await getInvoice(invoiceIdFromQuery);
				if (storedInvoice) {
					loadedInvoice = storedInvoice;
					if (!loadedInvoice.id) {
						loadedInvoice.id = invoiceIdFromQuery;
					}
				}

				currentUrl.searchParams.delete('invoice');
				const cleanUrl = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
				window.history.replaceState({}, '', cleanUrl);
			}
		}

		if (!loadedInvoice && invoicesFromDb.length > 0) {
			const latestInvoiceEntry = invoicesFromDb[invoicesFromDb.length - 1];
			loadedInvoice = latestInvoiceEntry.invoice;
		}

		invoice = loadedInvoice ?? createNewInvoice();

		if (!invoice.id) {
			invoice.id = uuidv4();
		}
		if (!invoice.logo) {
			invoice.logo = '/logo.png';
			invoice.logoFilename = 'logo.png';
		}
		if (!invoice.invoiceLabel) {
			invoice.invoiceLabel = 'INVOICE';
		}
		if (invoice.draft === undefined || invoice.draft === null) {
			invoice.draft = true;
		}
	});

	$effect(() => {
		if (invoice && invoice.id) {
			saveInvoice(invoice.id, invoice);
		}
		if (invoice && invoice.items) {
			invoice.subTotal = invoice.items.reduce(
				(sum, item) => sum + (item.amount ?? (item.price || 0) * (item.quantity || 0)),
				0
			);
			invoice.total = totalAmounts(invoice, invoice.subTotal);
			invoice.balanceDue = invoice.total - (invoice.amountPaid || 0);
		}
	});

	const updateInvoiceItems = (index, updatedItem) => {
		invoice.items[index] = updatedItem;
	};
	const addInvoiceItem = () => {
		invoice.items = [...invoice.items, { name: '', quantity: 1, price: 0, amount: 0 }];
	};
	const updateInvoiceTerms = (newTerms = '') => {
		invoice.terms = newTerms;
	};
	const updateInvoiceNotes = (newNotes = '') => {
		invoice.notes = newNotes;
	};
	const updateInvoicePaidAmount = (amountPaid = 0) => {
		invoice.amountPaid = amountPaid;
	};
	const handleInvoiceDateChange = (e) => {
		invoice.date = e.target.value;
		if (!userEditedDueDate) {
			const newDueDate = new Date(invoice.date);
			newDueDate.setDate(newDueDate.getDate() + 30);
			invoice.dueDate = newDueDate.toISOString().split('T')[0];
		}
	};
	const handleDueDateChange = (e) => {
		invoice.dueDate = e.target.value;
		userEditedDueDate = true;
	};

	const onUpdateTax = (newTax) => {
		invoice.tax = newTax;
	};
	const onUpdateDiscount = (newDiscount) => {
		invoice.discount = newDiscount;
	};

	const onUpdateShipping = (newShipping) => {
		invoice.shipping = newShipping;
	};

	const onUpdateLogo = (newFile) => {
		if (newFile instanceof File || newFile === null) {
			invoice.logo = newFile;
		} else {
			invoice.logo = null; // Handle explicit clearing of the logo
			console.warn('onUpdateLogo received an unexpected type for newFile:', newFile);
		}
	};
	const togglePaidStatus = (newStatus) => {
		invoice.paid = Boolean(newStatus);
	}
	const onInvoiceToInput = (e) => {
		invoice.invoiceTo = e.target.value;
	};
	const onInvoiceFromInput = (e) => {
		invoice.invoiceFrom = e.target.value;
	};
	const onInvoiceNumberInput = (e) => {
		invoice.invoiceNumber = e.target.value;
	};
	const onInvoiceLabelInput = (e) => {
		invoice.invoiceLabel = e.target.value;
	};
	const openSaveDraftModal = () => {
		// Pre-fill with invoice label + number
		draftName = `${invoice.invoiceLabel || 'INVOICE'} ${invoice.invoiceNumber || ''}`.trim();
		showSaveDraftModal = true;
	};
	const closeSaveDraftModal = () => {
		showSaveDraftModal = false;
		draftName = '';
	};
	const saveDraftAndRedirect = async () => {
		// Update invoice with draft name and mark as draft
		invoice.draft = true;
		invoice.draftName = draftName.trim();

		// Save to IndexedDB (happens automatically via $effect, but we'll ensure it)
		await saveInvoice(invoice.id, invoice);

		// Close modal
		closeSaveDraftModal();

		// Redirect to saved invoices page
		if (typeof window !== 'undefined') {
			window.location.href = '/saved-invoices';
		}
	};

</script>
{#if invoice}
	<div class="page-layout">
		<div class="page-toolbar">
			<!-- Tab Navigation -->
			<div class="tab-navigation">
				<button
					class="tab-button"
					class:active={activeTab === 'edit'}
					onclick={() => (activeTab = 'edit')}
				>
					<svg class="tab-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v4A1.5 1.5 0 0 0 2.5 10h6A1.5 1.5 0 0 0 10 8.5v-4A1.5 1.5 0 0 0 8.5 3h-6Zm9 0A1.5 1.5 0 0 0 10 4.5v4A1.5 1.5 0 0 0 11.5 10h6A1.5 1.5 0 0 0 19 8.5v-4A1.5 1.5 0 0 0 17.5 3h-6Zm-9 7A1.5 1.5 0 0 0 1 11.5v4A1.5 1.5 0 0 0 2.5 17h6A1.5 1.5 0 0 0 10 15.5v-4A1.5 1.5 0 0 0 8.5 10h-6Zm9 0a1.5 1.5 0 0 0-1.5 1.5v4a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5v-4a1.5 1.5 0 0 0-1.5-1.5h-6Z" />
					</svg>
					Edit
				</button>
				<button
					class="tab-button"
					class:active={activeTab === 'preview'}
					onclick={() => (activeTab = 'preview')}
				>
					<svg class="tab-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
						<path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd" />
					</svg>
					Preview
				</button>
			</div>

			<TemplateSelector />
		</div>

		<!-- Edit View -->
		{#if activeTab === 'edit'}
			<div class="content-section form-section">
				<div class="sticky-button-wrapper">
					<div class="button-group">
						<button
							class="action-button save-draft-button"
							title="Save Draft"
							onclick={openSaveDraftModal}
						>
							<svg class="icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
								<path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
								<path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
							</svg>
							Save Draft
						</button>
						<button
							class="icon-button form-action"
							aria-label={$_('invoice.new')}
							title={$_('invoice.new')}
							onclick={startNewInvoice}
						>
							<svg class="icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
								<path
									fill-rule="evenodd"
									d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="sr-only">{$_('invoice.new')}</span>
						</button>
					</div>
				</div>

				<InvoiceFormComponent
					{invoice}
					{updateInvoiceItems}
					{addInvoiceItem}
					{updateInvoiceTerms}
					{updateInvoiceNotes}
					{updateInvoicePaidAmount}
					{handleInvoiceDateChange}
					{handleDueDateChange}
					{onUpdateTax}
					{onUpdateDiscount}
					{onUpdateShipping}
					{onUpdateLogo}
					{togglePaidStatus}
					{onInvoiceToInput}
					{onInvoiceFromInput}
					{onInvoiceNumberInput}
					{onInvoiceLabelInput}
				/>
			</div>
		{/if}

		<!-- Preview View -->
		{#if activeTab === 'preview'}
			<div class="content-section preview-section">
				<div class="sticky-button-wrapper">
					<button
						class="icon-button preview-action"
						aria-label={$_('invoice.save_pdf')}
						title={$_('invoice.save_pdf')}
						onclick={saveAsPDF}
						disabled={isGeneratingPDF}
					>
						{#if isGeneratingPDF}
							<svg class="icon spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
								<circle
									cx="12"
									cy="12"
									r="9"
									stroke-width="2"
									stroke-dasharray="45 15"
									stroke-dashoffset="0"
									stroke-linecap="round"
								/>
							</svg>
							<span class="sr-only">{$_('invoice.downloading')}</span>
						{:else}
							<svg class="icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
								<path
									fill-rule="evenodd"
									d="M10 2a1 1 0 0 1 1 1v7.586l1.293-1.293a1 1 0 0 1 1.414 1.414l-3.006 3.006a1 1 0 0 1-1.414 0L6.28 10.707a1 1 0 0 1 1.414-1.414L9 10.586V3a1 1 0 0 1 1-1Zm-6 12a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Zm1 3a1 1 0 1 0 0 2h10a1 1 0 1 0 0-2H5Z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="sr-only">{$_('invoice.save_pdf')}</span>
						{/if}
					</button>
				</div>

				<div bind:this={previewRef}>
					<InvoicePreviewComponent {invoice} />
				</div>
			</div>
		{/if}
	</div>
{:else}
	<p class="text-center py-8 text-gray-600 dark:text-gray-400">Loading...</p>
{/if}

<!-- Save Draft Modal -->
{#if showSaveDraftModal}
	<div class="modal-backdrop" onclick={closeSaveDraftModal}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2 class="modal-title">Save Draft</h2>
			<p class="modal-description">Give your draft a name (optional)</p>

			<input
				type="text"
				class="modal-input"
				placeholder="Draft name"
				bind:value={draftName}
				onkeydown={(e) => e.key === 'Enter' && saveDraftAndRedirect()}
			/>

			<div class="modal-actions">
				<button class="modal-button cancel-button" onclick={closeSaveDraftModal}>
					Cancel
				</button>
				<button class="modal-button save-button" onclick={saveDraftAndRedirect}>
					Save
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.page-layout {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.5rem 1.5rem 1.25rem 1.5rem;
		position: relative;
		max-width: 1400px;
		margin: 0 auto;
	}

	.page-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.tab-navigation {
		display: flex;
		gap: 0.375rem;
		background: var(--color-bg-secondary);
		padding: 0.25rem;
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-primary);
		width: fit-content;
	}

	.tab-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-radius: calc(var(--radius-lg) - 0.25rem);
		font-weight: 500;
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
	}

	.tab-button:hover {
		color: var(--color-text-primary);
		background: var(--color-bg-tertiary);
	}

	.tab-button.active {
		color: var(--color-text-primary);
		background: var(--color-bg-primary);
		box-shadow: var(--shadow-soft);
	}

	.tab-icon {
		width: 1.125rem;
		height: 1.125rem;
	}

	.content-section {
		--section-padding: 0.875rem;
		--section-radius: var(--radius-lg);
		background: var(--color-bg-primary);
		padding: var(--section-padding);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-primary);
		overflow: visible;
		position: relative;
	}

	.icon-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: var(--radius-pill);
		border: 1px solid transparent;
		background-color: var(--color-accent, #2563eb);
		color: var(--color-accent-contrast, #ffffff);
		box-shadow: var(--shadow-soft);
		cursor: pointer;
		transition: background-color 0.2s ease, border-color 0.2s ease;
		position: relative;
	}

	.icon-button:disabled {
		cursor: not-allowed;
		opacity: 0.7;
		box-shadow: none;
	}

	.icon-button:not(:disabled):hover {
		border-color: color-mix(in srgb, var(--color-accent, #2563eb) 30%, transparent 70%);
	}

	.icon-button:focus-visible {
		outline: none;
		box-shadow: var(--shadow-focus);
	}

	.icon {
		width: 1.25rem;
		height: 1.25rem;
	}

	.spin {
		animation: spin 0.9s linear infinite;
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
		border: 0;
	}

	.sticky-button-wrapper {
		position: absolute;
		top: 0;
		right: 0;
		z-index: 10;
		pointer-events: none;
		flex-shrink: 0;
		height: 0;
	}

	.sticky-button-wrapper .button-group {
		pointer-events: all;
		display: flex;
		gap: 0.5rem;
		align-items: center;
		transform: translate(25%, -25%);
	}

	.sticky-button-wrapper .icon-button {
		pointer-events: all;
		transform: none;
	}

	.action-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		padding: 0.5rem 1rem;
		border-radius: var(--radius-pill);
		border: 1px solid transparent;
		font-weight: 500;
		font-size: 0.875rem;
		box-shadow: var(--shadow-soft);
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.save-draft-button {
		background-color: #3b82f6;
		color: white;
	}

	.save-draft-button:hover {
		background-color: #2563eb;
		border-color: rgba(59, 130, 246, 0.3);
	}

	.action-button:focus-visible {
		outline: none;
		box-shadow: var(--shadow-focus);
	}

	.action-button .icon {
		width: 1rem;
		height: 1rem;
	}

	:global(.invoice-form) {
		padding-top: 0.5rem;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	/* Tablet */
	@media (max-width: 1024px) {
		.page-layout {
			padding: 1.1rem;
		}

		.content-section {
			--section-padding: 0.9rem;
		}
	}

	/* Mobile */
	@media (max-width: 768px) {
		.page-layout {
			padding: 0.85rem;
			gap: 0.75rem;
		}

		.tab-navigation {
			width: 100%;
		}

		.tab-button {
			flex: 1;
			justify-content: center;
			padding: 0.75rem 1rem;
			font-size: 0.875rem;
		}

		.content-section {
			--section-padding: 0.85rem;
		}

		.sticky-button-wrapper .button-group {
			flex-direction: column;
			gap: 0.25rem;
		}

		.action-button {
			font-size: 0.75rem;
			padding: 0.375rem 0.75rem;
		}
	}

	/* Modal Styles */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
		backdrop-filter: blur(2px);
	}

	.modal {
		background: var(--color-bg-primary);
		padding: 2rem;
		border-radius: var(--radius-lg);
		max-width: 450px;
		width: 90%;
		border: 1px solid var(--color-border-primary);
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
	}

	.modal-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.5rem 0;
	}

	.modal-description {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin: 0 0 1.5rem 0;
	}

	.modal-input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
		font-size: 0.9375rem;
		margin-bottom: 1.5rem;
		transition: border-color 0.2s ease;
	}

	.modal-input:focus {
		outline: none;
		border-color: var(--color-accent, #3b82f6);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
	}

	.modal-button {
		padding: 0.625rem 1.25rem;
		border-radius: var(--radius-md);
		font-weight: 500;
		font-size: 0.9375rem;
		border: 1px solid transparent;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.cancel-button {
		background-color: var(--color-bg-secondary);
		color: var(--color-text-secondary);
		border-color: var(--color-border-primary);
	}

	.cancel-button:hover {
		background-color: var(--color-bg-tertiary);
		color: var(--color-text-primary);
	}

	.save-button {
		background-color: #3b82f6;
		color: white;
	}

	.save-button:hover {
		background-color: #2563eb;
	}

	.save-button:focus-visible,
	.cancel-button:focus-visible {
		outline: none;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
	}

	@media (max-width: 768px) {
		.modal {
			padding: 1.5rem;
		}

		.modal-actions {
			flex-direction: column;
		}

		.modal-button {
			width: 100%;
		}
	}
</style>
