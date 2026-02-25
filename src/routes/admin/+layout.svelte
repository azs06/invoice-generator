<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

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

<div class="admin-layout">
	<aside class="admin-sidebar">
		<div class="sidebar-header">
			<h2>Admin Panel</h2>
			<span class="admin-badge">Admin</span>
		</div>
		<nav class="sidebar-nav">
			<a
				href="/admin"
				class="nav-item"
				class:active={$page.url.pathname === '/admin'}
				onclick={(event) => navigate(event, '/admin')}
			>
				<svg viewBox="0 0 20 20" fill="currentColor" class="nav-icon">
					<path
						d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"
					/>
				</svg>
				Users
			</a>
			<a
				href="/admin/deleted"
				class="nav-item"
				class:active={$page.url.pathname.startsWith('/admin/deleted')}
				onclick={(event) => navigate(event, '/admin/deleted')}
			>
				<svg viewBox="0 0 20 20" fill="currentColor" class="nav-icon">
					<path
						fill-rule="evenodd"
						d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
						clip-rule="evenodd"
					/>
				</svg>
				Deleted Users
			</a>
			<div class="nav-divider"></div>
			<a href="/dashboard" class="nav-item" onclick={(event) => navigate(event, '/dashboard')}>
				<svg viewBox="0 0 20 20" fill="currentColor" class="nav-icon">
					<path
						d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"
					/>
				</svg>
				Back to App
			</a>
		</nav>
	</aside>
	<main class="admin-main">
		{@render children()}
	</main>
</div>

<style>
	.admin-layout {
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

	.admin-sidebar {
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
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
		padding: 0.35rem 0.55rem 0.85rem;
		border-bottom: 1px solid var(--color-border-primary);
	}

	.sidebar-header h2 {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
		white-space: nowrap;
	}

	.admin-badge {
		background: color-mix(in srgb, var(--color-accent-blue) 15%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-accent-blue) 36%, var(--color-border-primary));
		color: white;
		color: var(--color-accent-blue);
		font-size: 0.62rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.16rem 0.44rem;
		border-radius: var(--radius-pill);
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

	.nav-divider {
		height: 1px;
		background: var(--surface-paper-border);
		margin: 0.85rem 0;
	}

	.admin-main {
		flex: 1;
		padding: 1.2rem;
		min-width: 0;
	}

	@media (max-width: 768px) {
		.admin-layout {
			flex-direction: column;
			border: 1px solid var(--surface-paper-border);
			min-height: 86vh;
		}

		.admin-sidebar {
			width: 100%;
			height: auto;
			position: relative;
			padding: 0.75rem;
		}

		.sidebar-nav {
			flex-direction: row;
			flex-wrap: wrap;
			gap: 0.42rem;
		}

		.nav-divider {
			display: none;
		}

		.admin-main {
			padding: 0.9rem;
		}
	}
</style>
