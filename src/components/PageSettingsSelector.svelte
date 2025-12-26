<script lang="ts">
	import {
		pageSettings,
		PAGE_SIZE_OPTIONS,
		setPageSize,
		setMargins
	} from '../stores/pageSettingsStore.js';
	import type { PageSizeId } from '$lib/types';

	let showMarginPanel = $state(false);

	const handlePageSizeChange = (event: Event): void => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLSelectElement)) {
			return;
		}
		setPageSize(target.value as PageSizeId);
	};

	const handleMarginChange = (side: 'top' | 'right' | 'bottom' | 'left', event: Event): void => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		const value = Math.max(0, Math.min(50, parseFloat(target.value) || 0));
		setMargins({ [side]: value });
	};

	const toggleMarginPanel = (): void => {
		showMarginPanel = !showMarginPanel;
	};
</script>

<div class="page-settings">
	<div class="page-size-selector">
		<label class="selector-label" for="page-size-select">Page</label>
		<select
			id="page-size-select"
			class="selector-control"
			value={$pageSettings.pageSize}
			onchange={handlePageSizeChange}
		>
			{#each PAGE_SIZE_OPTIONS as option}
				<option value={option.id}>{option.label}</option>
			{/each}
		</select>
	</div>

	<div class="margin-toggle-wrapper">
		<button
			class="margin-toggle-btn"
			class:active={showMarginPanel}
			onclick={toggleMarginPanel}
			aria-expanded={showMarginPanel}
			aria-controls="margin-panel"
			title="Margins"
		>
			<svg class="icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
				<path
					fill-rule="evenodd"
					d="M4.5 2A2.5 2.5 0 0 0 2 4.5v11A2.5 2.5 0 0 0 4.5 18h11a2.5 2.5 0 0 0 2.5-2.5v-11A2.5 2.5 0 0 0 15.5 2h-11ZM4 4.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11Z"
					clip-rule="evenodd"
				/>
				<path d="M6 6h8v8H6V6Z" opacity="0.3" />
			</svg>
			<span class="btn-label">Margins</span>
			<svg
				class="chevron"
				class:rotated={showMarginPanel}
				viewBox="0 0 20 20"
				fill="currentColor"
				aria-hidden="true"
			>
				<path
					fill-rule="evenodd"
					d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
					clip-rule="evenodd"
				/>
			</svg>
		</button>

		{#if showMarginPanel}
			<div id="margin-panel" class="margin-panel">
				<div class="margin-header">
					<span class="margin-title">Margins (mm)</span>
				</div>
				<div class="margin-grid">
					<div class="margin-input-group">
						<label for="margin-top">Top</label>
						<input
							id="margin-top"
							type="number"
							min="0"
							max="50"
							step="1"
							value={$pageSettings.margins.top}
							oninput={(e) => handleMarginChange('top', e)}
						/>
					</div>
					<div class="margin-input-group">
						<label for="margin-right">Right</label>
						<input
							id="margin-right"
							type="number"
							min="0"
							max="50"
							step="1"
							value={$pageSettings.margins.right}
							oninput={(e) => handleMarginChange('right', e)}
						/>
					</div>
					<div class="margin-input-group">
						<label for="margin-bottom">Bottom</label>
						<input
							id="margin-bottom"
							type="number"
							min="0"
							max="50"
							step="1"
							value={$pageSettings.margins.bottom}
							oninput={(e) => handleMarginChange('bottom', e)}
						/>
					</div>
					<div class="margin-input-group">
						<label for="margin-left">Left</label>
						<input
							id="margin-left"
							type="number"
							min="0"
							max="50"
							step="1"
							value={$pageSettings.margins.left}
							oninput={(e) => handleMarginChange('left', e)}
						/>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.page-settings {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.page-size-selector {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-primary);
	}

	.selector-label {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.selector-control {
		appearance: none;
		border: none;
		background: transparent;
		color: var(--color-text-primary);
		font-size: 0.875rem;
		font-weight: 500;
		padding: 0.25rem 1.75rem 0.25rem 0.25rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
		position: relative;
	}

	.selector-control:focus-visible {
		outline: none;
		box-shadow: var(--shadow-focus);
	}

	.margin-toggle-wrapper {
		position: relative;
	}

	.margin-toggle-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.625rem;
		border-radius: var(--radius-sm);
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-primary);
		color: var(--color-text-secondary);
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.margin-toggle-btn:hover {
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
	}

	.margin-toggle-btn.active {
		background: var(--color-bg-tertiary);
		border-color: var(--color-accent, #3b82f6);
		color: var(--color-text-primary);
	}

	.margin-toggle-btn .icon {
		width: 1rem;
		height: 1rem;
	}

	.margin-toggle-btn .chevron {
		width: 0.875rem;
		height: 0.875rem;
		transition: transform 0.2s ease;
	}

	.margin-toggle-btn .chevron.rotated {
		transform: rotate(180deg);
	}

	.margin-panel {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		z-index: 20;
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px -2px rgba(0, 0, 0, 0.05);
		padding: 0.75rem;
		min-width: 180px;
	}

	.margin-header {
		margin-bottom: 0.625rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border-primary);
	}

	.margin-title {
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.margin-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.margin-input-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.margin-input-group label {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.margin-input-group input {
		width: 100%;
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-sm);
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
		font-size: 0.875rem;
		font-weight: 500;
		text-align: center;
	}

	.margin-input-group input:focus {
		outline: none;
		border-color: var(--color-accent, #3b82f6);
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
	}

	.margin-input-group input::-webkit-inner-spin-button,
	.margin-input-group input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.margin-input-group input[type='number'] {
		-moz-appearance: textfield;
	}

	.btn-label {
		display: inline;
	}

	@media (max-width: 640px) {
		.page-settings {
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		.page-size-selector {
			flex: 1;
			min-width: 0;
		}

		.selector-control {
			flex: 1;
			min-width: 0;
		}

		.btn-label {
			display: none;
		}

		.margin-panel {
			left: 0;
			right: auto;
		}
	}
</style>
