<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import InvoicePreviewComponent from '$components/InvoicePreviewComponent.svelte';
	import type { InvoiceData } from '$lib/types';

	let { data } = $props();
	let invoice = $state<InvoiceData | null>(data.invoice);

	$effect(() => {
		invoice = data.invoice;
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
