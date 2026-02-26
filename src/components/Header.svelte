<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
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

	const routeTitle = $derived(
		$page.url.pathname === '/'
			? 'Invoice Workspace'
			: $page.url.pathname.startsWith('/dashboard/settings')
				? 'Workspace Settings'
				: $page.url.pathname.startsWith('/dashboard')
					? 'Invoice Dashboard'
					: $page.url.pathname.startsWith('/admin/deleted')
						? 'Deleted Users'
						: $page.url.pathname.startsWith('/admin')
							? 'Admin Console'
							: $page.url.pathname.startsWith('/history')
								? 'Invoice History'
								: 'FreeInvoice'
	);

	const toggleMobileMenu = () => {
		showMobileMenu = !showMobileMenu;
		if (showMobileMenu) {
			showProfileMenu = false;
		}
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
		window.location.href = '/';
	};

	const handleImageError = () => {
		imageError = true;
	};

	const toggleProfileMenu = () => {
		showProfileMenu = !showProfileMenu;
		if (showProfileMenu) {
			showMobileMenu = false;
		}
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

	const closeMenus = () => {
		closeProfileMenu();
		closeMobileMenu();
	};

	const handleGlobalKeydown = (event: KeyboardEvent): void => {
		if (event.key === 'Escape') {
			closeMenus();
		}
	};

	const getUserInitials = (name: string | undefined): string => {
		if (!name) return '?';
		const parts = name.split(' ').filter(Boolean);
		if (parts.length >= 2) {
			return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
		}
		return name.substring(0, 2).toUpperCase();
	};
</script>

<svelte:window onpointerdown={closeMenus} onkeydown={handleGlobalKeydown} />

<header class="app-header">
	<div class="header-inner app-container" onpointerdown={(event) => event.stopPropagation()}>
		<div class="header-left">
			<button
				type="button"
				class="mobile-menu-button"
				onclick={(event) => {
					event.stopPropagation();
					toggleMobileMenu();
				}}
				aria-label="Open navigation"
				aria-expanded={showMobileMenu}
			>
				<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					{#if showMobileMenu}
						<path
							fill-rule="evenodd"
							d="M4.22 4.22a.75.75 0 0 1 1.06 0L10 8.94l4.72-4.72a.75.75 0 0 1 1.06 1.06L11.06 10l4.72 4.72a.75.75 0 1 1-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 0 1-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 0 1 0-1.06Z"
							clip-rule="evenodd"
						/>
					{:else}
						<path
							fill-rule="evenodd"
							d="M3.5 5a.75.75 0 0 1 .75-.75h11.5a.75.75 0 0 1 0 1.5H4.25A.75.75 0 0 1 3.5 5Zm0 5a.75.75 0 0 1 .75-.75h11.5a.75.75 0 0 1 0 1.5H4.25A.75.75 0 0 1 3.5 10Zm0 5a.75.75 0 0 1 .75-.75h11.5a.75.75 0 0 1 0 1.5H4.25A.75.75 0 0 1 3.5 15Z"
							clip-rule="evenodd"
						/>
					{/if}
				</svg>
			</button>

			<a href="/" class="brand-link">
				<span class="brand-main">{$_('app.title')}</span>
				<span class="brand-sub">{routeTitle}</span>
			</a>

			<nav class="desktop-nav" aria-label="Primary">
				{#if !$session.isPending}
					<a
						href="/history"
						class="header-nav-link"
						onclick={(event) => navigate(event, '/history')}>{$_('nav.history')}</a
					>
				{/if}
			</nav>
		</div>

		<div class="header-right">
			<div class="desktop-selectors">
				<CurrencySelector />
				<LanguageSelector />
			</div>
			<ThemeToggle />

			{#if $session.isPending}
				<div class="auth-loading" aria-label="Loading session">
					<div class="loading-spinner"></div>
				</div>
			{:else if $session.data}
				<div class="user-menu-wrap">
					<button
						type="button"
						class="avatar-button"
						onclick={(event) => {
							event.stopPropagation();
							toggleProfileMenu();
						}}
						aria-label="Open user menu"
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
							<span class="user-avatar-fallback">{getUserInitials($session.data.user.name)}</span>
						{/if}
					</button>

					{#if showProfileMenu}
						<div class="profile-dropdown" onpointerdown={(event) => event.stopPropagation()}>
							<div class="dropdown-header">
								<span class="user-name">{$session.data.user.name || 'User'}</span>
								<span class="user-email">{$session.data.user.email}</span>
							</div>
							<div class="dropdown-section">
								<a
									href="/history"
									class="dropdown-item"
									onclick={(event) => navigate(event, '/history', closeProfileMenu)}
								>
									{$_('nav.history')}
								</a>
								{#if isAdmin}
									<a
										href="/admin"
										class="dropdown-item"
										onclick={(event) => navigate(event, '/admin', closeProfileMenu)}
									>
										Admin Panel
									</a>
								{/if}
							</div>
							<button class="dropdown-item danger" type="button" onclick={signOut}>Sign Out</button>
						</div>
					{/if}
				</div>
			{:else}
				<button type="button" onclick={signIn} class="auth-button">Sign In</button>
			{/if}
		</div>
	</div>

	{#if showMobileMenu}
		<div class="mobile-nav-panel" onpointerdown={(event) => event.stopPropagation()}>
			<div class="mobile-selectors">
				<CurrencySelector />
				<LanguageSelector />
			</div>
			<nav class="mobile-nav-links" aria-label="Mobile navigation">
				{#if !$session.isPending}
					<a
						href="/history"
						class="mobile-nav-link"
						onclick={(event) => navigate(event, '/history', closeMobileMenu)}>{$_('nav.history')}</a
					>
				{/if}
			</nav>
		</div>
	{/if}
</header>

<style>
	.app-header {
		position: sticky;
		top: 0;
		z-index: 40;
		background: color-mix(in srgb, var(--surface-paper) 92%, transparent);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--surface-paper-border);
	}

	.header-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.9rem;
		padding-block: 0.55rem;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
	}

	.mobile-menu-button {
		display: none;
		align-items: center;
		justify-content: center;
		width: 2.2rem;
		height: 2.2rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		color: var(--color-text-secondary);
		cursor: pointer;
	}

	.mobile-menu-button svg {
		width: 1.2rem;
		height: 1.2rem;
	}

	.brand-link {
		display: inline-flex;
		flex-direction: column;
		gap: 0.06rem;
		text-decoration: none;
		min-width: 0;
	}

	.brand-main {
		font-size: 0.95rem;
		font-weight: 700;
		line-height: 1.1;
		color: var(--color-text-primary);
	}

	.brand-sub {
		font-size: 0.73rem;
		line-height: 1;
		color: var(--color-text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.desktop-nav {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding-left: 0.35rem;
	}

	.header-nav-link {
		padding: 0.45rem 0.72rem;
		border-radius: var(--radius-pill);
		font-size: 0.82rem;
		font-weight: 600;
		text-decoration: none;
		color: var(--color-text-secondary);
		transition:
			color var(--motion-fast) var(--motion-ease),
			background-color var(--motion-fast) var(--motion-ease);
	}

	.header-nav-link:hover {
		color: var(--color-text-primary);
		background: var(--color-bg-secondary);
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.desktop-selectors {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.auth-button {
		padding: 0.5rem 0.9rem;
		border-radius: var(--radius-pill);
		border: 1px solid transparent;
		background: var(--color-accent-blue);
		color: #fff;
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
	}

	.auth-button:hover {
		background: var(--color-accent-hover);
	}

	.auth-loading {
		display: grid;
		place-items: center;
		width: 2.2rem;
		height: 2.2rem;
	}

	.loading-spinner {
		width: 1.2rem;
		height: 1.2rem;
		border: 2px solid var(--color-border-secondary);
		border-top-color: var(--color-accent-blue);
		border-radius: 999px;
		animation: spin 0.75s linear infinite;
	}

	.user-menu-wrap {
		position: relative;
	}

	.avatar-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
		border: 1px solid var(--color-border-primary);
		border-radius: 999px;
		background: var(--color-bg-primary);
		cursor: pointer;
		overflow: hidden;
	}

	.user-avatar {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.user-avatar-fallback {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--color-accent-blue);
		background: color-mix(in srgb, var(--color-accent-blue) 15%, transparent);
	}

	.profile-dropdown {
		position: absolute;
		right: 0;
		top: calc(100% + 0.55rem);
		width: 220px;
		padding: 0.55rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--surface-paper-border);
		background: var(--surface-paper);
		box-shadow: var(--shadow-medium);
	}

	.dropdown-header {
		display: flex;
		flex-direction: column;
		gap: 0.12rem;
		padding: 0.4rem 0.5rem;
		border-bottom: 1px solid var(--color-border-primary);
		margin-bottom: 0.3rem;
	}

	.user-name {
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.user-email {
		font-size: 0.72rem;
		color: var(--color-text-secondary);
	}

	.dropdown-section {
		display: flex;
		flex-direction: column;
	}

	.dropdown-item {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.47rem 0.5rem;
		border-radius: var(--radius-sm);
		border: none;
		background: transparent;
		font-size: 0.8rem;
		font-weight: 500;
		text-decoration: none;
		color: var(--color-text-primary);
		cursor: pointer;
	}

	.dropdown-item:hover {
		background: var(--color-bg-secondary);
	}

	.dropdown-item.danger {
		color: var(--color-error);
	}

	.mobile-nav-panel {
		display: none;
		padding: 0 0.75rem 0.75rem;
		border-top: 1px solid var(--color-border-primary);
		background: var(--surface-paper);
	}

	.mobile-selectors {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		padding-top: 0.75rem;
	}

	.mobile-nav-links {
		display: grid;
		gap: 0.4rem;
		padding-top: 0.6rem;
	}

	.mobile-nav-link {
		display: block;
		padding: 0.58rem 0.72rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-primary);
		text-decoration: none;
		font-size: 0.84rem;
		font-weight: 600;
		color: var(--color-text-primary);
		background: var(--color-bg-primary);
	}

	.mobile-nav-link:hover {
		background: var(--color-bg-secondary);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 900px) {
		.mobile-menu-button {
			display: inline-flex;
		}

		.desktop-nav,
		.desktop-selectors {
			display: none;
		}

		.mobile-nav-panel {
			display: block;
		}

		.brand-sub {
			display: none;
		}

		.header-inner {
			padding-block: 0.45rem;
		}
	}
</style>
