<script>
	import { onMount } from 'svelte';
	import InvoiceFormComponent from '$components/InvoiceFormComponent.svelte';
	import InvoicePreviewComponent from '$components/InvoicePreviewComponent.svelte';
	import { saveInvoice, getAllInvoices } from '$lib/db.js';
	import { v4 as uuidv4 } from 'uuid';

	export const prerender = true;

	let invoice = null;
	let previewRef;
	let isGeneratingPDF = false;

	const createNewInvoice = () => ({
		id: uuidv4(),
        invoiceNumber: `INV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`,
		logo: null,
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
		shipping: { amount: 0 }
	});

	const startNewInvoice = () => {
		invoice = createNewInvoice();
	};

	const saveAsPDF = async () => {
		if (typeof window === 'undefined' || !previewRef) return;

		isGeneratingPDF = true; // 👈 start loading

		try {
			// Wait for images to load
			const images = previewRef.querySelectorAll('img');
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
		const invoices = await getAllInvoices();
		if (invoices.length > 0) {
			// Load the latest invoice by created order (simple pick last)
			const { invoice: latestInvoice } = invoices[invoices.length - 1];
			invoice = latestInvoice;
		} else {
			invoice = createNewInvoice();
		}
	});

	$: if (invoice && invoice.id) {
		saveInvoice(invoice.id, invoice);
	}
</script>

{#if invoice}
	<div class="page-layout">
		<div class="form-section">
			<div class="form-header">
				<h1>Edit Invoice</h1>
				<button class="new-invoice-btn" on:click={startNewInvoice}>New Invoice</button>
			</div>

			<InvoiceFormComponent bind:invoice />
		</div>

		<div class="preview-section">
			<div class="preview-header">
				<h1>Preview Invoice</h1>
				<button class="save-pdf-btn" on:click={saveAsPDF} disabled={isGeneratingPDF}>
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
