<script>
	'use runes';
	import { onMount } from 'svelte';
	import { selectedTemplateId } from '../stores/templateStore.js';
	import { getTemplate } from '$lib/templates/registry.js';
	import { totalAmounts } from '$lib/InvoiceCalculator.js';

	/** @typedef {import('$lib/types').InvoiceData} InvoiceData */
	/** @typedef {import('$lib/types').InvoiceTotals} InvoiceTotals */
	/** @typedef {{ invoice: InvoiceData }} $$Props */

	let { invoice } = $props();

	/** @type {any} */
	let currentTemplate = $state(null);
	let TemplateComponent = $state(/** @type {any} */ (null));
	let totals = $state(/** @type {InvoiceTotals} */ ({ subTotal: 0, total: 0, balanceDue: 0 }));

	/**
	 * @param {InvoiceData} value
	 * @returns {InvoiceTotals}
	 */
	const calculateTotals = (value) => {
		const subTotal = value.items?.reduce((sum, item) => {
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

	/**
	 * @param {string} templateId
	 */
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
