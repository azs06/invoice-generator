<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import InvoiceFormComponent from '$components/InvoiceFormComponent.svelte';
	import InvoicePreviewWrapper from '$components/InvoicePreviewWrapper.svelte';
	import TemplateSelector from '$components/TemplateSelector.svelte';
	import SignUpPromptModal from '$components/SignUpPromptModal.svelte';
	import CurrencySelector from '$components/CurrencySelector.svelte';
	import LanguageSelector from '$components/LanguageSelector.svelte';
	import AIChatInput from '$components/AIChatInput.svelte';
	import { saveInvoice, getAllInvoices, getInvoice, getInvoiceUsage } from '$lib/db.js';
	import { DEFAULT_LOGO_PATH } from '$lib/index.js';
	import { v4 as uuidv4 } from 'uuid';
	import { totalAmounts } from '$lib/InvoiceCalculator.js';
	import { runMigrationIfNeeded } from '$lib/templates/migration.js';
	import { selectedTemplateId, setTemplateId } from '../stores/templateStore.js';
	import type { InvoiceData, InvoiceItem, MonetaryAdjustment, ShippingInfo } from '$lib/types';
	import type { ParsedInvoice } from '$lib/server/ai';
	import { authClient } from '$lib/auth';

	type PDFAction = 'download' | 'print' | null;
	type TabName = 'edit' | 'preview';

	let invoice = $state<InvoiceData | null>(null);
	let previewRef = $state<HTMLElement | null>(null);
	let isGeneratingPDF = $state<boolean>(false);
	let pdfAction = $state<PDFAction>(null);
	let showMobilePreview = $state<boolean>(false);
	let activeTab = $state<TabName>('edit');
	const validTabs = new Set<string>(['edit', 'preview']);

	let userEditedDueDate = $state<boolean>(false);
	let showSaveDraftModal = $state<boolean>(false);
	let draftName = $state<string>('');

	let usage = $state<{ count: number; limit: number }>({ count: 0, limit: 12 });
	let showLimitWarning = $state<boolean>(false);
	let showSignUpPrompt = $state<boolean>(false);

	const createNewInvoice = (): InvoiceData => ({
		id: uuidv4(),
		invoiceLabel: 'INVOICE',
		invoiceNumber: `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
		logo: DEFAULT_LOGO_PATH,
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
		balanceDue: 0,
		templateId: 'modern'
	});

	const ensureInvoice = (): InvoiceData => {
		if (!invoice) {
			invoice = createNewInvoice();
		}
		return invoice;
	};

	const startNewInvoice = (): void => {
		invoice = createNewInvoice();
	};

	const setActiveTab = (tab: string): void => {
		if (!validTabs.has(tab)) {
			return;
		}

		activeTab = tab as TabName;

		if (typeof window !== 'undefined') {
			const { pathname, search, hash } = window.location;
			const nextHash = `#${tab}`;

			if (hash !== nextHash) {
				window.history.replaceState({}, '', `${pathname}${search}${nextHash}`);
			}
		}
	};

	const syncTabFromHash = (): void => {
		if (typeof window === 'undefined') {
			return;
		}

		const hashValue = window.location.hash?.slice(1).toLowerCase();

		if (validTabs.has(hashValue)) {
			activeTab = hashValue as TabName;
		}
	};

	const waitForPreviewImages = async (): Promise<void> => {
		if (!previewRef) {
			return;
		}

		const images = Array.from(previewRef.querySelectorAll('img'));

		if (images.length === 0) {
			return;
		}

		await Promise.all(
			images.map((img) => {
				if (img.complete) {
					return Promise.resolve();
				}
				return new Promise((resolve) => {
					img.onload = resolve;
					img.onerror = resolve;
				});
			})
		);
	};

	const session = authClient.useSession();

	const saveAsPDF = async (): Promise<void> => {
		const currentInvoice = invoice;
		if (typeof window === 'undefined' || !previewRef || !currentInvoice) {
			return;
		}

		// For guests, show sign-up prompt once per session
		if (!$session.data) {
			const dismissed = sessionStorage.getItem('dismissedSignUpPrompt');
			if (!dismissed) {
				showSignUpPrompt = true;
				return;
			}
		}

		await generateAndDownloadPDF();
	};

	const generateAndDownloadPDF = async (): Promise<void> => {
		const currentInvoice = invoice;
		if (typeof window === 'undefined' || !previewRef || !currentInvoice) {
			return;
		}

		isGeneratingPDF = true;
		pdfAction = 'download';

		try {
			await waitForPreviewImages();

			if ($session.data) {
				// Server-side generation for logged-in users
				// Clone the preview element to avoid modifying the original
				const clone = previewRef.cloneNode(true) as HTMLElement;

				// Convert images to base64 to ensure they render in the PDF
				const images = clone.querySelectorAll('img');
				for (const img of images) {
					if (img.src && !img.src.startsWith('data:')) {
						try {
							const response = await fetch(img.src);
							const blob = await response.blob();
							const base64 = await new Promise<string>((resolve) => {
								const reader = new FileReader();
								reader.onloadend = () => resolve(reader.result as string);
								reader.readAsDataURL(blob);
							});
							img.src = base64;
						} catch {
							// Keep original src if conversion fails
						}
					}
				}

				// Build a minimal, self-contained HTML document
				const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
/* Reset and base styles */
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	background: white; 
	padding: 20px;
	color: #111827;
	-webkit-print-color-adjust: exact;
	print-color-adjust: exact;
}

/* Invoice template styles */
.invoice-preview {
	--radius-lg: 0.75rem;
	--radius-md: 0.5rem;
	--color-bg-primary: #ffffff;
	--color-bg-secondary: #f9fafb;
	--color-text-primary: #111827;
	--color-text-secondary: #6b7280;
	--color-border-primary: #e5e7eb;
	--color-accent-blue: #2563eb;
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
	padding: 2rem;
	background: white;
	max-width: 800px;
	margin: 0 auto;
}

.preview-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1.25rem; padding-bottom: 1rem; }
.brand { display: flex; align-items: center; }
.logo-shell { max-width: 150px; height: auto; }
.logo-shell img { width: 100%; height: auto; object-fit: contain; }
.invoice-title-section { display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem; }
.invoice-title { display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; }
.invoice-label { font-size: 2rem; font-weight: 300; letter-spacing: 0.02em; }
.invoice-number { font-size: 1rem; color: #6b7280; }
.status-text { font-size: 0.85rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
.status-text.due { color: #c2410c; }
.status-text.partial { color: #2563eb; }
.status-text.settled, .status-text.credit { color: #047857; }

.details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; padding: 1.5rem 0; }
.details-column { display: flex; flex-direction: column; gap: 0.75rem; }
.right-column { align-items: flex-end; text-align: right; }
.details-block { display: flex; flex-direction: column; gap: 0.25rem; }
.from-section { margin-top: 0.5rem; padding-top: 0.75rem; border-top: 1px solid #e5e7eb; }
.details-label { font-size: 0.8125rem; font-weight: 600; color: #6b7280; }
.details-value { font-size: 0.95rem; word-break: break-word; white-space: pre-wrap; }
.balance-due-highlight { margin-top: 0.5rem; padding: 0.75rem 1rem; background: #f9fafb; border-radius: 0.5rem; display: flex; flex-direction: column; gap: 0.35rem; align-items: flex-end; }
.balance-label { font-size: 0.8rem; font-weight: 600; color: #6b7280; }
.balance-amount { font-size: 1.5rem; font-weight: 700; }

.items-card { border-radius: 0.5rem; overflow: hidden; border: 1px solid #e5e7eb; }
.items-table { width: 100%; border-collapse: collapse; background: white; }
.items-table th { text-align: left; font-size: 0.8rem; font-weight: 600; padding: 0.85rem 1rem; background: #f3f4f6; }
.items-table th:last-child, .items-table td:last-child { text-align: right; }
.items-table td { padding: 0.75rem 1rem; font-size: 0.95rem; border-bottom: 1px solid #e5e7eb; }
.items-table tbody tr:last-child td { border-bottom: none; }

.summary { display: flex; justify-content: flex-end; }
.summary-table { width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 0.5rem; }
.summary-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; padding: 0.4rem 0; }
.summary-row span:first-child { color: #6b7280; }
.summary-row.emphasize { font-weight: 700; font-size: 1.05rem; padding-top: 0.75rem; border-top: 1px solid #e5e7eb; }
.summary-row.emphasize span:first-child { color: #111827; }

.notes-section { padding: 1.25rem 0; border-top: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: 0.5rem; }
.notes-section p { margin: 0; font-size: 0.95rem; white-space: pre-wrap; line-height: 1.6; }
</style>
</head>
<body>
${clone.innerHTML}
</body>
</html>`;

				const response = await fetch('/api/pdf', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ html: htmlContent, invoiceId: currentInvoice.id })
				});

				if (!response.ok) {
					throw new Error('Failed to generate PDF server-side');
				}

				const blob = await response.blob();
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `invoice-${currentInvoice.invoiceTo || 'unknown'}.pdf`;
				document.body.appendChild(a);
				a.click();
				window.URL.revokeObjectURL(url);
				document.body.removeChild(a);
			} else {
				// Client-side generation for guests
				const html2pdf = (await import('html2pdf.js')).default;

				await html2pdf()
					.from(previewRef)
					.set({
						margin: 0.5,
						filename: `invoice-${currentInvoice.invoiceTo || 'unknown'}.pdf`,
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
			}
		} catch (error) {
			console.error('Failed to export PDF:', error);
			alert('Failed to generate PDF. Please try again.');
		} finally {
			isGeneratingPDF = false;
			pdfAction = null;
		}
	};

	const handleContinueBasicDownload = (): void => {
		showSignUpPrompt = false;
		generateAndDownloadPDF();
	};

	const closeSignUpPrompt = (): void => {
		showSignUpPrompt = false;
	};

	const printPDF = async (): Promise<void> => {
		const currentInvoice = invoice;
		if (typeof window === 'undefined' || !previewRef || !currentInvoice) {
			return;
		}

		isGeneratingPDF = true;
		pdfAction = 'print';

		try {
			await waitForPreviewImages();

			const html2pdf = (await import('html2pdf.js')).default;
			const worker = html2pdf()
				.from(previewRef)
				.set({
					margin: 0.5,
					filename: `invoice-${currentInvoice.invoiceTo || 'unknown'}.pdf`,
					html2canvas: {
						scale: 3,
						useCORS: true
					},
					jsPDF: {
						unit: 'in',
						format: 'letter',
						orientation: 'portrait'
					}
				});

			const pdfInstance = await worker.toPdf().get('pdf');
			pdfInstance.autoPrint();

			const blobUrl = pdfInstance.output('bloburl');
			const printWindow = window.open(blobUrl, '_blank');

			if (!printWindow) {
				pdfInstance.output('dataurlnewwindow');
			}
		} catch (error) {
			console.error('Failed to print PDF:', error);
		} finally {
			isGeneratingPDF = false;
			pdfAction = null;
		}
	};

	onMount(() => {
		if (typeof window !== 'undefined') {
			syncTabFromHash();
			window.addEventListener('hashchange', syncTabFromHash);
		}

		(async () => {
			// Run template migration for existing invoices
			await runMigrationIfNeeded();

			const invoicesFromDb = await getAllInvoices();
			if ($session.data) {
				usage = await getInvoiceUsage();
			}
			let loadedInvoice = /** @type {InvoiceData | null} */ (null);

			if (typeof window !== 'undefined') {
				const currentUrl = new URL(window.location.href);
				const invoiceIdFromQuery = currentUrl.searchParams.get('invoice');

				if (invoiceIdFromQuery) {
					const storedInvoice = await getInvoice(invoiceIdFromQuery);
					if (storedInvoice) {
						if (!storedInvoice.id) {
							storedInvoice.id = invoiceIdFromQuery;
						}
						loadedInvoice = storedInvoice;
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
				invoice.logo = DEFAULT_LOGO_PATH;
				invoice.logoFilename = 'logo.png';
			}
			if (!invoice.invoiceLabel) {
				invoice.invoiceLabel = 'INVOICE';
			}
			if (invoice.draft === undefined || invoice.draft === null) {
				invoice.draft = true;
			}

			// Sync template store with loaded invoice's templateId
			if (invoice.templateId) {
				setTemplateId(invoice.templateId);
			}
		})();

		return () => {
			if (typeof window !== 'undefined') {
				window.removeEventListener('hashchange', syncTabFromHash);
			}
		};
	});

	// Sync invoice templateId when template selector changes
	$effect(() => {
		if (invoice && $selectedTemplateId && invoice.templateId !== $selectedTemplateId) {
			invoice.templateId = $selectedTemplateId;
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

	const updateInvoiceItems = (index: number, updatedItem: InvoiceItem): void => {
		const current = ensureInvoice();
		current.items[index] = updatedItem;
	};

	const addInvoiceItem = (): void => {
		const current = ensureInvoice();
		current.items = [...current.items, { name: '', quantity: 1, price: 0, amount: 0 }];
	};

	const updateInvoiceTerms = (newTerms: string = ''): void => {
		const current = ensureInvoice();
		current.terms = newTerms;
	};

	const updateInvoiceNotes = (newNotes: string = ''): void => {
		const current = ensureInvoice();
		current.notes = newNotes;
	};

	const updateInvoicePaidAmount = (amountPaid: number = 0): void => {
		const current = ensureInvoice();
		current.amountPaid = amountPaid;
	};

	const handleInvoiceDateChange = (event: Event): void => {
		const current = ensureInvoice();
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		current.date = target.value;
		if (!userEditedDueDate) {
			const newDueDate = new Date(current.date);
			newDueDate.setDate(newDueDate.getDate() + 30);
			current.dueDate = newDueDate.toISOString().split('T')[0];
		}
	};

	const handleDueDateChange = (event: Event): void => {
		const current = ensureInvoice();
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		current.dueDate = target.value;
		userEditedDueDate = true;
	};

	const onUpdateTax = (newTax: MonetaryAdjustment): void => {
		const current = ensureInvoice();
		current.tax = newTax;
	};

	const onUpdateDiscount = (newDiscount: MonetaryAdjustment): void => {
		const current = ensureInvoice();
		current.discount = newDiscount;
	};

	const onUpdateShipping = (newShipping: ShippingInfo): void => {
		const current = ensureInvoice();
		current.shipping = newShipping;
	};

	const onUpdateLogo = (newFile: File | string | null): void => {
		const current = ensureInvoice();
		if (newFile instanceof File) {
			current.logo = newFile;
			current.logoFilename = newFile.name;
			return;
		}

		if (typeof newFile === 'string' || newFile === null) {
			current.logo = newFile;
			if (newFile === null) {
				current.logoFilename = null;
			}
			return;
		}

		current.logo = null;
		current.logoFilename = null;
		console.warn('onUpdateLogo received an unexpected type for newFile:', newFile);
	};

	const togglePaidStatus = (newStatus: boolean): void => {
		const current = ensureInvoice();
		current.paid = Boolean(newStatus);
	};

	const onInvoiceToInput = (event: Event): void => {
		const current = ensureInvoice();
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		current.invoiceTo = target.value;
	};

	const onInvoiceFromInput = (event: Event): void => {
		const current = ensureInvoice();
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		current.invoiceFrom = target.value;
	};

	const onInvoiceNumberInput = (event: Event): void => {
		const current = ensureInvoice();
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		current.invoiceNumber = target.value;
	};

	const onInvoiceLabelInput = (event: Event): void => {
		const current = ensureInvoice();
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		current.invoiceLabel = target.value;
	};

	const openSaveDraftModal = (): void => {
		// Pre-fill with invoice label + number
		if (invoice) {
			draftName =
				`${invoice.invoiceLabel || $_('invoice.invoice_label')} ${invoice.invoiceNumber || ''}`.trim();
		}
		showSaveDraftModal = true;
	};

	const closeSaveDraftModal = (): void => {
		showSaveDraftModal = false;
		draftName = '';
	};

	const saveDraftAndRedirect = async (): Promise<void> => {
		if (invoice) {
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
		}
	};

	const stopModalPropagation = (event: Event): void => {
		event.stopPropagation();
	};

	const handleBackdropKeydown = (event: KeyboardEvent): void => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			closeSaveDraftModal();
		}
	};

	const handleDraftInputKeydown = (event: KeyboardEvent): void => {
		if (event.key === 'Enter') {
			event.preventDefault();
			saveDraftAndRedirect();
		}
	};

	const handleApplyAIParsedData = (parsed: ParsedInvoice): void => {
		const current = ensureInvoice();

		// Apply client name
		if (parsed.invoiceTo) {
			current.invoiceTo = parsed.invoiceTo;
		}

		// Apply sender/from (if provided)
		if (parsed.invoiceFrom) {
			current.invoiceFrom = parsed.invoiceFrom;
		}

		// Apply items
		if (parsed.items && parsed.items.length > 0) {
			current.items = parsed.items.map((item) => ({
				name: item.name,
				quantity: item.quantity,
				price: item.price,
				amount: item.quantity * item.price
			}));
		}

		// Apply due date
		if (parsed.dueDate) {
			current.dueDate = parsed.dueDate;
			userEditedDueDate = true;
		}

		// Apply tax
		if (parsed.tax && parsed.tax.rate > 0) {
			current.tax = {
				type: parsed.tax.type,
				rate: parsed.tax.rate
			};
		}

		// Apply discount
		if (parsed.discount && parsed.discount.rate > 0) {
			current.discount = {
				type: parsed.discount.type,
				rate: parsed.discount.rate
			};
		}

		// Apply notes
		if (parsed.notes) {
			current.notes = parsed.notes;
		}

		// Apply terms
		if (parsed.terms) {
			current.terms = parsed.terms;
		}
	};
</script>

<svelte:head>
	<title>Free Invoice Generator - Create Professional Invoices Online | FreeInvoice.info</title>
	<meta
		name="description"
		content="Create professional invoices for free in seconds. No signup required. Multiple templates, PDF export, multi-language support. Perfect for freelancers and small businesses."
	/>
	<meta
		name="keywords"
		content="free invoice generator, online invoice maker, create invoice, PDF invoice, invoice template, freelance invoice, small business invoicing, no signup invoice"
	/>
</svelte:head>

{#if invoice}
	<div class="page-layout">
		<!-- Mobile selectors row -->
		<div class="mobile-selectors-row">
			<CurrencySelector />
			<LanguageSelector />
		</div>

		<div class="page-toolbar">
			<!-- Tab Navigation -->
			<div class="tab-navigation">
				<button
					class="tab-button"
					class:active={activeTab === 'edit'}
					onclick={() => setActiveTab('edit')}
				>
					<svg class="tab-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path
							d="M2.5 3A1.5 1.5 0 0 0 1 4.5v4A1.5 1.5 0 0 0 2.5 10h6A1.5 1.5 0 0 0 10 8.5v-4A1.5 1.5 0 0 0 8.5 3h-6Zm9 0A1.5 1.5 0 0 0 10 4.5v4A1.5 1.5 0 0 0 11.5 10h6A1.5 1.5 0 0 0 19 8.5v-4A1.5 1.5 0 0 0 17.5 3h-6Zm-9 7A1.5 1.5 0 0 0 1 11.5v4A1.5 1.5 0 0 0 2.5 17h6A1.5 1.5 0 0 0 10 15.5v-4A1.5 1.5 0 0 0 8.5 10h-6Zm9 0a1.5 1.5 0 0 0-1.5 1.5v4a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5v-4a1.5 1.5 0 0 0-1.5-1.5h-6Z"
						/>
					</svg>
					Edit
				</button>
				<button
					class="tab-button"
					class:active={activeTab === 'preview'}
					onclick={() => setActiveTab('preview')}
				>
					<svg class="tab-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
						<path
							fill-rule="evenodd"
							d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
							clip-rule="evenodd"
						/>
					</svg>
					Preview
				</button>
			</div>

			{#if activeTab === 'preview'}
				<TemplateSelector />
			{/if}
		</div>

		<!-- Edit View -->
		<div class="content-section form-section" class:hidden={activeTab !== 'edit'}>
			<div class="sticky-button-wrapper">
				<div class="button-group">
					<button
						class="action-button save-draft-button"
						title={$_('actions.save_draft')}
						onclick={openSaveDraftModal}
					>
						<svg class="icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
							<path
								fill-rule="evenodd"
								d="M10 2c-1.716 0-3.408.106-5.07.31C3.806 2.45 3 3.414 3 4.517V17.25a.75.75 0 0 0 1.075.676L10 15.082l5.925 2.844A.75.75 0 0 0 17 17.25V4.517c0-1.103-.806-2.068-1.93-2.207A41.403 41.403 0 0 0 10 2Z"
								clip-rule="evenodd"
							/>
						</svg>
						{$_('actions.save_draft')}
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

			<!-- AI Chat Input (only for authenticated users) -->
			{#if $session.data}
				<AIChatInput onApplyParsedData={handleApplyAIParsedData} />
			{/if}

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

		<!-- Preview View -->
		<div class="content-section preview-section" class:hidden={activeTab !== 'preview'}>
			<div class="sticky-button-wrapper">
				<div class="button-group">
					<button
						class="icon-button preview-action"
						aria-label={$_('invoice.print_pdf')}
						title={$_('invoice.print_pdf')}
						onclick={printPDF}
						disabled={isGeneratingPDF}
					>
						{#if isGeneratingPDF && pdfAction === 'print'}
							<svg
								class="icon spin"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								aria-hidden="true"
							>
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
							<span class="sr-only">{$_('invoice.printing')}</span>
						{:else}
							<svg class="icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
								<path d="M6 2a2 2 0 0 0-2 2v3h12V4a2 2 0 0 0-2-2H6Z" />
								<path
									fill-rule="evenodd"
									d="M4 8a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1v-3.5a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 15 12.5V16h1a3 3 0 0 0 3-3v-2a3 3 0 0 0-3-3H4Zm1.5 5.5V18a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2v-4.5a.5.5 0 0 0-.5-.5h-7a.5.5 0 0 0-.5.5Z"
									clip-rule="evenodd"
								/>
								<path d="M6 6.5h8v2H6v-2Z" />
							</svg>
							<span class="sr-only">{$_('invoice.print_pdf')}</span>
						{/if}
					</button>
					<button
						class="icon-button preview-action"
						aria-label={$_('invoice.save_pdf')}
						title={$_('invoice.save_pdf')}
						onclick={saveAsPDF}
						disabled={isGeneratingPDF}
					>
						{#if isGeneratingPDF && pdfAction === 'download'}
							<svg
								class="icon spin"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								aria-hidden="true"
							>
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
			</div>

			<div bind:this={previewRef}>
				<InvoicePreviewWrapper {invoice} />
			</div>
		</div>
	</div>
{:else}
	<p class="text-center py-8 text-gray-600 dark:text-gray-400">Loading...</p>
{/if}

<!-- Sign Up Prompt Modal for Guests -->
<SignUpPromptModal
	open={showSignUpPrompt}
	onClose={closeSignUpPrompt}
	onContinueBasic={handleContinueBasicDownload}
/>

<!-- Save Draft Modal -->

{#if showSaveDraftModal}
	<div
		class="modal-backdrop"
		role="button"
		aria-label={$_('actions.cancel')}
		tabindex="0"
		onclick={closeSaveDraftModal}
		onkeydown={handleBackdropKeydown}
	>
		<div class="modal" role="dialog" aria-modal="true" onpointerdown={stopModalPropagation}>
			<h2 class="modal-title">{$_('modal.save_draft_title')}</h2>
			<p class="modal-description">{$_('modal.save_draft_description')}</p>

			{#if $session.data && usage.count >= usage.limit}
				<div class="limit-warning">
					<p class="text-amber-600 dark:text-amber-400 text-sm mb-4">
						Warning: You have reached your limit of {usage.limit} invoices. Saving this invoice will
						automatically delete your oldest saved invoice.
					</p>
				</div>
			{/if}

			<input
				type="text"
				class="modal-input"
				placeholder={$_('modal.draft_name_placeholder')}
				bind:value={draftName}
				onkeydown={handleDraftInputKeydown}
			/>

			<div class="modal-actions">
				<button class="modal-button cancel-button" onclick={closeSaveDraftModal}>
					{$_('actions.cancel')}
				</button>
				<button class="modal-button save-button" onclick={saveDraftAndRedirect}>
					{$_('actions.save')}
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
		padding: 0.875rem 1.5rem 1.25rem 1.5rem;
		position: relative;
		max-width: 1280px;
		margin: 0 auto;
	}

	/* Mobile selectors - hidden on desktop */
	.mobile-selectors-row {
		display: none;
		gap: 0.75rem;
		align-items: center;
	}

	@media (max-width: 768px) {
		.mobile-selectors-row {
			display: flex;
		}
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

	.content-section.hidden {
		display: none;
	}

	.icon-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: var(--radius-md);
		border: 1px solid transparent;
		background-color: var(--color-accent, #2563eb);
		color: var(--color-accent-contrast, #ffffff);
		box-shadow: var(--shadow-soft);
		cursor: pointer;
		transition:
			background-color 0.2s ease,
			border-color 0.2s ease;
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

		.sticky-button-wrapper {
			position: static;
			height: auto;
			margin-bottom: 0.75rem;
		}

		.sticky-button-wrapper .button-group {
			transform: none;
			flex-direction: row;
			justify-content: flex-end;
			gap: 0.5rem;
		}

		.action-button {
			font-size: 0.8rem;
			padding: 0.5rem 0.875rem;
		}

		.icon-button {
			width: 2.25rem;
			height: 2.25rem;
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
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.1),
			0 10px 10px -5px rgba(0, 0, 0, 0.04);
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
