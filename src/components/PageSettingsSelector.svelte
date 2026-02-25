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
		gap: 0.4rem;
	}

	.page-size-selector {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.2rem 0.4rem;
		border-radius: 0.25rem;
		background: transparent;
		border: none;
		transition: background-color var(--motion-fast) var(--motion-ease);
	}

	.page-size-selector:hover {
		background: color-mix(in srgb, var(--color-text-primary) 8%, transparent);
	}

	.selector-label {
		font-size: 0.72rem;
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.selector-control {
		appearance: none;
		border: none;
		background: transparent;
		color: var(--color-text-primary);
		font-size: 0.78rem;
		font-weight: 500;
		padding: 0.15rem 1.5rem 0.15rem 0.15rem;
		border-radius: 0.25rem;
		cursor: pointer;
		position: relative;
	}

	.selector-control:focus-visible {
		outline: none;
		background: color-mix(in srgb, var(--color-text-primary) 6%, transparent);
	}

	.margin-toggle-wrapper {
		position: relative;
	}

	.margin-toggle-btn {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.2rem 0.4rem;
		border-radius: 0.25rem;
		background: transparent;
		border: none;
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color var(--motion-fast) var(--motion-ease);
	}

	.margin-toggle-btn:hover {
		background: color-mix(in srgb, var(--color-text-primary) 8%, transparent);
		color: var(--color-text-primary);
	}

	.margin-toggle-btn.active {
		background: color-mix(in srgb, var(--color-text-primary) 10%, transparent);
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
		padding: 0.62rem;
		min-width: 180px;
		box-shadow: var(--shadow-medium);
	}

	.margin-header {
		margin-bottom: 0.625rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border-primary);
	}

	.margin-title {
		font-size: 0.74rem;
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
		font-size: 0.64rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.margin-input-group input {
		width: 100%;
		padding: 0.3rem 0.46rem;
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-pill);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		font-size: 0.78rem;
		font-weight: 500;
		text-align: center;
		font-family: var(--font-mono-ui);
	}

	.margin-input-group input:focus {
		outline: none;
		border-color: var(--color-accent, #3b82f6);
	}

	.margin-input-group input::-webkit-inner-spin-button,
	.margin-input-group input::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.margin-input-group input[type='number'] {
		appearance: textfield;
		-moz-appearance: textfield;
	}

	.btn-label {
		display: inline;
	}

	@media (max-width: 768px) {
		.page-settings {
			gap: 0.2rem;
		}

		.selector-label {
			display: none;
		}

		.selector-control {
			padding: 0.15rem 1.2rem 0.15rem 0.1rem;
			font-size: 0.74rem;
		}

		.btn-label {
			display: none;
		}

		.margin-toggle-btn {
			padding: 0.2rem 0.3rem;
		}

		.margin-panel {
			position: fixed;
			top: auto;
			bottom: 1rem;
			right: 1rem;
			left: auto;
			min-width: 200px;
			max-width: calc(100vw - 2rem);
			z-index: 50;
		}
	}
</style>
