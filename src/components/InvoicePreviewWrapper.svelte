<script lang="ts">
	import { onMount } from 'svelte';
	import { selectedTemplateId } from '../stores/templateStore.js';
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
	<div class="template-wrapper">
		<TemplateComponent {invoice} {totals} />
	</div>
{:else}
	<div class="template-loading">
		<p>Loading template...</p>
	</div>
{/if}

<style>
	.template-wrapper {
		/* A4 dimensions: 210mm x 297mm */
		--a4-width: 210mm;
		--a4-height: 297mm;
		/* Pixel equivalents at 96dpi for reference: 794px x 1123px */

		display: flex;
		flex-direction: column;
		width: var(--a4-width);
		min-height: var(--a4-height);
		margin: 0 auto;
		background: white;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -2px rgba(0, 0, 0, 0.1);
		transform-origin: top center;
	}

	/* Responsive scaling for smaller viewports */
	@media (max-width: 900px) {
		.template-wrapper {
			/* Scale down to fit viewport with some margin */
			--scale: calc((100vw - 2rem) / 210mm);
			transform: scale(var(--scale));
			margin-bottom: calc((var(--a4-height) * var(--scale)) - var(--a4-height));
		}
	}

	/* Print styles - ensure full A4 size */
	@media print {
		.template-wrapper {
			width: 210mm;
			min-height: 297mm;
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
