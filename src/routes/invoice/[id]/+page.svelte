<script>
	import { page } from '$app/state';
	// onMount is no longer needed for this data loading pattern with runes
	import { getInvoice } from '$lib/db.js';
	import { goto } from '$app/navigation';
	import InvoicePreviewComponent from '$components/InvoicePreviewComponent.svelte';

	export const prerender = true;
	let invoice = $state(null); // Use $state for reactive invoice data

	const id = $derived(() => page.params.id);

	// This effect will run when `id` changes, and also on initial mount if `id` is present.
	$effect(() => {
		// Ensure `id` is available and we're on the client-side before fetching
		if (id && typeof window !== 'undefined') {
			loadInvoiceData(id);
		}
	});

	const loadInvoiceData = async (currentId) => {
		const data = await getInvoice(currentId);
		if (data) {
			invoice = data;
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
