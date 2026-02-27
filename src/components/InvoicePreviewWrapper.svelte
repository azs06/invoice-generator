<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { selectedTemplateId } from '../stores/templateStore.js';
	import {
		pageSettings,
		currentPageDimensions,
		PAGE_SIZES,
		viewMode,
		setViewMode
	} from '../stores/pageSettingsStore.js';
	import { getTemplate } from '$lib/templates/registry.js';
	import { totalAmounts } from '$lib/InvoiceCalculator.js';
	import type { InvoiceData, InvoiceTotals } from '$lib/types';
	import type { TemplateMetadata } from '$lib/templates/registry.js';

	interface Props {
		invoice: InvoiceData;
	}

	let { invoice }: Props = $props();

	let currentTemplate = $state<TemplateMetadata | null>(null);
	let TemplateComponent = $state<any>(null);
	let totals = $state<InvoiceTotals>({ subTotal: 0, total: 0, balanceDue: 0 });

	// Mobile detection state
	let isMobile = $state(false);
	const MOBILE_BREAKPOINT = 768;

	// Responsive scaling state (only used in page view mode)
	let containerRef = $state<HTMLDivElement | null>(null);
	let scale = $state(1);
	let scaledHeight = $state<string | null>(null);

	// Convert mm to pixels (1mm ≈ 3.7795px at 96 DPI)
	const MM_TO_PX = 3.7795;

	const parsePageWidth = (width: string): number => {
		const value = parseFloat(width);
		if (width.endsWith('mm')) {
			return value * MM_TO_PX;
		}
		return value;
	};

	const parsePageHeight = (height: string): number => {
		const value = parseFloat(height);
		if (height.endsWith('mm')) {
			return value * MM_TO_PX;
		}
		return value;
	};

	const calculateScale = (): void => {
		if (!containerRef || !browser) return;

		const containerWidth = containerRef.clientWidth;
		const pageWidthPx = parsePageWidth($currentPageDimensions.width);
		const pageHeightPx = parsePageHeight($currentPageDimensions.height);

		// Add some padding (16px on each side)
		const availableWidth = containerWidth - 32;

		// Calculate scale, never exceed 1.0
		const newScale = Math.min(1, availableWidth / pageWidthPx);
		scale = newScale;

		// Calculate the scaled height for the container
		if (newScale < 1) {
			scaledHeight = `${pageHeightPx * newScale}px`;
		} else {
			scaledHeight = null;
		}
	};

	const calculateTotals = (value: InvoiceData): InvoiceTotals => {
		const subTotal =
			value.items?.reduce((sum, item) => {
				const itemAmount = item.amount ?? (item.price || 0) * (item.quantity || 0);
				return sum + itemAmount;
			}, 0) || 0;

		const total = totalAmounts(value, subTotal);
		const balanceDue = total - (value.amountPaid || 0);

		return {
			subTotal,
			total,
			balanceDue
		};
	};

	const loadTemplate = async (templateId: string): Promise<void> => {
		try {
			const template = getTemplate(templateId);
			if (template) {
				const module = await template.component();
				TemplateComponent = module.default;
				currentTemplate = template;
			}
		} catch (error) {
			console.error('Failed to load template:', templateId, error);
			const fallbackTemplate = getTemplate('modern');
			if (fallbackTemplate) {
				const module = await fallbackTemplate.component();
				TemplateComponent = module.default;
				currentTemplate = fallbackTemplate;
			}
		}
	};

	let resizeObserver: ResizeObserver | null = null;
	let mediaQueryHandler: ((e: MediaQueryListEvent) => void) | null = null;
	let mediaQuery: MediaQueryList | null = null;

	onMount(() => {
		totals = calculateTotals(invoice);
		const templateId = $selectedTemplateId || 'modern';
		loadTemplate(templateId);

		// Set up mobile detection
		if (browser) {
			mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
			isMobile = mediaQuery.matches;

			// Keep the user's current mobile choice; only force desktop default page mode.
			if (!isMobile && $viewMode === 'responsive') {
				setViewMode('page');
			}

			// Listen for screen size changes
			mediaQueryHandler = (e: MediaQueryListEvent) => {
				isMobile = e.matches;
				// Auto-switch view mode when crossing breakpoint
				setViewMode(e.matches ? 'responsive' : 'page');
			};
			mediaQuery.addEventListener('change', mediaQueryHandler);
		}

		return () => {
			if (resizeObserver) {
				resizeObserver.disconnect();
			}
			if (mediaQuery && mediaQueryHandler) {
				mediaQuery.removeEventListener('change', mediaQueryHandler);
			}
		};
	});

	// Set up ResizeObserver when container ref is available (only in page view mode)
	$effect(() => {
		if (containerRef && browser && $viewMode === 'page') {
			calculateScale();

			resizeObserver = new ResizeObserver(() => {
				calculateScale();
			});

			resizeObserver.observe(containerRef);

			return () => {
				if (resizeObserver) {
					resizeObserver.disconnect();
					resizeObserver = null;
				}
			};
		}
	});

	$effect(() => {
		if ($selectedTemplateId) {
			loadTemplate($selectedTemplateId);
		}
	});

	$effect(() => {
		if (invoice) {
			totals = calculateTotals(invoice);
		}
	});

	// Recalculate scale when page dimensions change (only in page view mode)
	$effect(() => {
		if ($currentPageDimensions && containerRef && $viewMode === 'page') {
			calculateScale();
		}
	});
</script>

{#if TemplateComponent && invoice}
	{#if $viewMode === 'responsive'}
		<!-- Responsive mode: no fixed dimensions, content flows naturally -->
		<div class="preview-container responsive-mode">
			<div class="template-wrapper responsive">
				<TemplateComponent {invoice} {totals} />
			</div>
		</div>
	{:else}
		<!-- Page view mode: fixed dimensions with scaling -->
		<div class="preview-container page-mode" bind:this={containerRef}>
			<div class="page-size-indicator" aria-label="Current page size">
				{$currentPageDimensions.label}
			</div>
			<div
				class="scale-wrapper"
				style="--scale: {scale}; --page-width: {$currentPageDimensions.width}; --page-height: {$currentPageDimensions.height};"
			>
				<div
					class="template-wrapper page"
					style="--scale: {scale}; --page-width: {$currentPageDimensions.width}; --page-height: {$currentPageDimensions.height}; --margin-top: {$pageSettings
						.margins.top}mm; --margin-right: {$pageSettings.margins
						.right}mm; --margin-bottom: {$pageSettings.margins
						.bottom}mm; --margin-left: {$pageSettings.margins.left}mm;"
				>
					<TemplateComponent {invoice} {totals} />
				</div>
			</div>
		</div>
	{/if}
{:else}
	<div class="template-loading">
		<p>Loading template...</p>
	</div>
{/if}

<style>
	.preview-container {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		width: 100%;
	}

	/* Responsive mode container */
	.preview-container.responsive-mode {
		align-items: stretch;
	}

	/* Page mode container - centers the scaled content */
	.preview-container.page-mode {
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		justify-content: center;
		width: 100%;
		max-width: 100%;
		overflow-x: hidden;
		padding: 1rem 0.5rem 0.8rem;
	}

	.page-size-indicator {
		position: absolute;
		top: 0.2rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 10;
		padding: 0.2rem 0.52rem;
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		color: var(--color-text-secondary);
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		border-radius: var(--radius-pill);
		pointer-events: none;
	}

	/* Scale wrapper - takes scaled dimensions for proper centering */
	.scale-wrapper {
		/* Width and height are scaled versions of the page dimensions */
		width: calc(var(--page-width, 210mm) * var(--scale, 1));
		height: calc(var(--page-height, 297mm) * var(--scale, 1));
		max-width: 100%;
		position: relative;
		overflow: visible;
	}

	/* Responsive mode: fluid width, no fixed dimensions */
	.template-wrapper.responsive {
		display: flex;
		flex-direction: column;
		width: 100%;
		background: white;
		border: 1px solid var(--color-border-primary, #dfe1e5);
		border-radius: var(--radius-md, 0.75rem);
		box-shadow: var(--shadow-soft);
		box-sizing: border-box;
	}

	/* Page view mode: fixed dimensions with scaling */
	.template-wrapper.page {
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		width: var(--page-width, 210mm);
		min-height: var(--page-height, 297mm);
		background: white;
		border: 1px solid var(--color-border-primary, #dfe1e5);
		border-radius: var(--radius-sm, 0.5rem);
		overflow: hidden;
		box-shadow: 0 6px 22px rgba(60, 64, 67, 0.16);
		transform: scale(var(--scale, 1));
		transform-origin: top left;
		padding: var(--margin-top, 10mm) var(--margin-right, 10mm) var(--margin-bottom, 10mm)
			var(--margin-left, 10mm);
		box-sizing: border-box;
		position: absolute;
		top: 0;
		left: 0;
	}

	/* Print styles - ensure full page size */
	@media print {
		.preview-container {
			display: block;
		}

		.page-size-indicator {
			display: none !important;
		}

		.scale-wrapper {
			width: var(--page-width, 210mm) !important;
			height: var(--page-height, 297mm) !important;
		}

		.template-wrapper.page {
			position: static;
			transform: none !important;
			box-shadow: none;
			border-radius: 0 !important;
		}

		.template-wrapper.responsive {
			width: var(--page-width, 210mm);
			min-height: var(--page-height, 297mm);
			margin: 0;
			box-shadow: none;
			transform: none;
			border-radius: 0 !important;
		}
	}

	.template-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 200px;
		color: var(--color-text-secondary);
	}

	@media (max-width: 768px) {
		.preview-container.page-mode {
			padding-top: 0.75rem;
		}

		.page-size-indicator {
			top: 0;
		}
	}
</style>
