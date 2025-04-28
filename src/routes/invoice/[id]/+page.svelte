<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import InvoicePreviewComponent from '$components/InvoicePreviewComponent.svelte';
	import { getInvoice } from '$lib/db.js';
	import { goto } from '$app/navigation';

	let invoice = null;

	$: id = $page.params.id;

	const loadInvoice = async () => {
		const data = await getInvoice(id);
		if (data) {
			invoice = data;
		} else {
			goto('/saved-invoices');
		}
	};

	onMount(() => {
		loadInvoice();
	});
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
