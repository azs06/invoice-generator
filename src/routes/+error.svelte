<script lang="ts">
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>Page Not Found — FreeInvoice</title>
</svelte:head>

<div class="error-page">
	<div class="error-content">
		<span class="error-code">{$page.status}</span>
		<h1 class="error-title">
			{#if $page.status === 404}
				Page not found
			{:else}
				Something went wrong
			{/if}
		</h1>
		<p class="error-message">
			{#if $page.error?.message}
				{$page.error.message}
			{:else if $page.status === 404}
				The page you're looking for doesn't exist or has been moved.
			{:else}
				An unexpected error occurred. Please try again.
			{/if}
		</p>
		<a href="/" class="home-link">Back to Home</a>
	</div>
</div>

<style>
	.error-page {
		display: grid;
		place-items: center;
		min-height: 80vh;
		padding: 2rem;
		background: var(--surface-page-background);
	}

	.error-content {
		text-align: center;
		max-width: 28rem;
	}

	.error-code {
		display: block;
		font-size: 5rem;
		font-weight: 800;
		line-height: 1;
		color: var(--color-accent, #2563eb);
		margin-bottom: 0.5rem;
	}

	.error-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 0.75rem;
	}

	.error-message {
		font-size: 0.95rem;
		color: var(--color-text-secondary);
		margin: 0 0 2rem;
		line-height: 1.5;
	}

	.home-link {
		display: inline-block;
		padding: 0.6rem 1.5rem;
		background: var(--color-accent, #2563eb);
		color: #fff;
		border-radius: 0.5rem;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.9rem;
		transition: opacity 0.15s;
	}

	.home-link:hover {
		opacity: 0.9;
	}
</style>
