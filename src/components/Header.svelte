<script lang="ts">
	import { goto } from '$app/navigation';
	import { _ } from 'svelte-i18n';
	import ThemeToggle from './ThemeToggle.svelte';
	import LanguageSelector from './LanguageSelector.svelte';
	import CurrencySelector from './CurrencySelector.svelte';
	import { authClient } from '$lib/auth';

	interface Props {
		isAdmin?: boolean;
	}

	let { isAdmin = false }: Props = $props();

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
		// Redirect to home page after signing out
		window.location.href = '/';
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

	const navigate = (event: MouseEvent, href: string, onNavigate?: () => void): void => {
		onNavigate?.();

		if (
			event.defaultPrevented ||
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		) {
			return;
		}

		event.preventDefault();
		void goto(href);
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
	<div class="header-content app-container">
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
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<nav class="mobile-nav-dropdown" onclick={(e) => e.stopPropagation()}>
						{#if $session.data}
							<a
								href="/dashboard"
								class="mobile-nav-link"
								onclick={(event) => navigate(event, '/dashboard', closeMobileMenu)}
							>
								<svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">
									<path
										d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"
									/>
								</svg>
								{$_('nav.dashboard')}
							</a>
						{:else if !$session.isPending}
							<a href="/history" class="mobile-nav-link" onclick={closeMobileMenu}>
								<svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z"
										clip-rule="evenodd"
									/>
								</svg>
								{$_('nav.history')}
							</a>
						{/if}
					</nav>
				{/if}
			</div>

			<a href="/" class="brand-link">
				<span class="brand-text">{$_('app.title')}</span>
			</a>

			<nav class="nav-links desktop-nav">
				{#if $session.data}
					<a href="/dashboard" class="nav-link" onclick={(event) => navigate(event, '/dashboard')}
						>{$_('nav.dashboard')}</a
					>
				{:else if !$session.isPending}
					<a href="/history" class="nav-link">{$_('nav.history')}</a>
				{/if}
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
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div class="profile-dropdown" onclick={(e) => e.stopPropagation()}>
							<div class="dropdown-header">
								<span class="user-name">{$session.data.user.name || 'User'}</span>
								<span class="user-email">{$session.data.user.email}</span>
							</div>
							<div class="dropdown-divider"></div>
							<a
								href="/dashboard"
								class="dropdown-item"
								onclick={(event) => navigate(event, '/dashboard', closeProfileMenu)}
							>
								<svg class="dropdown-icon" viewBox="0 0 20 20" fill="currentColor">
									<path
										d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"
									/>
								</svg>
								{$_('nav.dashboard')}
							</a>
							{#if isAdmin}
								<a
									href="/admin"
									class="dropdown-item dropdown-item-admin"
									onclick={(event) => navigate(event, '/admin', closeProfileMenu)}
								>
									<svg class="dropdown-icon" viewBox="0 0 20 20" fill="currentColor">
										<path
											fill-rule="evenodd"
											d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
											clip-rule="evenodd"
										/>
									</svg>
									Admin Panel
									<span class="admin-badge">Admin</span>
								</a>
							{/if}
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
		background: var(--surface-paper);
		border-bottom: 1px solid var(--surface-paper-border);
		padding: 1rem 0;
		position: sticky;
		top: 0;
		z-index: 20;
	}

	.header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
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
		border-radius: var(--radius-md);
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

	/* Mobile - show hamburger, hide desktop nav */
	@media (max-width: 768px) {
		.header-content {
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
			padding: 0.75rem 0;
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

	.dropdown-item-admin {
		color: #7c3aed;
	}

	.dropdown-item-admin:hover {
		background: rgba(124, 58, 237, 0.1);
	}

	.admin-badge {
		margin-left: auto;
		background: #6366f1;
		color: white;
		font-size: 0.6rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.15rem 0.4rem;
		border-radius: var(--radius-sm);
	}

	.dropdown-icon {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.auth-button {
		padding: 0.4rem 0.8rem;
		border-radius: var(--radius-md);
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
