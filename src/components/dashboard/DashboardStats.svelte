<script lang="ts">
	import { _ } from 'svelte-i18n';

	interface Props {
		totalCount: number;
		remainingCount: number;
		filteredCount: number;
		archivedCount: number;
	}

	let { totalCount, remainingCount, filteredCount, archivedCount }: Props = $props();
</script>

<div class="dashboard-stats">
	<div class="stat-card">
		<span class="stat-value">{totalCount}</span>
		<span class="stat-label">{$_('dashboard.stats_total') || 'Total'}</span>
	</div>
	<div class="stat-card">
		<span class="stat-value">{remainingCount}</span>
		<span class="stat-label">{$_('dashboard.stats_remaining') || 'Remaining'}</span>
	</div>
	<div class="stat-card">
		<span class="stat-value">{filteredCount}</span>
		<span class="stat-label">{$_('dashboard.stats_filtered') || 'Filtered'}</span>
	</div>
	<div class="stat-card">
		<span class="stat-value">{archivedCount}</span>
		<span class="stat-label">{$_('dashboard.stats_archived') || 'Archived'}</span>
	</div>
</div>

<style>
	.dashboard-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
		gap: 1rem;
		width: 100%;
	}

	.stat-card {
		background: var(--surface-paper-muted);
		border: 1px solid var(--surface-paper-border);
		border-radius: var(--radius-md);
		padding: 1rem 1.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 100px;
	}

	.stat-value {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.stat-label {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		text-align: center;
	}

	@media (max-width: 768px) {
		.dashboard-stats {
			grid-template-columns: repeat(2, 1fr);
		}

		.stat-card {
			padding: 0.75rem 1rem;
		}

		.stat-value {
			font-size: 1.5rem;
		}

		.stat-label {
			font-size: 0.75rem;
		}
	}
</style>
