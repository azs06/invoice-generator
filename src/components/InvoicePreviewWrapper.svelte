<script>
	import { onMount } from 'svelte';
	import { selectedTemplateId } from '../stores/templateStore.js';
	import { getTemplate } from '$lib/templates/registry.js';
	import { totalAmounts } from '$lib/InvoiceCalculator.js';

	let { invoice } = $props();

	let currentTemplate = $state(null);
	let TemplateComponent = $state(null);
	let totals = $state({});

	// Calculate totals for invoice
	const calculateTotals = () => {
		const subTotal = invoice.items?.reduce(
			(sum, item) => sum + (item.amount ?? (item.price || 0) * (item.quantity || 0)),
			0
		) || 0;
		
		const total = totalAmounts(invoice, subTotal);
		const balanceDue = total - (invoice.amountPaid || 0);

		return {
			subTotal,
			total,
			balanceDue
		};
	};

	// Load template component when template ID changes
	const loadTemplate = async (templateId) => {
		try {
			const template = getTemplate(templateId);
			if (template) {
				const module = await template.component();
				TemplateComponent = module.default;
				currentTemplate = template;
			}
		} catch (error) {
			console.error('Failed to load template:', templateId, error);
			// Fallback to modern template
			const fallbackTemplate = getTemplate('modern');
			if (fallbackTemplate) {
				const module = await fallbackTemplate.component();
				TemplateComponent = module.default;
				currentTemplate = fallbackTemplate;
			}
		}
	};

	// Initialize template
	onMount(async () => {
		// Calculate initial totals
		totals = calculateTotals();

		// Load template
		const templateId = $selectedTemplateId || 'modern';
		await loadTemplate(templateId);
	});

	// React to template changes
	$effect(() => {
		if ($selectedTemplateId) {
			loadTemplate($selectedTemplateId);
		}
	});

	// React to invoice changes
	$effect(() => {
		if (invoice) {
			totals = calculateTotals();
		}
	});
</script>

{#if TemplateComponent && invoice}
	<div class="template-wrapper">
		<svelte:component this={TemplateComponent} {invoice} {totals} />
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