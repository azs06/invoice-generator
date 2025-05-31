<script>
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import InvoiceFormComponent from '$components/InvoiceFormComponent.svelte';
	import InvoicePreviewComponent from '$components/InvoicePreviewComponent.svelte';
	import { saveInvoice, getAllInvoices } from '$lib/db.js';
	import { v4 as uuidv4 } from 'uuid';
	import { defaultInvoice } from '$lib/index.js';
	import { totalAmounts } from '../lib/InvoiceCalculator.js';

	export const prerender = true;

	let invoice = $state(null); // Initialize invoice state as null
	let previewRef = $state(null); // Reference for the preview section
	let isGeneratingPDF = $state(false); // State to track PDF generation status

	// SEO related derived values
	const pageUrl = $derived(page.url.href);
	const siteName = 'Free Invoice Generator';
	const baseDescription =
		'Easily create, customize, and manage professional invoices for free. Download as PDF and get paid faster.';
	const ogImageUrl = $derived(() => {
		if (invoice && invoice.logo && typeof invoice.logo === 'string') {
			return invoice.logo; // Use invoice logo if it's a data URL
		}
		return `${page.url.origin}/og-image.png`; // Fallback to a generic OG image
	});

	const pageTitle = $derived(
		invoice && invoice.id && invoice.invoiceNumber
			? `Editing Invoice ${invoice.invoiceNumber} | ${siteName}`
			: `${siteName} - Create & Manage Invoices`
	);
	const pageDescription = $derived(
		invoice && invoice.id && invoice.invoiceTo
			? `Editing invoice for ${invoice.invoiceTo}. ${baseDescription}`
			: baseDescription
	);

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
			// If newFile is null (removing logo), newFile.name would error.
			invoice.logo = newFile;
			invoice.logoFilename = newFile ? newFile.name : null;
		} else {
			invoice.logo = null; // Handle explicit clearing of the logo
			invoice.logoFilename = null;
			console.warn('onUpdateLogo received an unexpected type for newFile:', newFile);
		}
	};
	const togglePaidStatus = (newStatus) => {
		invoice.paid = Boolean(newStatus);
	};
	const onInvoiceToInput = (e) => {
		invoice.invoiceTo = e.target.value;
	};
	const onInvoiceFromInput = (e) => {
		invoice.invoiceFrom = e.target.value;
	};
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={pageDescription} />
	<link rel="canonical" href={pageUrl} />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content={pageUrl} />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={pageDescription} />
	<meta property="og:image" content={ogImageUrl()} />

	<!-- Twitter -->
	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:url" content={pageUrl} />
	<meta property="twitter:title" content={pageTitle} />
	<meta property="twitter:description" content={pageDescription} />
	<meta property="twitter:image" content={ogImageUrl()} />
</svelte:head>
{#if invoice}
	<div class="page-layout">
		<div class="form-section">
			<div class="form-header">
				<h1>Edit Invoice</h1>
				<button
					class="new-invoice-btn inline-block p-2 bg-blue-600 text-white rounded mb-6"
					onclick={startNewInvoice}>New Invoice</button
				>
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

		<div class="preview-section">
			<div class="preview-header">
				<h1>Preview Invoice</h1>
				<button
					class="save-pdf-btn inline p-2 mb-6 bg-blue-600 text-white rounded"
					onclick={saveAsPDF}
					disabled={isGeneratingPDF}
				>
					{#if isGeneratingPDF}
						⏳ Downloading...
					{:else}
						Save as PDF
					{/if}
				</button>
			</div>

			<div bind:this={previewRef}>
				<InvoicePreviewComponent {invoice} />
			</div>
		</div>
	</div>
{:else}
	<p>Loading...</p>
{/if}

<style>
	.page-layout {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		padding: 2rem;
	}
	.form-section,
	.preview-section {
		background: #f9fafb;
		padding: 1.5rem;
		border-radius: 0.5rem;
		border: 1px solid #e5e7eb;
		overflow-y: auto;
		max-height: 90vh;
	}
	h1 {
		font-size: 1.5rem;
		margin-bottom: 1rem;
	}
</style>
