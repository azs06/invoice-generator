<script>
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import InvoiceFormComponent from '$components/InvoiceFormComponent.svelte';
	import InvoicePreviewComponent from '$components/InvoicePreviewComponent.svelte';
	import { saveInvoice, getAllInvoices } from '$lib/db.js';
	import { v4 as uuidv4 } from 'uuid';
	import { totalAmounts  } from '$lib/InvoiceCalculator.js';

	export const prerender = true;

	let invoice = $state(null); // Initialize invoice state as null
	let previewRef = $state(null); // Reference for the preview section
	let isGeneratingPDF = $state(false); // State to track PDF generation status
	let showMobilePreview = $state(false); // Track mobile preview visibility

	let userEditedDueDate = $state(false); // Track if user has edited the due date

	const createNewInvoice = () => ({
		id: uuidv4(),
		invoiceNumber: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
		logo: null,
		logoFilename: null,
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
		if (invoicesFromDb.length > 0) {
			// Load the latest invoice by created order (simple pick last)
			// Ensure we are getting the actual invoice data object
			const latestInvoiceEntry = invoicesFromDb[invoicesFromDb.length - 1];
			invoice = latestInvoiceEntry.invoice; // Assuming getAllInvoices returns {id, invoice}
		} else {
			// No invoices in DB, so create a new one
			invoice = createNewInvoice();
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

</script>
{#if invoice}
	<div class="page-layout">
		<div class="form-section">
			<div class="sticky-button-wrapper">
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
			/>
		</div>

		<div class="preview-section" class:mobile-preview-open={showMobilePreview}>
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

		<!-- Mobile preview toggle button -->
		<button
			class="mobile-preview-toggle"
			onclick={() => (showMobilePreview = !showMobilePreview)}
		>
			{#if showMobilePreview}
				Close Preview
			{:else}
				Show Preview
			{/if}
		</button>
	</div>
{:else}
	<p class="text-center py-8 text-gray-600 dark:text-gray-400">Loading...</p>
{/if}

<style>
	.page-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.1rem;
		padding: 2.5rem 1.25rem 1.25rem 1.25rem;
		position: relative;
	}

	.form-section,
	.preview-section {
		--section-padding: 1rem;
		--section-radius: var(--radius-lg);
		background: var(--color-bg-primary);
		padding: var(--section-padding);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-primary);
		overflow: visible;
		position: relative;
		display: flex;
		flex-direction: column;
		max-height: 90vh;
	}

	.form-section > :global(:not(.sticky-button-wrapper)),
	.preview-section > :global(div:not(.sticky-button-wrapper)) {
		overflow-y: auto;
		flex: 1;
		min-height: 0;
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

	.sticky-button-wrapper .icon-button {
		pointer-events: all;
		transform: translate(25%, -25%);
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

	.mobile-preview-toggle {
		display: none;
	}

	/* Tablet */
	@media (max-width: 1024px) {
		.page-layout {
			grid-template-columns: 2fr 3fr;
			gap: 0.9rem;
			padding: 1.1rem;
		}

		.form-section,
		.preview-section {
			--section-padding: 0.9rem;
		}
	}

	/* Mobile */
	@media (max-width: 768px) {
		.page-layout {
			grid-template-columns: 1fr;
			padding: 0.85rem;
		}

		.form-section {
			--section-padding: 0.85rem;
		}

		.preview-section {
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			z-index: 50;
			max-height: 100vh;
			transform: translateY(100%);
			transition: transform 0.3s ease;
			border-radius: 0;
			--section-radius: 0;
			--section-padding: 1.1rem;
		}

		.preview-section.mobile-preview-open {
			transform: translateY(0);
		}

		.mobile-preview-toggle {
			display: block;
			position: fixed;
			bottom: 1rem;
			right: 1rem;
			z-index: 40;
			padding: 0.75rem 1.5rem;
			background: #3b82f6;
			color: white;
			border-radius: var(--radius-pill);
			box-shadow: var(--shadow-soft);
			font-weight: 500;
			transition: background-color 0.2s ease, box-shadow 0.2s ease;
		}

		.mobile-preview-toggle:hover {
			background: #2563eb;
			box-shadow: var(--shadow-soft);
		}

		.form-section {
			max-height: none;
		}
	}
</style>
