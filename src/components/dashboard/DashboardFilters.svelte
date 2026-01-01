<script lang="ts">
	import { _ } from 'svelte-i18n';

	interface Props {
		searchValue: string;
		onSearchInput: (value: string) => void;
		showArchived: boolean;
		onToggleArchived: (value: boolean) => void;
		filterMode: 'all' | 'draft' | 'finalized';
		onFilterModeChange: (mode: 'all' | 'draft' | 'finalized') => void;
	}

	let { searchValue, onSearchInput, showArchived, onToggleArchived, filterMode, onFilterModeChange }: Props = $props();
</script>

<div class="dashboard-filters">
	<div class="search-section">
		<div class="search-input-wrapper">
			<svg class="search-icon" viewBox="0 0 20 20" fill="currentColor">
				<path
					fill-rule="evenodd"
					d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
					clip-rule="evenodd"
				/>
			</svg>
			<input
				type="text"
				class="search-input"
				placeholder={$_('dashboard.search_placeholder') || 'Search invoices...'}
				value={searchValue}
				oninput={(e) => onSearchInput(e.currentTarget.value)}
			/>
		</div>
	</div>

	<div class="filter-section">
		<div class="filter-group">
			<span class="filter-label">{$_('dashboard.collection') || 'Collection'}:</span>
			<div class="chip-group">
				<button
					class="chip"
					class:active={!showArchived}
					onclick={() => onToggleArchived(false)}
				>
					{$_('dashboard.active') || 'Active'}
				</button>
				<button
					class="chip"
					class:active={showArchived}
					onclick={() => onToggleArchived(true)}
				>
					{$_('dashboard.archived') || 'Archived'}
				</button>
			</div>
		</div>

		<div class="filter-group">
			<span class="filter-label">{$_('dashboard.status') || 'Status'}:</span>
			<div class="chip-group">
				<button
					class="chip"
					class:active={filterMode === 'all'}
					onclick={() => onFilterModeChange('all')}
				>
					{$_('dashboard.all') || 'All'}
				</button>
				<button
					class="chip"
					class:active={filterMode === 'draft'}
					onclick={() => onFilterModeChange('draft')}
				>
					{$_('dashboard.drafts') || 'Drafts'}
				</button>
				<button
					class="chip"
					class:active={filterMode === 'finalized'}
					onclick={() => onFilterModeChange('finalized')}
				>
					{$_('dashboard.finalized') || 'Finalized'}
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.dashboard-filters {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
	}

	.search-section {
		width: 100%;
	}

	.search-input-wrapper {
		position: relative;
		width: 100%;
	}

	.search-icon {
		position: absolute;
		left: 0.875rem;
		top: 50%;
		transform: translateY(-50%);
		width: 1.25rem;
		height: 1.25rem;
		color: var(--color-text-secondary);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.625rem 1rem 0.625rem 2.75rem;
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		font-size: 0.9375rem;
		transition: border-color 0.2s;
	}

	.search-input:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.search-input::placeholder {
		color: var(--color-text-secondary);
	}

	.filter-section {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		align-items: center;
	}

	.filter-group {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.filter-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		white-space: nowrap;
	}

	.chip-group {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.chip {
		padding: 0.375rem 0.875rem;
		border: 1px solid var(--color-border-primary);
		border-radius: 9999px;
		background: var(--color-bg-primary);
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		white-space: nowrap;
	}

	.chip:hover {
		background: var(--color-bg-secondary);
		border-color: #3b82f6;
	}

	.chip.active {
		background: #3b82f6;
		border-color: #3b82f6;
		color: white;
	}

	@media (max-width: 768px) {
		.filter-section {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}

		.filter-group {
			flex-direction: column;
			align-items: stretch;
			gap: 0.5rem;
		}

		.chip-group {
			justify-content: center;
		}
	}
</style>
