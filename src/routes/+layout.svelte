<script>
	import { isLoading } from 'svelte-i18n';
	import '$lib/i18n/setup.js'; // Initialize i18n at module load
	import Header from '$components/Header.svelte';
	import '../app.css';

	let { children } = $props();
</script>

{#if $isLoading}
	<div class="flex items-center justify-center min-h-screen loading-screen">
		<div class="text-gray-600 dark:text-gray-400">Loading...</div>
	</div>
{:else}
	<div class="page-shell">
		<Header />
		<main>
			{@render children()}
		</main>
	</div>
{/if}

<style>
	.page-shell {
		min-height: 100vh;
		background-color: var(--surface-page-background);
		background-image: radial-gradient(circle at top, color-mix(in srgb, var(--surface-page-background) 92%, white 8%), transparent 65%);
	}

	.loading-screen {
		background-color: var(--surface-page-background);
	}
</style>
