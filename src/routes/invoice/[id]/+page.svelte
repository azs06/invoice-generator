<script lang="ts">
	import { page } from '$app/state';
	import { getInvoice } from '$lib/db.js';
	import { goto } from '$app/navigation';
	import InvoicePreviewComponent from '$components/InvoicePreviewComponent.svelte';
	import type { InvoiceData } from '$lib/types';

	let invoice = $state<InvoiceData | null>(null);

	// This effect will run when `id` changes, and also on initial mount if `id` is present.
	$effect(() => {
		// Ensure `id` is available and we're on the client-side before fetching
		const currentId = page.params.id;
		if (currentId && typeof window !== 'undefined') {
			loadInvoiceData(currentId);
		}
	});

	const loadInvoiceData = async (currentId: string): Promise<void> => {
		const data = await getInvoice(currentId);
		if (data) {
			invoice = data as InvoiceData;
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
