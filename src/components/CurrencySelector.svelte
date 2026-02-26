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
		gap: 0.32rem;
		padding: 0.3rem 0.44rem;
		border-radius: var(--radius-pill);
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
	}

	.currency-icon {
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
		.currency-icon {
			display: none;
		}
		.currency-selector {
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
