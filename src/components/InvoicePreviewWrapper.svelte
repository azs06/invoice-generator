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
		width: 100%;
		height: 100%;
	}

	.template-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 200px;
		color: var(--color-text-secondary);
	}
</style>
