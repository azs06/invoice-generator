<script lang="ts">
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();
</script>

<div class="admin-layout">
	<aside class="admin-sidebar">
		<div class="sidebar-header">
			<h2>Admin Panel</h2>
			<span class="admin-badge">Admin</span>
		</div>
		<nav class="sidebar-nav">
			<a href="/admin" class="nav-item">
				<svg viewBox="0 0 20 20" fill="currentColor" class="nav-icon">
					<path
						d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"
					/>
				</svg>
				Users
			</a>
			<a href="/admin/deleted" class="nav-item">
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
			<a href="/dashboard" class="nav-item">
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
		min-height: 100vh;
		background: var(--color-bg-secondary);
	}

	.admin-sidebar {
		width: 260px;
		background: var(--color-bg-primary);
		border-right: 1px solid var(--color-border-primary);
		padding: 1.5rem 1rem;
		display: flex;
		flex-direction: column;
		position: sticky;
		top: 0;
		height: 100vh;
	}

	.sidebar-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 2rem;
		padding: 0 0.5rem;
	}

	.sidebar-header h2 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
	}

	.admin-badge {
		background: #6366f1;
		color: white;
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.2rem 0.5rem;
		border-radius: var(--radius-sm);
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
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
	}

	.nav-item:global(.active) {
		background: var(--color-accent-blue);
		color: white;
	}

	.nav-icon {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
	}

	.nav-divider {
		height: 1px;
		background: var(--color-border-primary);
		margin: 1rem 0;
	}

	.admin-main {
		flex: 1;
		padding: 2rem;
		overflow-y: auto;
	}

	@media (max-width: 768px) {
		.admin-layout {
			flex-direction: column;
		}

		.admin-sidebar {
			width: 100%;
			height: auto;
			position: relative;
			padding: 1rem;
		}

		.sidebar-nav {
			flex-direction: row;
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		.nav-divider {
			display: none;
		}

		.admin-main {
			padding: 1rem;
		}
	}
</style>
