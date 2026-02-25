<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { isLoading } from 'svelte-i18n';
	import '$lib/i18n/setup.js';
	import Header from '$components/Header.svelte';
	import AppFooter from '$components/AppFooter.svelte';
	import { page } from '$app/stores';
	import '../app.css';

	interface Props {
		children: Snippet;
		data: LayoutData;
	}

	let { children, data }: Props = $props();

	const accountStatus = $derived($page.url.searchParams.get('account'));
	const isSharedRoute = $derived($page.url.pathname.startsWith('/shared'));
	const isEditorRoute = $derived($page.url.pathname === '/');
	const isDashboardRoute = $derived($page.url.pathname.startsWith('/dashboard'));
	const isAdminRoute = $derived($page.url.pathname.startsWith('/admin'));
	const isConsoleRoute = $derived(isDashboardRoute || isAdminRoute);
</script>

{#if $isLoading}
	<div class="loading-screen">
		<div class="loading-text">Loading...</div>
	</div>
{:else if isSharedRoute}
	{@render children()}
{:else}
	<div class="page-shell" class:console-shell={isConsoleRoute}>
		{#if accountStatus === 'banned'}
			<div class="account-banner banned">
				<span class="banner-dot" aria-hidden="true"></span>
				<span
					>Your account has been suspended. Please contact support if you believe this is an error.</span
				>
			</div>
		{:else if accountStatus === 'deleted'}
			<div class="account-banner deleted">
				<span class="banner-dot" aria-hidden="true"></span>
				<span>Your account has been deleted.</span>
			</div>
		{/if}

		{#if !isEditorRoute}
			<Header isAdmin={data.isAdmin} />
		{/if}
		<main class="page-main">
			{@render children()}
		</main>
		{#if !isEditorRoute}
			<AppFooter />
		{/if}
	</div>
{/if}

<style>
	.page-shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background:
			radial-gradient(
				circle at top left,
				color-mix(in srgb, var(--color-accent) 6%, transparent),
				transparent 40%
			),
			var(--surface-page-background);
	}

	.page-shell.console-shell {
		background: var(--surface-page-background);
	}

	.page-main {
		flex: 1;
	}

	.loading-screen {
		display: grid;
		place-items: center;
		min-height: 100vh;
		background: var(--surface-page-background);
	}

	.loading-text {
		color: var(--color-text-secondary);
		font-size: 0.9rem;
		font-weight: 600;
	}

	.account-banner {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.7rem 1.15rem;
		font-size: 0.82rem;
		font-weight: 600;
		border-bottom: 1px solid var(--color-border-primary);
	}

	.account-banner .banner-dot {
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 999px;
		background: currentColor;
	}

	.account-banner.banned {
		background: color-mix(in srgb, var(--color-error) 16%, transparent);
		color: var(--color-error);
	}

	.account-banner.deleted {
		background: color-mix(in srgb, var(--color-warning) 18%, transparent);
		color: var(--color-warning);
	}

	:global(.page-shell.console-shell .app-footer) {
		margin-top: 0.5rem;
	}
</style>
