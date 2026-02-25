<script lang="ts">
	import { locale } from 'svelte-i18n';

	type SupportedLocale = 'en' | 'bn';

	const languages: Record<SupportedLocale, string> = {
		en: 'English',
		bn: 'বাংলা'
	};

	const normalizeLocale = (value: string | null | undefined): SupportedLocale => {
		if (!value) return 'en';
		const base = value.split('-')[0];
		return base in languages ? (base as SupportedLocale) : 'en';
	};

	$effect(() => {
		const normalized = normalizeLocale($locale);
		if ($locale && normalized !== $locale) {
			locale.set(normalized);
		}
	});

	const changeLanguage = (event: Event): void => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLSelectElement)) {
			return;
		}
		const next = normalizeLocale(target.value);
		locale.set(next);
	};
</script>

<div class="language-selector">
	<svg
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		stroke-width="1.5"
		stroke="currentColor"
		class="language-icon"
		aria-hidden="true"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802"
		/>
	</svg>
	<div class="select-wrapper">
		<select onchange={changeLanguage} value={normalizeLocale($locale)} aria-label="Select language">
			{#each Object.entries(languages) as [code, name]}
				<option value={code}>{name}</option>
			{/each}
		</select>
	</div>
</div>

<style>
	.language-selector {
		display: inline-flex;
		align-items: center;
		gap: 0.32rem;
		padding: 0.3rem 0.44rem;
		border-radius: var(--radius-pill);
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
	}

	.language-icon {
		width: 0.88rem;
		height: 0.88rem;
		color: var(--color-text-secondary);
	}

	.select-wrapper {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	select {
		appearance: none;
		padding: 0.08rem 1.22rem 0.08rem 0.24rem;
		border-radius: var(--radius-pill);
		border: none;
		background: transparent;
		color: var(--color-text-primary);
		font-size: 0.76rem;
		font-weight: 500;
		line-height: 1.2;
		cursor: pointer;
	}

	select:focus-visible {
		outline: none;
		box-shadow: none;
	}

	select option {
		color: var(--color-text-primary);
		background: var(--color-bg-primary);
	}

	.select-wrapper::after {
		content: '';
		position: absolute;
		right: 0.25rem;
		top: 50%;
		width: 0.36rem;
		height: 0.36rem;
		border-right: 1.5px solid var(--color-text-secondary);
		border-bottom: 1.5px solid var(--color-text-secondary);
		transform: translateY(-50%) rotate(45deg);
		pointer-events: none;
		transition: border-color 0.2s ease;
	}

	.select-wrapper:focus-within::after {
		border-color: var(--color-accent-blue);
	}

	/* Mobile - hide icon and compact */
	@media (max-width: 680px) {
		.language-icon {
			display: none;
		}
		.language-selector {
			gap: 0;
			padding-inline: 0.36rem;
		}
		select {
			padding: 0.08rem 1rem 0.08rem 0.2rem;
			font-size: 0.74rem;
		}
		.select-wrapper::after {
			right: 0.2rem;
		}
	}
</style>
