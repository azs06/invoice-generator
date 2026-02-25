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
		<div class="sidebar-header">
			<span class="sidebar-label">Workspace</span>
			<h2>Dashboard</h2>
		</div>
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
		border: 1px solid var(--surface-paper-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
		box-shadow: var(--shadow-soft);
	}

	.dashboard-sidebar {
		width: 250px;
		background: var(--color-bg-secondary);
		border-right: 1px solid var(--surface-paper-border);
		padding: 1rem 0.75rem;
		display: flex;
		flex-direction: column;
		position: relative;
		min-height: 100%;
		align-self: stretch;
	}

	.sidebar-header {
		padding: 0.35rem 0.55rem 0.9rem;
		border-bottom: 1px solid var(--color-border-primary);
		margin-bottom: 0.8rem;
	}

	.sidebar-label {
		display: block;
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		margin-bottom: 0.2rem;
	}

	.sidebar-header h2 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.58rem 0.72rem;
		border-radius: var(--radius-sm);
		color: var(--color-text-secondary);
		text-decoration: none;
		font-weight: 600;
		font-size: 0.82rem;
		transition:
			color var(--motion-fast) var(--motion-ease),
			background-color var(--motion-fast) var(--motion-ease),
			border-color var(--motion-fast) var(--motion-ease);
		border: 1px solid transparent;
	}

	.nav-item:hover {
		background: var(--surface-paper);
		color: var(--color-text-primary);
		border-color: var(--color-border-primary);
	}

	.nav-item.active {
		background: color-mix(in srgb, var(--color-accent-blue) 12%, transparent);
		color: var(--color-accent-blue);
		border-color: color-mix(in srgb, var(--color-accent-blue) 34%, var(--color-border-primary));
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
			border: 1px solid var(--surface-paper-border);
			min-height: 86vh;
		}

		.dashboard-sidebar {
			width: 100%;
			height: auto;
			position: relative;
			top: 0;
			padding: 0.75rem;
			border-right: none;
			border-bottom: 1px solid var(--color-border-primary);
		}

		.sidebar-header {
			display: none;
		}

		.sidebar-nav {
			flex-direction: row;
			flex-wrap: wrap;
			gap: 0.42rem;
		}

		.nav-item {
			padding: 0.44rem 0.64rem;
			font-size: 0.78rem;
		}
	}
</style>
