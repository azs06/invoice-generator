<script lang="ts">
	import { onMount } from 'svelte';
	import { selectedTemplateId } from '../stores/templateStore.js';
	import { pageSettings, currentPageDimensions, PAGE_SIZES } from '../stores/pageSettingsStore.js';
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

	onMount(async () => {
		totals = calculateTotals(invoice);
		const templateId = $selectedTemplateId || 'modern';
		await loadTemplate(templateId);
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
</script>

{#if TemplateComponent && invoice}
	<div class="preview-container">
		<div class="page-size-indicator" aria-label="Current page size">
			{$currentPageDimensions.label}
		</div>
		<div
			class="template-wrapper"
			style="--page-width: {$currentPageDimensions.width}; --page-height: {$currentPageDimensions.height}; --margin-top: {$pageSettings
				.margins.top}mm; --margin-right: {$pageSettings.margins
				.right}mm; --margin-bottom: {$pageSettings.margins.bottom}mm; --margin-left: {$pageSettings
				.margins.left}mm;"
		>
			<TemplateComponent {invoice} {totals} />
		</div>
	</div>
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
	}

	.page-size-indicator {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		z-index: 10;
		padding: 0.25rem 0.625rem;
		background: rgba(0, 0, 0, 0.65);
		color: white;
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		border-radius: 9999px;
		backdrop-filter: blur(4px);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
		pointer-events: none;
	}

	.template-wrapper {
		display: flex;
		flex-direction: column;
		width: var(--page-width, 210mm);
		min-height: var(--page-height, 297mm);
		margin: 0 auto;
		background: white;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -2px rgba(0, 0, 0, 0.1);
		transform-origin: top center;
		padding: var(--margin-top, 10mm) var(--margin-right, 10mm) var(--margin-bottom, 10mm)
			var(--margin-left, 10mm);
		box-sizing: border-box;
	}

	/* Responsive scaling for smaller viewports */
	@media (max-width: 900px) {
		.template-wrapper {
			/* Scale down to fit viewport with some margin */
			--scale: calc((100vw - 2rem) / var(--page-width, 210mm));
			transform: scale(var(--scale));
			margin-bottom: calc((var(--page-height, 297mm) * var(--scale)) - var(--page-height, 297mm));
		}
	}

	/* Print styles - ensure full page size */
	@media print {
		.preview-container {
			display: block;
		}

		.page-size-indicator {
			display: none !important;
		}

		.template-wrapper {
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
</style>
