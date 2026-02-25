<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { goto, replaceState } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import InvoiceFormComponent from '$components/InvoiceFormComponent.svelte';
	import InvoicePreviewWrapper from '$components/InvoicePreviewWrapper.svelte';
	import TemplateSelector from '$components/TemplateSelector.svelte';
	import PageSettingsSelector from '$components/PageSettingsSelector.svelte';
	import ViewModeToggle from '$components/ViewModeToggle.svelte';
	import ThemeToggle from '$components/ThemeToggle.svelte';
	import SignUpPromptModal from '$components/SignUpPromptModal.svelte';
	import ShareInvoiceModal from '$components/ShareInvoiceModal.svelte';
	import CurrencySelector from '$components/CurrencySelector.svelte';
	import LanguageSelector from '$components/LanguageSelector.svelte';
	import {
		saveInvoice,
		getInvoice,
		getInvoiceUsage,
		getAllInvoices,
		deleteInvoice as deleteStoredInvoice
	} from '$lib/db.js';
	import {
		saveGuestInvoice,
		getAllGuestInvoices,
		getGuestInvoice,
		deleteGuestInvoice
	} from '$lib/guestDb.js';
	import { DEFAULT_LOGO_PATH } from '$lib/index.js';
	import { v4 as uuidv4 } from 'uuid';
	import { totalAmounts } from '$lib/InvoiceCalculator.js';
	import { runMigrationIfNeeded } from '$lib/templates/migration.js';
	import { selectedTemplateId, setTemplateId } from '../stores/templateStore.js';
	import { pageSettings, viewMode } from '../stores/pageSettingsStore.js';
	import type {
		InvoiceData,
		InvoiceItem,
		MonetaryAdjustment,
		SavedInvoiceRecord,
		ShippingInfo
	} from '$lib/types';
	import { authClient } from '$lib/auth';
	import { isInvoiceComplete } from '$lib/invoiceValidation';
	import {
		generatePdfFromPreview,
		generatePdfClientSide,
		downloadBlob,
		type PageSettings
	} from '$lib/pdfGenerator';

	type PDFAction = 'download' | 'print' | null;
	type TabName = 'edit' | 'preview';
	type SidebarInvoiceItem = {
		id: string;
		title: string;
		isDraft: boolean;
	};

	let invoice = $state<InvoiceData | null>(null);
	let previewRef = $state<HTMLElement | null>(null);
	let isGeneratingPDF = $state<boolean>(false);
	let pdfAction = $state<PDFAction>(null);
	let activeTab = $state<TabName>('edit');
	const validTabs = new Set<string>(['edit', 'preview']);
	let documentTitle = $derived(
		invoice
			? `${invoice.invoiceLabel || 'Invoice'} ${invoice.invoiceNumber || ''}`.trim()
			: 'Untitled invoice'
	);

	let userEditedDueDate = $state<boolean>(false);
	let showSaveDraftModal = $state<boolean>(false);
	let draftName = $state<string>('');

	let usage = $state<{ count: number; limit: number }>({ count: 0, limit: 12 });
	let showLimitWarning = $state<boolean>(false);
	let showSignUpPrompt = $state<boolean>(false);
	let showShareModal = $state<boolean>(false);
	let showFileMenu = $state<boolean>(false);
	let showProfileMenu = $state<boolean>(false);
	let userInvoicePrefix = $state<string>('INV-');
	let imageError = $state(false);
	let fileMenuTrigger = $state<HTMLButtonElement | null>(null);
	let profileMenuTrigger = $state<HTMLButtonElement | null>(null);
	let sidebarInvoices = $state<SidebarInvoiceItem[]>([]);
	let isSidebarLoading = $state<boolean>(false);
	let deleteConfirmId = $state<string | null>(null);
	let deleteConfirmTitle = $state<string>('');

	// Derived state for share button availability
	let isShareable = $derived(isInvoiceComplete(invoice));

	const createNewInvoice = (): InvoiceData => ({
		id: uuidv4(),
		invoiceLabel: 'INVOICE',
		invoiceNumber: `${userInvoicePrefix}${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
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

	const syncInvoiceQueryInUrl = (invoiceId: string): void => {
		if (typeof window === 'undefined') {
			return;
		}

		const currentUrl = new URL(window.location.href);
		currentUrl.searchParams.set('invoice', invoiceId);
		currentUrl.searchParams.delete('mode');
		replaceState(currentUrl.toString(), {});
	};

	const getSidebarItemTitle = (invoiceData: InvoiceData | null | undefined): string => {
		if (!invoiceData) {
			return 'Untitled invoice';
		}

		const draftName = invoiceData.draftName?.trim();
		if (draftName) {
			return draftName;
		}

		const label = invoiceData.invoiceLabel?.trim() || 'Invoice';
		const number = invoiceData.invoiceNumber?.trim();
		return number ? `${label} ${number}` : label;
	};

	const mapRecordsToSidebarItems = (records: SavedInvoiceRecord[]): SidebarInvoiceItem[] => {
		return records
			.filter((record) => Boolean(record?.id) && Boolean(record?.invoice))
			.map((record) => ({
				id: record.id,
				title: getSidebarItemTitle(record.invoice),
				isDraft: record.invoice.draft === true
			}));
	};

	const upsertSidebarInvoice = (invoiceData: InvoiceData): void => {
		const id = invoiceData.id;
		if (!id) {
			return;
		}

		const nextItem: SidebarInvoiceItem = {
			id,
			title: getSidebarItemTitle(invoiceData),
			isDraft: invoiceData.draft === true
		};

		const previousItems = untrack(() => sidebarInvoices);
		sidebarInvoices = [nextItem, ...previousItems.filter((item) => item.id !== id)];
	};

	const loadSidebarInvoices = async (useServerSource: boolean): Promise<void> => {
		isSidebarLoading = true;

		try {
			const records = useServerSource ? await getAllInvoices() : await getAllGuestInvoices();
			sidebarInvoices = mapRecordsToSidebarItems(records);
		} catch (error) {
			console.warn('Failed to load sidebar invoices:', error);
		} finally {
			isSidebarLoading = false;
		}
	};

	const startNewInvoice = (): void => {
		const newInvoice = createNewInvoice();
		invoice = newInvoice;
		setTemplateId(newInvoice.templateId);
		syncInvoiceQueryInUrl(newInvoice.id);
		upsertSidebarInvoice(newInvoice);
	};

	const clearInvoice = (): void => {
		if (!invoice) return;

		const currentId = invoice.id;
		const currentInvoiceNumber = invoice.invoiceNumber;

		invoice = {
			...createNewInvoice(),
			id: currentId,
			invoiceNumber: currentInvoiceNumber
		};
		upsertSidebarInvoice(invoice);
	};

	const openSidebarInvoice = async (invoiceId: string): Promise<boolean> => {
		if (invoice?.id === invoiceId) {
			return true;
		}

		let loadedInvoice = $session.data ? await getInvoice(invoiceId) : null;
		if (!loadedInvoice) {
			loadedInvoice = await getGuestInvoice(invoiceId);
		}
		if (!loadedInvoice) {
			return false;
		}

		if (!loadedInvoice.id) {
			loadedInvoice.id = invoiceId;
		}

		invoice = loadedInvoice;
		setTemplateId(loadedInvoice.templateId || 'modern');
		setActiveTab('edit');
		syncInvoiceQueryInUrl(invoiceId);
		return true;
	};

	const deleteCurrentInvoice = async (): Promise<void> => {
		const currentInvoice = invoice;
		if (!currentInvoice?.id || typeof window === 'undefined') {
			return;
		}

		const shouldDelete = window.confirm(
			'Delete this invoice permanently? This action cannot be undone.'
		);
		if (!shouldDelete) {
			return;
		}

		const deletingId = currentInvoice.id;
		const nextInvoiceId = untrack(() => sidebarInvoices.find((item) => item.id !== deletingId)?.id);

		try {
			if ($session.data) {
				await deleteStoredInvoice(deletingId);
			} else {
				await deleteGuestInvoice(deletingId);
			}

			sidebarInvoices = untrack(() => sidebarInvoices.filter((item) => item.id !== deletingId));

			if (nextInvoiceId) {
				const opened = await openSidebarInvoice(nextInvoiceId);
				if (opened) {
					return;
				}
			}

			startNewInvoice();
		} catch (error) {
			console.error('Failed to delete invoice:', error);
			alert('Failed to delete invoice. Please try again.');
		}
	};

	const promptDeleteInvoice = (id: string, title: string, event: MouseEvent): void => {
		event.stopPropagation();
		deleteConfirmId = id;
		deleteConfirmTitle = title;
	};

	const cancelDelete = (): void => {
		deleteConfirmId = null;
		deleteConfirmTitle = '';
	};

	const confirmDeleteInvoice = async (): Promise<void> => {
		const deletingId = deleteConfirmId;
		if (!deletingId) return;

		deleteConfirmId = null;
		deleteConfirmTitle = '';

		const isCurrentInvoice = invoice?.id === deletingId;
		const nextInvoiceId = untrack(() =>
			sidebarInvoices.find((item) => item.id !== deletingId)?.id
		);

		try {
			if ($session.data) {
				await deleteStoredInvoice(deletingId);
			} else {
				await deleteGuestInvoice(deletingId);
			}

			sidebarInvoices = untrack(() => sidebarInvoices.filter((item) => item.id !== deletingId));

			if (isCurrentInvoice) {
				if (nextInvoiceId) {
					await openSidebarInvoice(nextInvoiceId);
				} else {
					startNewInvoice();
				}
			}
		} catch (error) {
			console.error('Failed to delete invoice:', error);
			alert('Failed to delete invoice. Please try again.');
		}
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
				replaceState(`${pathname}${search}${nextHash}`, {});
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

	const ensurePreviewIsActive = async (): Promise<void> => {
		if (typeof window === 'undefined' || activeTab === 'preview') {
			return;
		}

		setActiveTab('preview');
		await tick();
		await new Promise<void>((resolve) => {
			window.requestAnimationFrame(() => resolve());
		});
	};

	const session = authClient.useSession();

	const signIn = async (): Promise<void> => {
		await authClient.signIn.social({
			provider: 'google'
		});
	};

	const signOut = async (): Promise<void> => {
		showProfileMenu = false;
		await authClient.signOut();
		window.location.href = '/';
	};

	const getUserInitials = (name: string | undefined): string => {
		if (!name) return '?';
		const parts = name.split(' ').filter(Boolean);
		if (parts.length >= 2) {
			return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
		}
		return name.substring(0, 2).toUpperCase();
	};

	const handleImageError = (): void => {
		imageError = true;
	};

	const closeFileMenu = (returnFocus: boolean = false): void => {
		if (!showFileMenu) return;
		showFileMenu = false;
		if (returnFocus) {
			fileMenuTrigger?.focus();
		}
	};

	const closeProfileMenu = (): void => {
		showProfileMenu = false;
	};

	const closeHeaderMenus = (): void => {
		closeFileMenu();
		closeProfileMenu();
	};

	const toggleFileMenu = (): void => {
		showFileMenu = !showFileMenu;
		if (showFileMenu) {
			showProfileMenu = false;
		}
	};

	const toggleProfileMenu = (): void => {
		showProfileMenu = !showProfileMenu;
		if (showProfileMenu) {
			closeFileMenu();
		}
	};

	const navigateToDashboard = async (): Promise<void> => {
		closeHeaderMenus();
		await goto('/dashboard');
	};

	const runFileMenuAction = async (action: () => void | Promise<void>): Promise<void> => {
		closeFileMenu();
		await action();
	};

	const handleGlobalKeydown = (event: KeyboardEvent): void => {
		if (event.key === 'Escape') {
			closeFileMenu(true);
			closeProfileMenu();
		}
	};

	const saveAsPDF = async (): Promise<void> => {
		// Guard against double-clicks immediately
		if (isGeneratingPDF) return;

		const currentInvoice = invoice;
		if (typeof window === 'undefined' || !currentInvoice) {
			return;
		}

		await ensurePreviewIsActive();
		if (!previewRef) return;

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
		if (typeof window === 'undefined' || !currentInvoice) {
			return;
		}

		await ensurePreviewIsActive();
		if (!previewRef) return;

		isGeneratingPDF = true;
		pdfAction = 'download';

		// Get current page settings
		const currentPageSettings: PageSettings = {
			pageSize: $pageSettings.pageSize as 'a4' | 'letter' | 'legal' | 'a5',
			margins: $pageSettings.margins
		};

		try {
			if ($session.data) {
				// Server-side generation for logged-in users (high quality)
				try {
					const { blob, storageStatus } = await generatePdfFromPreview({
						invoice: currentInvoice,
						previewElement: previewRef,
						pageSettings: currentPageSettings
					});

					downloadBlob(blob, `invoice-${currentInvoice.invoiceTo || 'unknown'}.pdf`);

					if (storageStatus === 'saved') {
						console.log('[PDF] Successfully saved to cloud storage');
					} else {
						console.warn('[PDF] Cloud storage unavailable, PDF downloaded locally only');
					}
				} catch (serverError) {
					// Fall back to client-side generation if server-side fails
					console.warn(
						'Server-side PDF generation failed, using client-side fallback:',
						serverError
					);
					await generatePdfClientSide(previewRef, currentInvoice, currentPageSettings);
				}
			} else {
				// Client-side generation for guests (with fixes applied)
				await generatePdfClientSide(previewRef, currentInvoice, currentPageSettings);
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
		if (typeof window === 'undefined' || !currentInvoice) {
			return;
		}

		await ensurePreviewIsActive();
		if (!previewRef) return;

		isGeneratingPDF = true;
		pdfAction = 'print';

		// Get current page settings
		const currentPageSettings: PageSettings = {
			pageSize: $pageSettings.pageSize as 'a4' | 'letter' | 'legal' | 'a5',
			margins: $pageSettings.margins
		};

		try {
			const html2pdf = (await import('html2pdf.js')).default;

			// Apply same fixes as generatePdfClientSide for print
			const indicator = previewRef.querySelector('.page-size-indicator') as HTMLElement | null;
			const templateWrapper = previewRef.querySelector(
				'.template-wrapper.page'
			) as HTMLElement | null;
			const scaleWrapper = previewRef.querySelector('.scale-wrapper') as HTMLElement | null;

			const originalStyles = {
				indicatorDisplay: indicator?.style.display || '',
				wrapperTransform: templateWrapper?.style.transform || '',
				wrapperPosition: templateWrapper?.style.position || '',
				scaleWrapperWidth: scaleWrapper?.style.width || '',
				scaleWrapperHeight: scaleWrapper?.style.height || ''
			};

			try {
				// Apply fixes
				if (indicator) indicator.style.display = 'none';
				if (templateWrapper) {
					templateWrapper.style.transform = 'none';
					templateWrapper.style.position = 'static';
				}
				if (scaleWrapper) {
					scaleWrapper.style.width = 'auto';
					scaleWrapper.style.height = 'auto';
				}

				// Convert page size to jsPDF format
				const formatMap: Record<string, [number, number]> = {
					letter: [8.5, 11],
					a4: [8.27, 11.69],
					legal: [8.5, 14],
					a5: [5.83, 8.27]
				};
				const pdfFormat = formatMap[currentPageSettings.pageSize] || formatMap.letter;

				// Convert margins from mm to inches
				const mmToInches = (mm: number) => mm / 25.4;
				const margins = {
					top: mmToInches(currentPageSettings.margins.top),
					right: mmToInches(currentPageSettings.margins.right),
					bottom: mmToInches(currentPageSettings.margins.bottom),
					left: mmToInches(currentPageSettings.margins.left)
				};

				const worker = html2pdf()
					.from(previewRef)
					.set({
						margin: [margins.top, margins.right, margins.bottom, margins.left],
						filename: `invoice-${currentInvoice.invoiceTo || 'unknown'}.pdf`,
						html2canvas: {
							scale: 2,
							useCORS: true,
							logging: false
						},
						jsPDF: {
							unit: 'in',
							format: pdfFormat,
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
			} finally {
				// Restore original styles
				if (indicator) indicator.style.display = originalStyles.indicatorDisplay;
				if (templateWrapper) {
					templateWrapper.style.transform = originalStyles.wrapperTransform;
					templateWrapper.style.position = originalStyles.wrapperPosition;
				}
				if (scaleWrapper) {
					scaleWrapper.style.width = originalStyles.scaleWrapperWidth;
					scaleWrapper.style.height = originalStyles.scaleWrapperHeight;
				}
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

			// Always start with guest storage - it's local and fast
			// We'll load from API only after session is confirmed
			const invoicesFromDb = await getAllGuestInvoices();
			sidebarInvoices = mapRecordsToSidebarItems(invoicesFromDb);

			let loadedInvoice = /** @type {InvoiceData | null} */ (null);

			if (typeof window !== 'undefined') {
				const currentUrl = new URL(window.location.href);
				const invoiceIdFromQuery = currentUrl.searchParams.get('invoice');

				if (invoiceIdFromQuery) {
					// Get invoice from guest storage first (fast)
					const storedInvoice = await getGuestInvoice(invoiceIdFromQuery);
					if (storedInvoice) {
						if (!storedInvoice.id) {
							storedInvoice.id = invoiceIdFromQuery;
						}
						loadedInvoice = storedInvoice;
					}

					// Handle missing invoice
					if (invoiceIdFromQuery && !storedInvoice) {
						console.warn(`Invoice ${invoiceIdFromQuery} not found`);
						// Clear invalid query param and create new invoice
						replaceState('/', {});
						// Let fallback create new invoice
					}

					// Keep query params in URL for refresh persistence
					// Remove 'mode' param if it exists (legacy from view mode)
					currentUrl.searchParams.delete('mode');
					replaceState(currentUrl.toString(), {});
				}
			}

			if (!loadedInvoice && invoicesFromDb.length > 0) {
				const latestInvoiceEntry = invoicesFromDb[0];
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
			upsertSidebarInvoice(invoice);
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

	// Load user-specific data when session becomes available
	let sessionLoaded = $state(false);
	$effect(() => {
		if (!$session.isPending && $session.data && !sessionLoaded) {
			sessionLoaded = true;
			(async () => {
				try {
					// Fetch usage and settings
					usage = await getInvoiceUsage();
					const settingsResponse = await fetch('/api/user/settings');
					if (settingsResponse.ok) {
						const settings = await settingsResponse.json();
						if (settings.invoicePrefix) {
							userInvoicePrefix = settings.invoicePrefix;
						}
					}

					// If there's an invoice ID in URL, try to load from API
					if (typeof window !== 'undefined') {
						const invoiceIdFromQuery = new URL(window.location.href).searchParams.get('invoice');
						if (invoiceIdFromQuery) {
							const serverInvoice = await getInvoice(invoiceIdFromQuery);
							if (serverInvoice) {
								invoice = serverInvoice;
							}
						}
					}

					await loadSidebarInvoices(true);
				} catch (e) {
					console.warn('Failed to fetch user data:', e);
				}
			})();
		}
	});

	$effect(() => {
		if (!$session.isPending && !$session.data) {
			void loadSidebarInvoices(false);
		}
	});

	$effect(() => {
		if (invoice && invoice.id) {
			upsertSidebarInvoice(invoice);

			// Only save when session is resolved (not pending)
			if ($session.isPending) return;

			// Conditionally save based on authentication status
			if ($session.data) {
				// Logged-in user: save to server API
				saveInvoice(invoice.id, invoice);
			} else {
				// Guest: save to IndexedDB
				saveGuestInvoice(invoice.id, invoice);
			}
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
		closeFileMenu();
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

<svelte:window onpointerdown={closeHeaderMenus} onkeydown={handleGlobalKeydown} />

{#if invoice}
	<div class="workspace-shell editor-workspace app-page">
		<div class="desktop-docs-chrome">
			<div class="docs-title-row docs-surface" onpointerdown={(event) => event.stopPropagation()}>
				<div class="docs-title-cluster">
					<div class="docs-file-badge" aria-hidden="true">
						<svg class="docs-file-icon" viewBox="0 0 20 20" fill="currentColor">
							<path d="M5 2a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5L11.5 2H5Z" />
							<path d="M11 2.5V8h5.5L11 2.5Z" opacity="0.6" />
						</svg>
					</div>
					<div class="docs-title-stack">
						<div class="docs-document-title">{documentTitle || 'Untitled invoice'}</div>
						<nav class="docs-menu-bar" aria-label="Document menu">
							<div class="docs-menu-wrap">
								<button
									type="button"
									class="docs-menu-trigger"
									aria-haspopup="menu"
									aria-expanded={showFileMenu}
									aria-controls="file-menu"
									onclick={toggleFileMenu}
									data-testid="file-menu-button"
									bind:this={fileMenuTrigger}
								>
									File
									<svg class="docs-menu-chevron" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
										<path
											fill-rule="evenodd"
											d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 0 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0l-4.25-4.51a.75.75 0 0 1 .02-1.06Z"
											clip-rule="evenodd"
										/>
									</svg>
								</button>

								{#if showFileMenu}
									<div
										id="file-menu"
										class="docs-menu-dropdown"
										role="menu"
										aria-label="File menu"
										data-testid="file-menu"
										onpointerdown={(event) => event.stopPropagation()}
									>
										<button
											type="button"
											class="docs-menu-option"
											role="menuitem"
											onclick={() => void runFileMenuAction(() => startNewInvoice())}
										>
											New invoice
										</button>
										<button
											type="button"
											class="docs-menu-option"
											role="menuitem"
											data-testid="file-menu-save-draft"
											onclick={() => void runFileMenuAction(() => openSaveDraftModal())}
										>
											Save draft
										</button>
										<button
											type="button"
											class="docs-menu-option"
											role="menuitem"
											onclick={() => void runFileMenuAction(() => clearInvoice())}
										>
											Clear invoice
										</button>
										<span class="docs-menu-divider" aria-hidden="true"></span>
										<button
											type="button"
											class="docs-menu-option docs-menu-option--danger"
											role="menuitem"
											data-testid="file-menu-delete"
											onclick={() => void runFileMenuAction(() => deleteCurrentInvoice())}
										>
											Delete invoice
										</button>
										<span class="docs-menu-divider" aria-hidden="true"></span>
										<button
											type="button"
											class="docs-menu-option"
											role="menuitem"
											disabled={isGeneratingPDF}
											onclick={() => void runFileMenuAction(() => printPDF())}
										>
											Print
										</button>
										<button
											type="button"
											class="docs-menu-option"
											role="menuitem"
											disabled={isGeneratingPDF}
											onclick={() => void runFileMenuAction(() => saveAsPDF())}
										>
											Download PDF
										</button>
										<button
											type="button"
											class="docs-menu-option"
											role="menuitem"
											disabled={!$session.data || !isShareable}
											title={!$session.data
												? 'Sign in to share invoices'
												: 'Complete the invoice to enable sharing (requires: From, To, Invoice #, Date, and at least one item)'}
											onclick={() =>
												void runFileMenuAction(() => {
													showShareModal = true;
												})}
										>
											Share
										</button>
										{#if $session.data}
											<span class="docs-menu-divider" aria-hidden="true"></span>
											<button
												type="button"
												class="docs-menu-option"
												role="menuitem"
												onclick={() => void runFileMenuAction(() => navigateToDashboard())}
											>
												Dashboard
											</button>
										{/if}
									</div>
								{/if}
							</div>
						</nav>
					</div>
				</div>
				<div class="docs-header-controls" onpointerdown={(event) => event.stopPropagation()}>
					<CurrencySelector />
					<LanguageSelector />
					<ThemeToggle />
					{#if $session.isPending}
						<div class="docs-auth-loading" aria-label="Loading session">
							<div class="docs-loading-spinner"></div>
						</div>
					{:else if $session.data}
						<div class="docs-user-menu-wrap">
							<button
								type="button"
								class="docs-avatar-button"
								onclick={toggleProfileMenu}
								aria-label="Open user menu"
								aria-expanded={showProfileMenu}
								bind:this={profileMenuTrigger}
							>
								{#if $session.data.user.image && !imageError}
									<img
										src={$session.data.user.image}
										alt={$session.data.user.name || 'User'}
										class="docs-user-avatar"
										onerror={handleImageError}
										referrerpolicy="no-referrer"
									/>
								{:else}
									<span class="docs-user-avatar-fallback">{getUserInitials($session.data.user.name)}</span>
								{/if}
							</button>

							{#if showProfileMenu}
								<div class="docs-profile-dropdown" onpointerdown={(event) => event.stopPropagation()}>
									<div class="docs-dropdown-header">
										<span class="docs-user-name">{$session.data.user.name || 'User'}</span>
										<span class="docs-user-email">{$session.data.user.email}</span>
									</div>
									<button
										type="button"
										class="docs-dropdown-item"
										onclick={() => void navigateToDashboard()}
									>
										Dashboard
									</button>
									<button type="button" class="docs-dropdown-item docs-dropdown-item--danger" onclick={signOut}
										>Sign Out</button
									>
								</div>
							{/if}
						</div>
					{:else}
						<button type="button" class="docs-auth-button" onclick={signIn}>Sign In</button>
					{/if}
				</div>
			</div>

			<div class="docs-toolbar-row docs-toolbar">
				<div class="docs-toolbar-group docs-toolbar-group--file-actions">
					<button
						type="button"
						class="docs-tool-button docs-tool-button--primary"
						onclick={openSaveDraftModal}
					>
						{$_('actions.save_draft')}
					</button>
					<button type="button" class="docs-tool-button" onclick={startNewInvoice}>
						<svg class="docs-tool-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
							<path
								fill-rule="evenodd"
								d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z"
								clip-rule="evenodd"
							/>
						</svg>
						<span class="docs-tool-label">New</span>
					</button>
					<button type="button" class="docs-tool-button" onclick={clearInvoice}>
						<svg class="docs-tool-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
							<path
								fill-rule="evenodd"
								d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0v2.43l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389 5.5 5.5 0 0 1 9.2-2.466l.312.312H11.766a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .533-.22Z"
								clip-rule="evenodd"
							/>
						</svg>
						<span class="docs-tool-label">Clear</span>
					</button>
				</div>
				<div class="docs-toolbar-spacer"></div>
				<div class="docs-toolbar-group">
					<button
						type="button"
						class="docs-tool-button"
						class:docs-tool-button--toggle-active={activeTab === 'preview'}
						onclick={() => setActiveTab(activeTab === 'edit' ? 'preview' : 'edit')}
						data-testid="workspace-toggle"
					>
						{activeTab === 'edit' ? 'Preview' : 'Editor'}
					</button>
				</div>
				<span class="docs-toolbar-divider" aria-hidden="true"></span>
				<div class="docs-toolbar-group docs-toolbar-group--controls">
					{#if activeTab === 'preview' || $viewMode === 'page'}
						<TemplateSelector />
						<PageSettingsSelector />
					{:else}
						<TemplateSelector />
						<ViewModeToggle />
					{/if}
				</div>
				<span class="docs-toolbar-divider" aria-hidden="true"></span>
				<div class="docs-toolbar-group">
					<button
						type="button"
						class="docs-tool-button"
						onclick={printPDF}
						disabled={isGeneratingPDF}
						aria-label={$_('invoice.print_pdf')}
					>
						{#if isGeneratingPDF && pdfAction === 'print'}
							<svg
								class="docs-tool-icon spin"
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
							<span class="docs-tool-label">Printing</span>
						{:else}
							<svg class="docs-tool-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
								<path d="M6 2a2 2 0 0 0-2 2v3h12V4a2 2 0 0 0-2-2H6Z" />
								<path
									fill-rule="evenodd"
									d="M4 8a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1v-3.5a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 15 12.5V16h1a3 3 0 0 0 3-3v-2a3 3 0 0 0-3-3H4Zm1.5 5.5V18a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2v-4.5a.5.5 0 0 0-.5-.5h-7a.5.5 0 0 0-.5.5Z"
									clip-rule="evenodd"
								/>
								<path d="M6 6.5h8v2H6v-2Z" />
							</svg>
							<span class="docs-tool-label">Print</span>
						{/if}
					</button>
					<button
						type="button"
						class="docs-tool-button"
						onclick={saveAsPDF}
						disabled={isGeneratingPDF}
						data-testid="download-pdf-desktop"
						aria-label={$_('invoice.save_pdf')}
					>
						{#if isGeneratingPDF && pdfAction === 'download'}
							<svg
								class="docs-tool-icon spin"
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
							<span class="docs-tool-label">Downloading</span>
						{:else}
							<svg class="docs-tool-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
								<path
									fill-rule="evenodd"
									d="M10 2a1 1 0 0 1 1 1v7.586l1.293-1.293a1 1 0 0 1 1.414 1.414l-3.006 3.006a1 1 0 0 1-1.414 0L6.28 10.707a1 1 0 0 1 1.414-1.414L9 10.586V3a1 1 0 0 1 1-1Zm-6 12a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Zm1 3a1 1 0 1 0 0 2h10a1 1 0 1 0 0-2H5Z"
									clip-rule="evenodd"
								/>
							</svg>
							<span class="docs-tool-label">Download</span>
						{/if}
					</button>
					{#if $session.data && invoice}
						<button
							type="button"
							class="docs-tool-button docs-tool-button--share"
							onclick={() => (showShareModal = true)}
							disabled={!isShareable}
							title={isShareable
								? 'Share Invoice'
								: 'Complete the invoice to enable sharing (requires: From, To, Invoice #, Date, and at least one item)'}
							aria-label="Share Invoice"
						>
							<svg class="docs-tool-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
								<path
									d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z"
								/>
								<path
									d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z"
								/>
							</svg>
							Share
						</button>
					{/if}
				</div>
			</div>
		</div>

		<div class="workspace-main">
			<aside class="invoice-sidebar docs-surface" aria-label="Saved invoices">
				<div class="invoice-sidebar__header">
					<h2>Invoices</h2>
					<button
						type="button"
						class="invoice-sidebar__add"
						onclick={startNewInvoice}
						aria-label="Add new invoice"
						title="Add new invoice"
					>
						+
					</button>
				</div>

				{#if isSidebarLoading && sidebarInvoices.length === 0}
					<p class="invoice-sidebar__empty">Loading invoices...</p>
				{:else if sidebarInvoices.length === 0}
					<p class="invoice-sidebar__empty">No invoices saved yet.</p>
				{:else}
					<ul class="invoice-sidebar__list">
						{#each sidebarInvoices as item (item.id)}
							<li class="invoice-sidebar__li">
								<button
									type="button"
									class="invoice-sidebar__item"
									class:invoice-sidebar__item--active={invoice?.id === item.id}
									onclick={() => void openSidebarInvoice(item.id)}
								>
									<svg
										class="invoice-sidebar__item-icon"
										viewBox="0 0 20 20"
										fill="currentColor"
										aria-hidden="true"
									>
										<path
											fill-rule="evenodd"
											d="M4.5 2.5A1.5 1.5 0 0 0 3 4v12a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 17 16V6.7a1.5 1.5 0 0 0-.44-1.06l-2.2-2.2A1.5 1.5 0 0 0 13.3 3H4.5Zm1.25 4a.75.75 0 0 1 .75-.75h7a.75.75 0 0 1 0 1.5h-7a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h7a.75.75 0 0 1 0 1.5h-7a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Z"
											clip-rule="evenodd"
										/>
									</svg>
									<span class="invoice-sidebar__item-text">{item.title}</span>
									{#if item.isDraft}
										<span class="invoice-sidebar__badge">Draft</span>
									{/if}
								</button>
								<button
									type="button"
									class="invoice-sidebar__delete"
									onclick={(e) => promptDeleteInvoice(item.id, item.title, e)}
									aria-label="Delete {item.title}"
									title="Delete invoice"
								>
									<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
										<path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" />
									</svg>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</aside>

			<div class="workspace-grid">
				{#if activeTab === 'edit'}
					<section class="workspace-panel editor-panel">
						<div class="panel-body">
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
					</section>
				{:else}
					<section class="workspace-panel preview-panel">
						<div class="panel-body preview-body">
							<div class="preview-canvas">
								<div bind:this={previewRef}>
									<InvoicePreviewWrapper {invoice} />
								</div>
							</div>
						</div>
					</section>
				{/if}
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

<!-- Share Invoice Modal -->
{#if showShareModal && invoice}
	<ShareInvoiceModal invoiceId={invoice.id} {invoice} onClose={() => (showShareModal = false)} />
{/if}

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

{#if deleteConfirmId}
	<div
		class="modal-backdrop"
		role="button"
		aria-label="Cancel delete"
		tabindex="0"
		onclick={cancelDelete}
		onkeydown={(e) => { if (e.key === 'Escape') cancelDelete(); }}
	>
		<div class="modal" role="dialog" aria-modal="true" onpointerdown={(e) => e.stopPropagation()}>
			<h2 class="modal-title">Delete Invoice</h2>
			<p class="modal-description">
				Are you sure you want to delete <strong>{deleteConfirmTitle}</strong>? This action cannot be undone.
			</p>
			<div class="modal-actions">
				<button class="modal-button cancel-button" onclick={cancelDelete}>
					No
				</button>
				<button class="modal-button delete-button" onclick={() => void confirmDeleteInvoice()}>
					Yes, Delete
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.workspace-shell {
		--workspace-inline-padding: var(--layout-gutter-desktop);
		display: flex;
		flex-direction: column;
		gap: 0;
		padding-top: 0.35rem;
		width: 100%;
		max-width: var(--layout-max-width);
		margin: 0 auto;
		padding-inline: var(--workspace-inline-padding);
	}

	.desktop-docs-chrome {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.docs-title-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.52rem 0.8rem;
		border-radius: 0;
		width: 100%;
	}

	.docs-title-cluster {
		display: flex;
		align-items: center;
		gap: 0.62rem;
		min-width: 0;
	}

	.docs-file-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.8rem;
		height: 1.8rem;
		border-radius: 0.45rem;
		background: color-mix(in srgb, var(--color-accent-blue) 14%, var(--color-bg-primary));
		color: var(--color-accent-blue);
		flex-shrink: 0;
	}

	.docs-file-icon {
		width: 1.06rem;
		height: 1.06rem;
	}

	.docs-title-stack {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
	}

	.docs-document-title {
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.25;
		color: var(--color-text-primary);
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
	}

	.docs-menu-bar {
		display: flex;
		align-items: center;
		gap: 0.2rem;
	}

	.docs-menu-wrap {
		position: relative;
	}

	.docs-menu-trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.22rem;
		padding: 0.24rem 0.44rem;
		border-radius: 0.4rem;
		border: 1px solid transparent;
		background: transparent;
		color: var(--color-text-primary);
		font-size: 0.8rem;
		font-weight: 500;
		line-height: 1.15;
		cursor: pointer;
		transition:
			background-color var(--motion-fast) var(--motion-ease),
			border-color var(--motion-fast) var(--motion-ease);
	}

	.docs-menu-trigger:hover {
		background: var(--color-bg-secondary);
		border-color: var(--color-border-primary);
	}

	.docs-menu-chevron {
		width: 0.72rem;
		height: 0.72rem;
		opacity: 0.72;
	}

	.docs-menu-dropdown {
		position: absolute;
		top: calc(100% + 0.32rem);
		left: 0;
		min-width: 170px;
		padding: 0.34rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--surface-paper-border);
		background: var(--surface-paper);
		box-shadow: var(--shadow-medium);
		z-index: 15;
		display: grid;
		gap: 0.12rem;
	}

	.docs-menu-option {
		display: flex;
		align-items: center;
		width: 100%;
		border: none;
		background: transparent;
		padding: 0.4rem 0.5rem;
		border-radius: 0.45rem;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--color-text-primary);
		cursor: pointer;
		text-align: left;
	}

	.docs-menu-option:hover:not(:disabled) {
		background: var(--color-bg-secondary);
	}

	.docs-menu-option:disabled {
		cursor: not-allowed;
		color: var(--color-text-soft);
	}

	.docs-menu-option--danger {
		color: var(--color-error);
	}

	.docs-menu-option--danger:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-error) 12%, var(--surface-paper));
	}

	.docs-menu-divider {
		height: 1px;
		background: var(--color-border-primary);
		margin: 0.18rem 0.22rem;
	}

	.docs-header-controls {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.docs-auth-button {
		padding: 0.4rem 0.75rem;
		border-radius: var(--radius-pill);
		border: 1px solid transparent;
		background: var(--color-accent-blue);
		color: #fff;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
	}

	.docs-auth-button:hover {
		background: var(--color-accent-hover);
	}

	.docs-auth-loading {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
	}

	.docs-loading-spinner {
		width: 1.05rem;
		height: 1.05rem;
		border: 2px solid var(--color-border-secondary);
		border-top-color: var(--color-accent-blue);
		border-radius: 999px;
		animation: spin 0.75s linear infinite;
	}

	.docs-user-menu-wrap {
		position: relative;
	}

	.docs-avatar-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: 1px solid var(--color-border-primary);
		border-radius: 999px;
		background: var(--color-bg-primary);
		cursor: pointer;
		overflow: hidden;
		padding: 0;
	}

	.docs-user-avatar {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.docs-user-avatar-fallback {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--color-accent-blue);
		background: color-mix(in srgb, var(--color-accent-blue) 15%, transparent);
	}

	.docs-profile-dropdown {
		position: absolute;
		right: 0;
		top: calc(100% + 0.42rem);
		width: 220px;
		padding: 0.5rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--surface-paper-border);
		background: var(--surface-paper);
		box-shadow: var(--shadow-medium);
		z-index: 20;
	}

	.docs-dropdown-header {
		display: flex;
		flex-direction: column;
		gap: 0.08rem;
		padding: 0.35rem 0.45rem;
		margin-bottom: 0.22rem;
		border-bottom: 1px solid var(--color-border-primary);
	}

	.docs-user-name {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.docs-user-email {
		font-size: 0.72rem;
		color: var(--color-text-secondary);
	}

	.docs-dropdown-item {
		display: block;
		width: 100%;
		border: none;
		background: transparent;
		padding: 0.46rem;
		border-radius: 0.45rem;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--color-text-primary);
		text-align: left;
		cursor: pointer;
	}

	.docs-dropdown-item:hover {
		background: var(--color-bg-secondary);
	}

	.docs-dropdown-item--danger {
		color: var(--color-error);
	}

	.docs-toolbar-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.2rem;
		padding: 0.25rem 0.5rem;
		border-radius: 0;
		border-top: 0;
		border-bottom: 1px solid var(--color-border-primary);
		background: var(--color-bg-secondary);
		width: 100%;
	}

	.docs-toolbar-group {
		display: inline-flex;
		align-items: center;
		gap: 0.1rem;
		flex-wrap: wrap;
	}

	.docs-toolbar-divider {
		width: 1px;
		height: 1.2rem;
		background: var(--color-border-primary);
		margin: 0 0.15rem;
		opacity: 0.6;
	}

	.docs-toolbar-spacer {
		flex: 1;
	}

	.docs-tool-button {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		height: 1.75rem;
		padding: 0 0.5rem;
		border-radius: 0.25rem;
		border: none;
		background: transparent;
		color: var(--color-text-primary);
		font-size: 0.78rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color var(--motion-fast) var(--motion-ease);
	}

	.docs-tool-button:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-text-primary) 8%, transparent);
	}

	.docs-tool-button:active:not(:disabled) {
		background: color-mix(in srgb, var(--color-text-primary) 14%, transparent);
	}

	.docs-tool-button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.docs-tool-button--primary {
		color: var(--color-accent-blue);
		font-weight: 600;
	}

	.docs-tool-button--primary:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-accent-blue) 10%, transparent);
	}

	.docs-tool-button--share {
		color: var(--color-accent-blue);
	}

	.docs-tool-button--share:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-accent-blue) 10%, transparent);
	}

	.docs-tool-button--toggle-active {
		background: color-mix(in srgb, var(--color-text-primary) 10%, transparent);
		color: var(--color-text-primary);
		font-weight: 600;
	}

	.docs-tool-icon {
		width: 0.88rem;
		height: 0.88rem;
	}

	.workspace-main {
		display: grid;
		grid-template-columns: minmax(220px, 270px) minmax(0, 1fr);
		gap: 0;
		min-height: calc(100vh - 170px);
	}

	.invoice-sidebar {
		display: flex;
		flex-direction: column;
		padding: 1rem 0.65rem 0.9rem;
		border-radius: 0;
		border-right: 1px solid var(--color-border-primary);
		background: var(--color-surface);
	}

	.invoice-sidebar__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0 0.35rem;
		margin-bottom: 0.65rem;
	}

	.invoice-sidebar__header h2 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 650;
		color: var(--color-text-primary);
	}

	.invoice-sidebar__add {
		width: 1.9rem;
		height: 1.9rem;
		border-radius: 0.42rem;
		border: 1px solid transparent;
		background: transparent;
		color: var(--color-text-primary);
		font-size: 1.2rem;
		line-height: 1;
		display: grid;
		place-items: center;
		cursor: pointer;
		transition:
			background-color var(--motion-fast) var(--motion-ease),
			border-color var(--motion-fast) var(--motion-ease);
	}

	.invoice-sidebar__add:hover {
		background: var(--color-bg-secondary);
		border-color: var(--color-border-primary);
	}

	.invoice-sidebar__empty {
		margin: 0;
		padding: 0.6rem 0.5rem;
		font-size: 0.82rem;
		color: var(--color-text-secondary);
	}

	.invoice-sidebar__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.25rem;
		overflow: auto;
	}

	.invoice-sidebar__item {
		width: 100%;
		border: 1px solid transparent;
		border-radius: 0.58rem;
		background: transparent;
		padding: 0.5rem 0.7rem;
		display: flex;
		align-items: center;
		gap: 0.45rem;
		color: var(--color-text-primary);
		cursor: pointer;
		text-align: left;
		transition:
			background-color var(--motion-fast) var(--motion-ease),
			border-color var(--motion-fast) var(--motion-ease),
			color var(--motion-fast) var(--motion-ease);
	}

	.invoice-sidebar__item:hover {
		background: color-mix(in srgb, var(--color-accent-blue) 9%, var(--color-bg-primary));
		border-color: color-mix(in srgb, var(--color-accent-blue) 24%, transparent);
	}

	.invoice-sidebar__item--active {
		background: color-mix(in srgb, var(--color-accent-blue) 22%, var(--color-bg-primary));
		color: color-mix(in srgb, var(--color-accent-blue) 82%, #0f172a);
	}

	.invoice-sidebar__item-icon {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		opacity: 0.9;
	}

	.invoice-sidebar__item-text {
		font-size: 0.84rem;
		font-weight: 550;
		line-height: 1.2;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.invoice-sidebar__badge {
		margin-left: auto;
		padding: 0.14rem 0.45rem;
		border-radius: 0.42rem;
		font-size: 0.66rem;
		font-weight: 650;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		color: var(--color-accent-blue);
		background: color-mix(in srgb, var(--color-accent-blue) 14%, #fff);
	}

	.invoice-sidebar__li {
		display: flex;
		align-items: center;
		min-width: 0;
	}

	.invoice-sidebar__li .invoice-sidebar__item {
		flex: 1 1 0%;
		width: 0;
		min-width: 0;
	}

	.invoice-sidebar__delete {
		width: 1.5rem;
		height: 1.5rem;
		flex-shrink: 0;
		border-radius: 0.35rem;
		border: none;
		background: transparent;
		color: var(--color-text-soft);
		display: grid;
		place-items: center;
		cursor: pointer;
		opacity: 0;
		padding: 0;
		transition:
			opacity var(--motion-fast) var(--motion-ease),
			background-color var(--motion-fast) var(--motion-ease),
			color var(--motion-fast) var(--motion-ease);
	}

	.invoice-sidebar__delete svg {
		width: 0.82rem;
		height: 0.82rem;
	}

	.invoice-sidebar__li:hover .invoice-sidebar__delete {
		opacity: 1;
	}

	.invoice-sidebar__delete:hover {
		background: color-mix(in srgb, var(--color-error) 14%, var(--color-bg-primary));
		color: var(--color-error);
	}

	.delete-button {
		background-color: var(--color-error);
		color: white;
	}

	.delete-button:hover {
		background-color: color-mix(in srgb, var(--color-error) 88%, #000);
	}

	.workspace-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0;
		background: var(--color-surface);
	}

	.workspace-panel {
		display: flex;
		flex-direction: column;
		min-height: 0;
		background: var(--color-surface);
		border: 0;
		border-radius: 0;
		box-shadow: none;
	}

	.panel-body {
		padding: 0;
		background: var(--color-surface);
	}

	.preview-body {
		padding-top: 0.35rem;
	}

	.preview-canvas {
		padding: 0;
		background: transparent;
		border: 0;
		border-radius: 0;
	}

	.spin {
		animation: spin 0.9s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 1024px) {
		.workspace-shell {
			--workspace-inline-padding: var(--layout-gutter-tablet);
		}
	}

	@media (max-width: 768px) {
		.workspace-shell {
			--workspace-inline-padding: var(--layout-gutter-mobile);
		}

		.workspace-main {
			grid-template-columns: 1fr;
			gap: 0;
			min-height: auto;
		}

		.invoice-sidebar {
			display: none;
		}

		.docs-toolbar-row {
			gap: 0.15rem;
			padding: 0.2rem 0.35rem;
			flex-wrap: nowrap;
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
			scrollbar-width: none;
		}

		.docs-toolbar-row::-webkit-scrollbar {
			display: none;
		}

		.docs-tool-button {
			height: 1.6rem;
			padding: 0 0.4rem;
			font-size: 0.74rem;
			flex-shrink: 0;
		}

		.docs-tool-button .docs-tool-label {
			display: none;
		}

		.docs-toolbar-spacer {
			display: none;
		}

		.docs-toolbar-divider {
			flex-shrink: 0;
		}

		.docs-toolbar-group {
			flex-shrink: 0;
			flex-wrap: nowrap;
		}

		.docs-toolbar-group--controls {
			flex-shrink: 1;
			min-width: 0;
		}

		.docs-toolbar-group--file-actions {
			display: none;
		}

		.docs-title-row {
			flex-direction: column;
			align-items: stretch;
		}

		.docs-header-controls {
			justify-content: flex-start;
		}

		.panel-body {
			padding: 0;
		}

		.preview-canvas {
			padding: 0;
		}
	}

	@media (min-width: 1024px) {
		.workspace-grid {
			grid-template-columns: minmax(0, 1fr);
			align-items: start;
		}

		.workspace-panel {
			min-height: calc(100vh - 130px);
		}

		.preview-canvas {
			min-height: 600px;
		}
	}

	@media (min-width: 769px) {
		.desktop-docs-chrome {
			display: flex;
		}

		.docs-toolbar-row {
			display: flex;
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
	}

	.modal {
		background: var(--surface-paper);
		padding: 2rem;
		border-radius: var(--radius-lg);
		max-width: 450px;
		width: 90%;
		border: 1px solid var(--surface-paper-border);
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
		border: 1px solid var(--surface-paper-border);
		border-radius: var(--radius-md);
		background: var(--surface-paper-muted);
		color: var(--color-text-primary);
		font-size: 0.9375rem;
		margin-bottom: 1.5rem;
		transition: border-color 0.2s ease;
	}

	.modal-input:focus {
		outline: none;
		border-color: var(--color-accent, #3b82f6);
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
		background-color: var(--surface-paper-muted);
		color: var(--color-text-secondary);
		border-color: var(--surface-paper-border);
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
		outline: 2px solid rgba(59, 130, 246, 0.3);
		outline-offset: 1px;
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
