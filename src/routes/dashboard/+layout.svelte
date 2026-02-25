<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';

	let { children }: { children: any } = $props();

	const navigate = (event: MouseEvent, href: string): void => {
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
</script>

<div class="dashboard-layout">
	<aside class="dashboard-sidebar">
		<nav class="sidebar-nav">
			<a
				href="/dashboard"
				class="nav-item"
				class:active={$page.url.pathname === '/dashboard'}
				onclick={(event) => navigate(event, '/dashboard')}
			>
				<svg viewBox="0 0 20 20" fill="currentColor" class="nav-icon">
					<path
						fill-rule="evenodd"
						d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
						clip-rule="evenodd"
					/>
				</svg>
				{$_('nav.my_invoices') || 'My Invoices'}
			</a>
			<a
				href="/dashboard/settings"
				class="nav-item"
				class:active={$page.url.pathname === '/dashboard/settings'}
				onclick={(event) => navigate(event, '/dashboard/settings')}
			>
				<svg viewBox="0 0 20 20" fill="currentColor" class="nav-icon">
					<path
						fill-rule="evenodd"
						d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
						clip-rule="evenodd"
					/>
				</svg>
				{$_('nav.settings') || 'Settings'}
			</a>
		</nav>
	</aside>
	<main class="dashboard-main">
		{@render children()}
	</main>
</div>

<style>
	.dashboard-layout {
		display: flex;
		width: 100%;
		max-width: var(--layout-max-width);
		margin: 0 auto;
		min-height: 86vh;
		background: var(--surface-paper);
		border-inline: 1px solid var(--surface-paper-border);
	}

	.dashboard-sidebar {
		width: 240px;
		background: var(--surface-paper-muted);
		border-right: 1px solid var(--surface-paper-border);
		padding: 1.5rem 1rem;
		display: flex;
		flex-direction: column;
		position: relative;
		min-height: 100%;
		align-self: stretch;
	}

	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		text-decoration: none;
		font-weight: 500;
		font-size: 0.9rem;
		transition: all 0.15s ease;
	}

	.nav-item:hover {
		background: var(--surface-paper);
		color: var(--color-text-primary);
	}

	.nav-item.active {
		background: var(--color-accent-blue);
		color: white;
	}

	.nav-icon {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
	}

	.dashboard-main {
		flex: 1;
		min-width: 0;
		background: var(--surface-paper);
	}

	@media (max-width: 768px) {
		.dashboard-layout {
			flex-direction: column;
			border-inline: none;
			border: 1px solid var(--surface-paper-border);
			min-height: 86vh;
		}

		.dashboard-sidebar {
			width: 100%;
			height: auto;
			position: relative;
			top: 0;
			padding: 1rem;
			border-right: none;
			border-bottom: 1px solid var(--color-border-primary);
		}

		.sidebar-nav {
			flex-direction: row;
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		.nav-item {
			padding: 0.5rem 0.75rem;
			font-size: 0.85rem;
		}
	}
</style>
