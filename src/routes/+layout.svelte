<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { isLoading } from 'svelte-i18n';
	import '$lib/i18n/setup.js'; // Initialize i18n at module load
	import Header from '$components/Header.svelte';
	import AppFooter from '$components/AppFooter.svelte';
	import '../app.css';
	import { page } from '$app/stores';

	interface Props {
		children: Snippet;
		data: LayoutData;
	}

	let { children, data }: Props = $props();

	// Check for ban/delete message in URL
	const accountStatus = $derived($page.url.searchParams.get('account'));

	// Check if we're on a shared route (no app chrome)
	const isSharedRoute = $derived($page.url.pathname.startsWith('/shared'));
	const isDashboardRoute = $derived($page.url.pathname.startsWith('/dashboard'));
</script>

{#if $isLoading}
	<div class="flex items-center justify-center min-h-screen loading-screen">
		<div class="text-gray-600 dark:text-gray-400">Loading...</div>
	</div>
{:else if isSharedRoute}
	<!-- Shared routes get a clean layout without app Header/Footer -->
	{@render children()}
{:else}
	<div class="page-shell" class:dashboard-shell={isDashboardRoute}>
		{#if accountStatus === 'banned'}
			<div class="account-banner banned">
				<svg viewBox="0 0 20 20" fill="currentColor" class="banner-icon">
					<path
						fill-rule="evenodd"
						d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
						clip-rule="evenodd"
					/>
				</svg>
				<span
					>Your account has been suspended. Please contact support if you believe this is an error.</span
				>
			</div>
		{:else if accountStatus === 'deleted'}
			<div class="account-banner deleted">
				<svg viewBox="0 0 20 20" fill="currentColor" class="banner-icon">
					<path
						fill-rule="evenodd"
						d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
						clip-rule="evenodd"
					/>
				</svg>
				<span>Your account has been deleted.</span>
			</div>
		{/if}
		<Header isAdmin={data.isAdmin} />
		<main>
			{@render children()}
		</main>
		<AppFooter />
	</div>
{/if}

<style>
	.page-shell {
		min-height: 100vh;
		background-color: var(--surface-page-background);
	}

	.page-shell.dashboard-shell {
		background-color: var(--color-bg-primary);
		background-image: none;
	}

	:global(.page-shell.dashboard-shell .app-footer) {
		margin-top: 0;
		background: var(--color-bg-primary);
		border-top-color: var(--color-border-primary);
	}

	.loading-screen {
		background-color: var(--surface-page-background);
	}

	.account-banner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1.5rem;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.account-banner.banned {
		background: #fef2f2;
		color: #991b1b;
		border-bottom: 1px solid #fecaca;
	}

	.account-banner.deleted {
		background: #fefce8;
		color: #854d0e;
		border-bottom: 1px solid #fef08a;
	}

	.banner-icon {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
	}

	:global([data-theme='dark']) .account-banner.banned {
		background: rgba(127, 29, 29, 0.3);
		color: #fca5a5;
		border-bottom-color: rgba(248, 113, 113, 0.2);
	}

	:global([data-theme='dark']) .account-banner.deleted {
		background: rgba(113, 63, 18, 0.3);
		color: #fcd34d;
		border-bottom-color: rgba(253, 224, 71, 0.2);
	}
</style>
