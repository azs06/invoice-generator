<script lang="ts">
	import { theme, toggleTheme } from '$lib/theme.js';
</script>

<button onclick={toggleTheme} class="theme-toggle-btn" aria-label="Toggle theme">
	{#if $theme === 'dark'}
		<!-- Sun icon for light mode -->
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.5"
			stroke="currentColor"
			class="w-6 h-6"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
			/>
		</svg>
	{:else}
		<!-- Moon icon for dark mode -->
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			stroke-width="1.5"
			stroke="currentColor"
			class="w-6 h-6"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
			/>
		</svg>
	{/if}
</button>

<style>
	.theme-toggle-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.15rem;
		height: 2.15rem;
		padding: 0;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		color: var(--color-theme-toggle);
		transition:
			color var(--motion-fast) var(--motion-ease),
			background-color var(--motion-fast) var(--motion-ease),
			border-color var(--motion-fast) var(--motion-ease);
		cursor: pointer;
	}

	.theme-toggle-btn:hover {
		color: var(--color-theme-toggle-hover);
		background: var(--color-bg-secondary);
		border-color: var(--color-border-secondary);
	}

	.theme-toggle-btn .w-6,
	.theme-toggle-btn .h-6 {
		width: 1.08rem;
		height: 1.08rem;
	}
</style>
