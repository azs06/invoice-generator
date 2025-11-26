<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ThemeToggle from './ThemeToggle.svelte';
	import LanguageSelector from './LanguageSelector.svelte';
	import CurrencySelector from './CurrencySelector.svelte';
	import { authClient } from '$lib/auth';

	const session = authClient.useSession();

	const signIn = async () => {
		await authClient.signIn.social({
			provider: 'google'
		});
	};

	const signOut = async () => {
		await authClient.signOut();
	};
</script>

<header class="app-header">
	<div class="header-content">
		<div class="brand-group">
			<a href="/" class="brand-link">
				<span class="brand-text">{$_('app.title')}</span>
			</a>

			<nav class="nav-links">
				<a href="/saved-invoices" class="nav-link">{$_('nav.saved_invoices')}</a>
			</nav>
		</div>

		<div class="controls">
			<CurrencySelector />
			<LanguageSelector />
			<ThemeToggle />
			{#if $session.isPending}
				<div class="auth-loading">
					<div class="loading-spinner"></div>
				</div>
			{:else if $session.data}
				<div class="user-profile">
					{#if $session.data.user.image}
						<img src={$session.data.user.image} alt="User" class="user-avatar" />
					{/if}
					<button onclick={signOut} class="auth-button">Sign Out</button>
				</div>
			{:else}
				<button onclick={signIn} class="auth-button">Sign In</button>
			{/if}
		</div>
	</div>
</header>

<style>
	.app-header {
		width: 100%;
		background: var(--color-bg-primary);
		border-bottom: 1px solid var(--color-border-secondary);
		padding: 1rem 1.5rem;
		position: sticky;
		top: 0;
		z-index: 20;
	}

	.header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		max-width: 1280px;
		margin: 0 auto;
		padding: 0 1.5em;
	}

	.brand-group {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.brand-link {
		display: inline-flex;
		align-items: center;
		gap: 0.65rem;
		text-decoration: none;
		transition: opacity 0.2s ease;
	}

	.brand-link:hover {
		opacity: 0.85;
	}

	.brand-text {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text-primary);
		letter-spacing: -0.02em;
	}

	.nav-links {
		display: none;
		align-items: center;
		gap: 1rem;
	}

	.nav-link {
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		text-decoration: none;
		padding: 0.4rem 0.65rem;
		border-radius: var(--radius-pill);
		transition:
			color 0.2s ease,
			background 0.2s ease;
	}

	.nav-link:hover,
	.nav-link:focus-visible {
		background: rgba(59, 130, 246, 0.12);
		color: var(--color-accent-blue);
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	@media (max-width: 1024px) {
		.header-content {
			padding-inline: 0.5rem;
		}
	}

	@media (min-width: 768px) {
		.nav-links {
			display: inline-flex;
		}
	}

	.user-profile {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.user-avatar {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		object-fit: cover;
	}

	.auth-button {
		padding: 0.4rem 0.8rem;
		border-radius: var(--radius-pill);
		background: var(--color-accent-blue);
		color: white;
		font-weight: 600;
		font-size: 0.9rem;
		border: none;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	.auth-button:hover {
		opacity: 0.9;
	}

	.auth-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
	}

	.loading-spinner {
		width: 1.25rem;
		height: 1.25rem;
		border: 2px solid var(--color-border-secondary);
		border-top-color: var(--color-accent-blue);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
