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
			<div class="form-header">
				<h1 class="text-gray-900 dark:text-white">{$_('invoice.edit')}</h1>
				<button
					class="new-invoice-btn inline-block p-2 bg-blue-600 hover:bg-blue-700 text-white rounded mb-6 transition-colors"
					onclick={startNewInvoice}
				>
					{$_('invoice.new')}
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
			<div class="preview-header">
				<h1 class="text-gray-900 dark:text-white">{$_('invoice.preview')}</h1>
				<button
					class="save-pdf-btn inline p-2 mb-6 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
					onclick={saveAsPDF}
					disabled={isGeneratingPDF}
				>
					{#if isGeneratingPDF}
						⏳ {$_('invoice.downloading')}
					{:else}
						{$_('invoice.save_pdf')}
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
		gap: 2rem;
		padding: 2rem;
		position: relative;
	}

	.form-section,
	.preview-section {
		background: var(--color-bg-secondary);
		padding: 1.5rem;
		border-radius: 0.5rem;
		border: 1px solid var(--color-border-primary);
		overflow-y: auto;
		max-height: 90vh;
	}

	h1 {
		font-size: 1.5rem;
		margin-bottom: 1rem;
	}

	.mobile-preview-toggle {
		display: none;
	}

	/* Tablet */
	@media (max-width: 1024px) {
		.page-layout {
			grid-template-columns: 2fr 3fr;
			gap: 1rem;
			padding: 1rem;
		}

		.form-section,
		.preview-section {
			padding: 1rem;
		}
	}

	/* Mobile */
	@media (max-width: 768px) {
		.page-layout {
			grid-template-columns: 1fr;
			padding: 1rem;
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
			border-radius: 9999px;
			box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
			font-weight: 500;
			transition: all 0.2s;
		}

		.mobile-preview-toggle:hover {
			background: #2563eb;
			box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
		}

		.form-section {
			max-height: none;
		}
	}
</style>
