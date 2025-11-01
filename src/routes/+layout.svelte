<script>
	import { isLoading } from 'svelte-i18n';
	import '$lib/i18n/setup.js'; // Initialize i18n at module load
	import Header from '$components/Header.svelte';
	import '../app.css';

	let { children } = $props();
</script>

{#if $isLoading}
	<div class="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
		<div class="text-gray-600 dark:text-gray-400">Loading...</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50 dark:bg-gray-950">
		<Header />
		<main>
			{@render children()}
		</main>
	</div>
{/if}
