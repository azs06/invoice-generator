<script lang="ts">
	import { _ } from 'svelte-i18n';
	import ThemeToggle from './ThemeToggle.svelte';
	import LanguageSelector from './LanguageSelector.svelte';
	import CurrencySelector from './CurrencySelector.svelte';
	import { authClient } from '$lib/auth';

	const session = authClient.useSession();
	let imageError = $state(false);
	let showProfileMenu = $state(false);
	let showMobileMenu = $state(false);

	const toggleMobileMenu = () => {
		showMobileMenu = !showMobileMenu;
	};

	const closeMobileMenu = () => {
		showMobileMenu = false;
	};

	const signIn = async () => {
		await authClient.signIn.social({
			provider: 'google'
		});
	};

	const signOut = async () => {
		showProfileMenu = false;
		await authClient.signOut();
	};

	const handleImageError = () => {
		imageError = true;
	};

	const toggleProfileMenu = () => {
		showProfileMenu = !showProfileMenu;
	};

	const closeProfileMenu = () => {
		showProfileMenu = false;
	};

	// Get user initials for fallback avatar
	const getUserInitials = (name: string | undefined): string => {
		if (!name) return '?';
		const parts = name.split(' ').filter(Boolean);
		if (parts.length >= 2) {
			return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
		}
		return name.substring(0, 2).toUpperCase();
	};
</script>

<svelte:window
	onclick={() => {
		closeProfileMenu();
		closeMobileMenu();
	}}
/>

<header class="app-header">
	<div class="header-content">
		<div class="brand-group">
			<!-- Mobile hamburger menu -->
			<div class="mobile-menu-container">
				<button
					class="hamburger-button"
					onclick={(e) => {
						e.stopPropagation();
						toggleMobileMenu();
					}}
					aria-label="Navigation menu"
					aria-expanded={showMobileMenu}
				>
					<svg
						class="hamburger-icon"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						{#if showMobileMenu}
							<path d="M6 18L18 6M6 6l12 12" />
						{:else}
							<path d="M4 6h16M4 12h16M4 18h16" />
						{/if}
					</svg>
				</button>

				{#if showMobileMenu}
					<nav class="mobile-nav-dropdown" onclick={(e) => e.stopPropagation()}>
						<a href="/" class="mobile-nav-link" onclick={closeMobileMenu}>
							<svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
									clip-rule="evenodd"
								/>
							</svg>
							{$_('nav.create_invoice')}
						</a>
						<a href="/saved-invoices" class="mobile-nav-link" onclick={closeMobileMenu}>
							<svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M10 2c-1.716 0-3.408.106-5.07.31C3.806 2.45 3 3.414 3 4.517V17.25a.75.75 0 001.075.676L10 15.082l5.925 2.844A.75.75 0 0017 17.25V4.517c0-1.103-.806-2.068-1.93-2.207A41.403 41.403 0 0010 2z"
									clip-rule="evenodd"
								/>
							</svg>
							{$_('nav.saved_invoices')}
						</a>
					</nav>
				{/if}
			</div>

			<a href="/" class="brand-link">
				<span class="brand-text">{$_('app.title')}</span>
			</a>

			<nav class="nav-links desktop-nav">
				<a href="/" class="nav-link">{$_('nav.create_invoice')}</a>
				<a href="/saved-invoices" class="nav-link">{$_('nav.saved_invoices')}</a>
			</nav>
		</div>

		<div class="controls">
			<div class="desktop-only-selectors">
				<CurrencySelector />
				<LanguageSelector />
			</div>
			<ThemeToggle />
			{#if $session.isPending}
				<div class="auth-loading">
					<div class="loading-spinner"></div>
				</div>
			{:else if $session.data}
				<div class="user-menu-container">
					<button
						class="avatar-button"
						onclick={(e) => {
							e.stopPropagation();
							toggleProfileMenu();
						}}
						aria-label="User menu"
						aria-expanded={showProfileMenu}
					>
						{#if $session.data.user.image && !imageError}
							<img
								src={$session.data.user.image}
								alt={$session.data.user.name || 'User'}
								class="user-avatar"
								onerror={handleImageError}
								referrerpolicy="no-referrer"
							/>
						{:else}
							<div class="user-avatar-fallback">
								{getUserInitials($session.data.user.name)}
							</div>
						{/if}
					</button>

					{#if showProfileMenu}
						<div class="profile-dropdown" onclick={(e) => e.stopPropagation()}>
							<div class="dropdown-header">
								<span class="user-name">{$session.data.user.name || 'User'}</span>
								<span class="user-email">{$session.data.user.email}</span>
							</div>
							<div class="dropdown-divider"></div>
							<a href="/dashboard" class="dropdown-item" onclick={closeProfileMenu}>
								<svg class="dropdown-icon" viewBox="0 0 20 20" fill="currentColor">
									<path
										d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"
									/>
								</svg>
								Dashboard
							</a>
							<a href="/saved-invoices" class="dropdown-item" onclick={closeProfileMenu}>
								<svg class="dropdown-icon" viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
										clip-rule="evenodd"
									/>
								</svg>
								Saved Invoices
							</a>
							<div class="dropdown-divider"></div>
							<button class="dropdown-item dropdown-item-danger" onclick={signOut}>
								<svg class="dropdown-icon" viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4a1 1 0 10-2 0v4a1 1 0 102 0V7zm-3 1a1 1 0 10-2 0v3a1 1 0 102 0V8zM8 9a1 1 0 00-2 0v2a1 1 0 102 0V9z"
										clip-rule="evenodd"
									/>
								</svg>
								Sign Out
							</button>
						</div>
					{/if}
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
		display: inline-flex;
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

	.desktop-only-selectors {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	/* Mobile menu - hidden by default on desktop */
	.mobile-menu-container {
		display: none;
		position: relative;
	}

	.hamburger-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
		border: 1px solid var(--color-border-secondary);
		border-radius: var(--radius-md);
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.hamburger-button:hover {
		background: var(--color-bg-tertiary);
		border-color: var(--color-border-primary);
	}

	.hamburger-icon {
		width: 1.25rem;
		height: 1.25rem;
	}

	.mobile-nav-dropdown {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 0;
		min-width: 200px;
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-lg);
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
		z-index: 50;
		overflow: hidden;
		animation: fadeIn 0.15s ease;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.mobile-nav-link {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-text-primary);
		text-decoration: none;
		transition: background 0.15s ease;
	}

	.mobile-nav-link:hover {
		background: var(--color-bg-secondary);
	}

	.nav-icon {
		width: 1.1rem;
		height: 1.1rem;
		color: var(--color-text-secondary);
	}

	/* Tablet */
	@media (max-width: 1024px) {
		.header-content {
			padding-inline: 0.5rem;
		}
	}

	/* Mobile - show hamburger, hide desktop nav */
	@media (max-width: 768px) {
		.header-content {
			padding-inline: 0.25rem;
			gap: 0.75rem;
		}

		.brand-group {
			gap: 0.75rem;
		}

		.brand-text {
			font-size: 1.15rem;
		}

		.desktop-nav {
			display: none;
		}

		.mobile-menu-container {
			display: block;
		}

		.controls {
			gap: 0.35rem;
		}

		.app-header {
			padding: 0.75rem 0.5rem;
		}

		.desktop-only-selectors {
			display: none !important;
		}
	}

	/* Very small screens */
	@media (max-width: 400px) {
		.brand-text {
			font-size: 1rem;
		}
	}

	.user-avatar {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		object-fit: cover;
	}

	.user-avatar-fallback {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		background: var(--color-accent-blue);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.user-menu-container {
		position: relative;
	}

	.avatar-button {
		background: none;
		border: 2px solid transparent;
		border-radius: 50%;
		padding: 0;
		cursor: pointer;
		transition: border-color 0.2s ease;
	}

	.avatar-button:hover,
	.avatar-button:focus-visible {
		border-color: var(--color-accent-blue);
	}

	.avatar-button:focus-visible {
		outline: none;
	}

	.profile-dropdown {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		min-width: 220px;
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-lg);
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
		z-index: 50;
		overflow: hidden;
	}

	.dropdown-header {
		padding: 0.75rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.user-name {
		font-weight: 600;
		font-size: 0.9375rem;
		color: var(--color-text-primary);
	}

	.user-email {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
	}

	.dropdown-divider {
		height: 1px;
		background: var(--color-border-primary);
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		width: 100%;
		padding: 0.625rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-primary);
		text-decoration: none;
		background: none;
		border: none;
		cursor: pointer;
		transition: background 0.15s ease;
		text-align: left;
	}

	.dropdown-item:hover {
		background: var(--color-bg-secondary);
	}

	.dropdown-item-danger {
		color: #dc2626;
	}

	.dropdown-item-danger:hover {
		background: rgba(220, 38, 38, 0.1);
	}

	.dropdown-icon {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
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

	/* Mobile auth button */
	@media (max-width: 680px) {
		.auth-button {
			padding: 0.35rem 0.65rem;
			font-size: 0.8rem;
		}
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
