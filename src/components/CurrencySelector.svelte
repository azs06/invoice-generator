<script>
	import { currency, currencies } from '$lib/stores/currency.js';

	let selectedCurrency = $state($currency);

	$effect(() => {
		selectedCurrency = $currency;
	});

	function changeCurrency(/** @type {Event} */ event) {
		const target = /** @type {HTMLSelectElement} */ (event.target);
		const next = /** @type {import('$lib/stores/currency.js').CurrencyCode} */ (target.value);
		selectedCurrency = next;
		currency.set(next);
	}
</script>

<div class="currency-selector">
	<svg
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		stroke-width="1.5"
		stroke="currentColor"
		class="currency-icon"
		aria-hidden="true"
	>
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
		/>
	</svg>
	<div class="select-wrapper">
		<select onchange={changeCurrency} value={selectedCurrency} aria-label="Select currency">
			{#each Object.entries(currencies) as [code, info]}
				<option value={code}>{info.symbol} {code}</option>
			{/each}
		</select>
	</div>
</div>

<style>
	.currency-selector {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.currency-icon {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--color-text-primary);
	}

	.select-wrapper {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	select {
		appearance: none;
		padding: 0.45rem 2.25rem 0.45rem 0.85rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-secondary);
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
		font-size: 0.9rem;
		font-weight: 500;
		line-height: 1.2;
		cursor: pointer;
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease,
			background 0.2s ease;
	}

	select:focus-visible {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}

	select option {
		color: var(--color-text-primary);
		background: var(--color-bg-primary);
	}

	.select-wrapper::after {
		content: '';
		position: absolute;
		right: 0.9rem;
		top: 50%;
		width: 0.5rem;
		height: 0.5rem;
		border-right: 2px solid var(--color-text-secondary);
		border-bottom: 2px solid var(--color-text-secondary);
		transform: translateY(-50%) rotate(45deg);
		pointer-events: none;
		transition: border-color 0.2s ease;
	}

	.select-wrapper:focus-within::after {
		border-color: var(--color-accent-blue);
	}
</style>
