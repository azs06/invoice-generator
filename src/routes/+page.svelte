
<script>
	'use runes';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import InvoiceFormComponent from '$components/InvoiceFormComponent.svelte';
	import InvoicePreviewWrapper from '$components/InvoicePreviewWrapper.svelte';
	import TemplateSelector from '$components/TemplateSelector.svelte';
	import { saveInvoice, getAllInvoices, getInvoice } from '$lib/db.js';
	import { DEFAULT_LOGO_PATH } from '$lib/index.js';
	import { v4 as uuidv4 } from 'uuid';
	import { totalAmounts  } from '$lib/InvoiceCalculator.js';
	import { runMigrationIfNeeded } from '$lib/templates/migration.js';
	import { selectedTemplateId, setTemplateId } from '../stores/templateStore.js';
	/** @typedef {import('$lib/types').InvoiceData} InvoiceData */
	/** @typedef {import('$lib/types').InvoiceItem} InvoiceItem */
	/** @typedef {import('$lib/types').MonetaryAdjustment} MonetaryAdjustment */
	/** @typedef {import('$lib/types').ShippingInfo} ShippingInfo */

	let invoice = $state(/** @type {InvoiceData | null} */ (null));
	let previewRef = $state(/** @type {HTMLElement | null} */ (null));
	let isGeneratingPDF = $state(false); // State to track PDF generation status
	let pdfAction = $state(/** @type {'download' | 'print' | null} */ (null));
	let showMobilePreview = $state(false); // Track mobile preview visibility
	let activeTab = $state('edit'); // Track active tab: 'edit' or 'preview'
	const validTabs = new Set(['edit', 'preview']);

	let userEditedDueDate = $state(false); // Track if user has edited the due date
	let showSaveDraftModal = $state(false); // Track save draft modal visibility
	let draftName = $state(''); // Track draft name input

	/**
	 * @returns {InvoiceData}
	 */
	const createNewInvoice = () => ({
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

	/**
	 * @returns {InvoiceData}
	 */
	const ensureInvoice = () => {
		if (!invoice) {
			invoice = createNewInvoice();
		}
		return invoice;
	};

	const startNewInvoice = () => {
		invoice = createNewInvoice();
	};

	/**
	 * @param {any} tab - The tab to set
	 */
	const setActiveTab = (tab) => {
		if (!validTabs.has(tab)) {
			return;
		}

		activeTab = tab;

		if (typeof window !== 'undefined') {
			const { pathname, search, hash } = window.location;
			const nextHash = `#${tab}`;

			if (hash !== nextHash) {
				window.history.replaceState({}, '', `${pathname}${search}${nextHash}`);
			}
		}
	};

	const syncTabFromHash = () => {
		if (typeof window === 'undefined') {
			return;
		}

		const hashValue = window.location.hash?.slice(1).toLowerCase();

		if (validTabs.has(hashValue)) {
			activeTab = hashValue;
		}
	};

	/**
	 * @returns {Promise<void>}
	 */
	const waitForPreviewImages = async () => {
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

	/**
	 * @returns {Promise<void>}
	 */
	const saveAsPDF = async () => {
		const currentInvoice = invoice;
		if (typeof window === 'undefined' || !previewRef || !currentInvoice) {
			return;
		}

		isGeneratingPDF = true; // 👈 start loading
		pdfAction = 'download';

		try {
			await waitForPreviewImages();

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
		} catch (error) {
			console.error('Failed to export PDF:', error);
		} finally {
			isGeneratingPDF = false; // 👈 stop loading
			pdfAction = null;
		}
	};

	/**
	 * @returns {Promise<void>}
	 */
	const printPDF = async () => {
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

	/**
	 * @param {number} index
	 * @param {InvoiceItem} updatedItem
	 */
	const updateInvoiceItems = (index, updatedItem) => {
		const current = ensureInvoice();
		current.items[index] = updatedItem;
	};

	const addInvoiceItem = () => {
		const current = ensureInvoice();
		current.items = [...current.items, { name: '', quantity: 1, price: 0, amount: 0 }];
	};

	const updateInvoiceTerms = (newTerms = '') => {
		const current = ensureInvoice();
		current.terms = newTerms;
	};

	const updateInvoiceNotes = (newNotes = '') => {
		const current = ensureInvoice();
		current.notes = newNotes;
	};

	const updateInvoicePaidAmount = (amountPaid = 0) => {
		const current = ensureInvoice();
		current.amountPaid = amountPaid;
	};

	/**
	 * @param {Event} event
	 */
	const handleInvoiceDateChange = (event) => {
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

	/**
	 * @param {Event} event
	 */
	const handleDueDateChange = (event) => {
		const current = ensureInvoice();
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		current.dueDate = target.value;
		userEditedDueDate = true;
	};

	/**
	 * @param {MonetaryAdjustment} newTax
	 */
	const onUpdateTax = (newTax) => {
		const current = ensureInvoice();
		current.tax = newTax;
	};

	/**
	 * @param {MonetaryAdjustment} newDiscount
	 */
	const onUpdateDiscount = (newDiscount) => {
		const current = ensureInvoice();
		current.discount = newDiscount;
	};

	/**
	 * @param {ShippingInfo} newShipping
	 */
	const onUpdateShipping = (newShipping) => {
		const current = ensureInvoice();
		current.shipping = newShipping;
	};

	/**
	 * @param {File | string | null} newFile
	 */
	const onUpdateLogo = (newFile) => {
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

	/**
	 * @param {boolean} newStatus
	 */
	const togglePaidStatus = (newStatus) => {
		const current = ensureInvoice();
		current.paid = Boolean(newStatus);
	};

	/**
	 * @param {Event} event
	 */
	const onInvoiceToInput = (event) => {
		const current = ensureInvoice();
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		current.invoiceTo = target.value;
	};

	/**
	 * @param {Event} event
	 */
	const onInvoiceFromInput = (event) => {
		const current = ensureInvoice();
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		current.invoiceFrom = target.value;
	};

	/**
	 * @param {Event} event
	 */
	const onInvoiceNumberInput = (event) => {
		const current = ensureInvoice();
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		current.invoiceNumber = target.value;
	};

	/**
	 * @param {Event} event
	 */
	const onInvoiceLabelInput = (event) => {
		const current = ensureInvoice();
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		current.invoiceLabel = target.value;
	};
	const openSaveDraftModal = () => {
		// Pre-fill with invoice label + number
		if (invoice) {
			draftName = `${invoice.invoiceLabel || 'INVOICE'} ${invoice.invoiceNumber || ''}`.trim();
		}
		showSaveDraftModal = true;
	};
	
	const closeSaveDraftModal = () => {
		showSaveDraftModal = false;
		draftName = '';
	};
	
	const saveDraftAndRedirect = async () => {
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

	/**
	 * @param {Event} event
	 */
	const stopModalPropagation = (event) => {
		event.stopPropagation();
	};

	/**
	 * @param {KeyboardEvent} event
	 */
	const handleBackdropKeydown = (event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			closeSaveDraftModal();
		}
	};

	/**
	 * @param {KeyboardEvent} event
	 */
	const handleDraftInputKeydown = (event) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			saveDraftAndRedirect();
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
					onclick={() => setActiveTab('edit')}
				>
					<svg class="tab-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v4A1.5 1.5 0 0 0 2.5 10h6A1.5 1.5 0 0 0 10 8.5v-4A1.5 1.5 0 0 0 8.5 3h-6Zm9 0A1.5 1.5 0 0 0 10 4.5v4A1.5 1.5 0 0 0 11.5 10h6A1.5 1.5 0 0 0 19 8.5v-4A1.5 1.5 0 0 0 17.5 3h-6Zm-9 7A1.5 1.5 0 0 0 1 11.5v4A1.5 1.5 0 0 0 2.5 17h6A1.5 1.5 0 0 0 10 15.5v-4A1.5 1.5 0 0 0 8.5 10h-6Zm9 0a1.5 1.5 0 0 0-1.5 1.5v4a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5v-4a1.5 1.5 0 0 0-1.5-1.5h-6Z" />
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
						<path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clip-rule="evenodd" />
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
							title="Save Draft"
							onclick={openSaveDraftModal}
						>
							<svg class="icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
								<path fill-rule="evenodd" d="M10 2c-1.716 0-3.408.106-5.07.31C3.806 2.45 3 3.414 3 4.517V17.25a.75.75 0 0 0 1.075.676L10 15.082l5.925 2.844A.75.75 0 0 0 17 17.25V4.517c0-1.103-.806-2.068-1.93-2.207A41.403 41.403 0 0 0 10 2Z" clip-rule="evenodd" />
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
				</div>

				<div bind:this={previewRef}>
					<InvoicePreviewWrapper {invoice} />
				</div>
		</div>
	</div>
{:else}
	<p class="text-center py-8 text-gray-600 dark:text-gray-400">Loading...</p>
{/if}

<!-- Save Draft Modal -->

{#if showSaveDraftModal}
	<div
		class="modal-backdrop"
		role="button"
		aria-label="Close save draft modal"
		tabindex="0"
		onclick={closeSaveDraftModal}
		onkeydown={handleBackdropKeydown}
	>
		<div class="modal" role="dialog" aria-modal="true" onpointerdown={stopModalPropagation}>
			<h2 class="modal-title">Save Draft</h2>
			<p class="modal-description">Give your draft a name (optional)</p>

			<input
				type="text"
				class="modal-input"
				placeholder="Draft name"
				bind:value={draftName}
				onkeydown={handleDraftInputKeydown}
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
		padding: 0.875rem 1.5rem 1.25rem 1.5rem;
		position: relative;
		max-width: 1280px;
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

	.content-section.hidden {
		display: none;
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
