<script lang="ts">
	import { browser } from '$app/environment';
	import { viewMode, toggleViewMode, currentPageDimensions } from '../stores/pageSettingsStore.js';

	// Only show on mobile
	let isMobile = $state(false);
	const MOBILE_BREAKPOINT = 768;

	$effect(() => {
		if (browser) {
			const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
			isMobile = mediaQuery.matches;

			const handler = (e: MediaQueryListEvent) => {
				isMobile = e.matches;
			};
			mediaQuery.addEventListener('change', handler);

			return () => {
				mediaQuery.removeEventListener('change', handler);
			};
		}
	});
</script>

{#if isMobile}
	<button
		class="view-mode-toggle"
		onclick={toggleViewMode}
		title={$viewMode === 'responsive'
			? `Preview ${$currentPageDimensions.label} page`
			: 'Switch to responsive view'}
	>
		{#if $viewMode === 'responsive'}
			<!-- Document/Page icon -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
				<polyline points="14 2 14 8 20 8" />
				<line x1="16" y1="13" x2="8" y2="13" />
				<line x1="16" y1="17" x2="8" y2="17" />
				<line x1="10" y1="9" x2="8" y2="9" />
			</svg>
			<span class="toggle-label">{$currentPageDimensions.label}</span>
		{:else}
			<!-- Mobile/responsive icon -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
				<line x1="12" y1="18" x2="12.01" y2="18" />
			</svg>
			<span class="toggle-label">Fit</span>
		{/if}
	</button>
{/if}

<style>
	.view-mode-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.36rem 0.66rem;
		background: var(--color-bg-primary, #ffffff);
		border: 1px solid var(--color-border-primary, #e5e7eb);
		border-radius: var(--radius-pill);
		color: var(--color-text-primary, #111827);
		font-size: 0.74rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			background-color var(--motion-fast) var(--motion-ease),
			border-color var(--motion-fast) var(--motion-ease);
	}

	.view-mode-toggle:hover {
		background: var(--color-bg-secondary, #f3f4f6);
		border-color: var(--color-border-secondary, #d1d5db);
	}

	.view-mode-toggle:active {
		transform: scale(0.98);
	}

	.toggle-label {
		white-space: nowrap;
	}

	/* Dark mode support */
	:global(.dark) .view-mode-toggle {
		background: var(--color-bg-secondary);
		border-color: var(--color-border-primary);
		color: var(--color-text-primary);
	}

	:global(.dark) .view-mode-toggle:hover {
		background: var(--color-bg-tertiary);
	}
</style>
