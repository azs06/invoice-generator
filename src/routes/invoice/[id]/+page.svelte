

<script>
	'use runes';
	import { page } from '$app/state';
	// onMount is no longer needed for this data loading pattern with runes
	import { getInvoice } from '$lib/db.js';
	import { goto } from '$app/navigation';
	import InvoicePreviewComponent from '$components/InvoicePreviewComponent.svelte';
	/** @typedef {import('$lib/types').InvoiceData} InvoiceData */

	let invoice = $state(/** @type {InvoiceData | null} */ (null)); // Use $state for reactive invoice data

	// This effect will run when `id` changes, and also on initial mount if `id` is present.
	$effect(() => {
		// Ensure `id` is available and we're on the client-side before fetching
		const currentId = page.params.id;
		if (currentId && typeof window !== 'undefined') {
			loadInvoiceData(currentId);
		}
	});

	/**
	 * @param {string} currentId
	 */
	const loadInvoiceData = async (currentId) => {
		const data = await getInvoice(currentId);
		if (data) {
			invoice = /** @type {InvoiceData} */ (data);
		} else {
			// Invoice not found, or error during fetch
			goto('/saved-invoices');
		}
	};
</script>

{#if invoice}
	<section class="container">
		<h1 class="title">Invoice Preview</h1>
		<InvoicePreviewComponent {invoice} />
	</section>
{:else}
	<p>Loading invoice...</p>
{/if}

<style>
	.container {
		padding: 2rem;
	}
	.title {
		font-size: 2rem;
		margin-bottom: 2rem;
		text-align: center;
	}
</style>
