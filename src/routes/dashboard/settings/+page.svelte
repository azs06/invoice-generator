<script lang="ts">
	import { _ } from 'svelte-i18n';
	import type { PageData } from './$types';
	import { currencies, type CurrencyCode } from '$lib/stores/currency';

	let { data }: { data: PageData } = $props();

	let invoicePrefix = $state<string>(data.settings.invoicePrefix);
	let preferredCurrency = $state<CurrencyCode>(data.settings.preferredCurrency as CurrencyCode);
	let isSaving = $state<boolean>(false);
	let saveSuccess = $state<boolean>(false);
	let saveError = $state<string | null>(null);

	const currencyOptions = Object.entries(currencies).map(([code, info]) => ({
		code: code as CurrencyCode,
		name: info.name,
		symbol: info.symbol
	}));

	const validatePrefix = (prefix: string): boolean => {
		return /^[A-Za-z0-9-]{1,10}$/.test(prefix);
	};

	const saveSettings = async () => {
		if (!validatePrefix(invoicePrefix)) {
			saveError = 'Prefix must be 1-10 alphanumeric characters or dashes';
			return;
		}

		isSaving = true;
		saveError = null;

		try {
			const response = await fetch('/api/user/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ invoicePrefix, preferredCurrency })
			});

			if (response.ok) {
				saveSuccess = true;
				setTimeout(() => (saveSuccess = false), 3000);
			} else {
				const data = await response.json();
				saveError = data.error || 'Failed to save settings';
			}
		} catch (e) {
			saveError = 'Network error. Please try again.';
		} finally {
			isSaving = false;
		}
	};
</script>

<svelte:head>
	<title>{$_('settings.title')} | FreeInvoice</title>
</svelte:head>

<div class="settings-page app-page">
	<div class="settings-container">
		<header class="settings-header">
			<p class="kicker">Account</p>
			<h1>{$_('settings.title')}</h1>
			<p class="subtitle">{$_('settings.subtitle') || 'Manage your account preferences'}</p>
		</header>

		<div class="settings-grid">
			<section class="settings-section section-prefix">
				<div class="section-header">
					<div class="section-title-row">
						<span class="section-icon icon-prefix" aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M4 7h11M4 12h9M4 17h6M17 6l3 3-3 3m3-3h-7"
								/>
							</svg>
						</span>
						<h2>{$_('settings.invoice_prefix')}</h2>
					</div>
					<p class="section-description">{$_('settings.invoice_prefix_description')}</p>
				</div>
				<div class="input-group">
					<input
						id="invoice-prefix"
						type="text"
						bind:value={invoicePrefix}
						maxlength="10"
						placeholder="INV-"
						class="text-input"
						aria-label={$_('settings.invoice_prefix')}
						aria-describedby="invoice-prefix-hint"
						class:error={invoicePrefix && !validatePrefix(invoicePrefix)}
					/>
					<div class="input-meta">
						<span class="input-hint" id="invoice-prefix-hint">
							Example: {invoicePrefix || 'INV-'}20260102-1234
						</span>
						<span class="char-count">{invoicePrefix.length}/10</span>
					</div>
				</div>
			</section>

			<section class="settings-section section-currency">
				<div class="section-header">
					<div class="section-title-row">
						<span class="section-icon icon-currency" aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M3 11h18M6 15h12M12 4v16M7 7c0-1.7 2.2-3 5-3s5 1.3 5 3-2.2 3-5 3-5 1.3-5 3 2.2 3 5 3 5-1.3 5-3"
								/>
							</svg>
						</span>
						<h2>{$_('settings.preferred_currency')}</h2>
					</div>
					<p class="section-description">{$_('settings.preferred_currency_description')}</p>
				</div>
				<div class="input-group">
					<select
						id="preferred-currency"
						bind:value={preferredCurrency}
						class="select-input"
						aria-label={$_('settings.preferred_currency')}
					>
						{#each currencyOptions as currency}
							<option value={currency.code}>
								{currency.symbol} - {currency.name} ({currency.code})
							</option>
						{/each}
					</select>
					<div class="currency-summary">
						<span class="currency-chip">{currencies[preferredCurrency]?.symbol}</span>
						<span class="currency-name">
							{currencies[preferredCurrency]?.name} ({preferredCurrency})
						</span>
					</div>
				</div>
			</section>

			<section class="settings-section billing-section">
				<div class="section-header">
					<div class="section-title-row">
						<span class="section-icon icon-billing" aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M4 6h16M4 10h16M8 14h8M6 18h12M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
								/>
							</svg>
						</span>
						<h2>{$_('settings.billing')}</h2>
					</div>
					<p class="section-description">{$_('settings.billing_description')}</p>
				</div>
				<div class="coming-soon-badge">
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
						/>
					</svg>
					{$_('settings.coming_soon')}
				</div>
			</section>

			<div class="save-section">
				<div class="save-feedback">
					{#if saveError}
						<div class="error-message">{saveError}</div>
					{/if}
					{#if saveSuccess}
						<div class="success-message">{$_('settings.saved')}</div>
					{/if}
				</div>
				<button
					class="save-button"
					onclick={saveSettings}
					disabled={isSaving || !validatePrefix(invoicePrefix)}
				>
					{#if isSaving}
						<span class="spinner"></span>
						{$_('settings.saving')}
					{:else}
						{$_('settings.save')}
					{/if}
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.settings-page {
		background:
			radial-gradient(
				circle at top right,
				color-mix(in srgb, var(--color-accent-blue) 14%, transparent),
				transparent 42%
			),
			var(--surface-paper);
		padding: clamp(1rem, 2vw, 1.75rem) clamp(0.75rem, 1.8vw, 1.5rem);
	}

	.settings-container {
		width: min(960px, 100%);
		margin: 0 auto;
	}

	.settings-header {
		margin-bottom: clamp(1.25rem, 1.8vw, 2rem);
	}

	.kicker {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-accent-blue);
		margin: 0 0 0.5rem 0;
	}

	.settings-header h1 {
		font-size: clamp(1.8rem, 2.6vw, 2.3rem);
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 0.35rem 0;
	}

	.subtitle {
		font-size: 1.05rem;
		color: var(--color-text-secondary);
		margin: 0;
	}

	.settings-grid {
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		gap: 1rem;
		align-items: start;
	}

	.settings-section {
		grid-column: span 6;
		background: linear-gradient(180deg, var(--surface-paper) 0%, var(--surface-paper-muted) 100%);
		border: 1px solid var(--surface-paper-border);
		border-radius: calc(var(--radius-lg) + 0.4rem);
		padding: clamp(1.1rem, 2vw, 1.5rem);
		min-height: 100%;
	}

	.section-header {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		margin-bottom: 1rem;
	}

	.section-title-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.section-icon {
		width: 2rem;
		height: 2rem;
		border-radius: 0.65rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.section-icon svg {
		width: 1.1rem;
		height: 1.1rem;
	}

	.icon-prefix {
		background: color-mix(in srgb, var(--color-accent-blue) 12%, transparent);
		color: var(--color-accent-blue);
	}

	.icon-currency {
		background: color-mix(in srgb, var(--color-success, #10b981) 15%, transparent);
		color: var(--color-success, #10b981);
	}

	.icon-billing {
		background: color-mix(in srgb, var(--color-text-secondary) 14%, transparent);
		color: var(--color-text-secondary);
	}

	.settings-section h2 {
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
	}

	.section-description {
		font-size: 0.95rem;
		color: var(--color-text-secondary);
		margin: 0;
		line-height: 1.5;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.text-input,
	.select-input {
		width: 100%;
		min-height: 3.1rem;
		padding: 0.75rem 1rem;
		font-size: 1rem;
		font-weight: 500;
		border: 1px solid var(--surface-paper-border);
		border-radius: 0.65rem;
		background: var(--surface-paper);
		color: var(--color-text-primary);
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease,
			transform 0.15s ease;
	}

	.text-input:focus,
	.select-input:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
		transform: translateY(-1px);
	}

	.text-input.error {
		border-color: var(--color-error, #ef4444);
		box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.14);
	}

	.input-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.input-hint {
		font-size: 0.82rem;
		color: var(--color-text-secondary);
	}

	.char-count {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		white-space: nowrap;
	}

	.currency-summary {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		padding: 0.6rem 0.7rem;
		border: 1px dashed var(--surface-paper-border);
		border-radius: 0.65rem;
		background: color-mix(in srgb, var(--surface-paper) 60%, transparent);
	}

	.currency-chip {
		width: 2rem;
		height: 2rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		font-weight: 700;
		background: color-mix(in srgb, var(--color-accent-blue) 12%, transparent);
		color: var(--color-accent-blue);
	}

	.currency-name {
		font-size: 0.9rem;
		color: var(--color-text-secondary);
	}

	.billing-section {
		grid-column: 1 / -1;
		border-style: dashed;
	}

	.coming-soon-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: color-mix(in srgb, var(--color-accent-blue) 10%, transparent);
		border-radius: 999px;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-accent-blue);
	}

	.save-section {
		grid-column: 1 / -1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.2rem;
		background: var(--surface-paper-muted);
		border: 1px solid var(--surface-paper-border);
		border-radius: calc(var(--radius-lg) + 0.35rem);
	}

	.save-feedback {
		flex: 1;
		min-width: 0;
	}

	.error-message {
		padding: 0.75rem 0.9rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: var(--radius-md);
		color: var(--color-error, #ef4444);
		font-size: 0.875rem;
	}

	.success-message {
		padding: 0.75rem 0.9rem;
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
		border-radius: var(--radius-md);
		color: var(--color-success, #22c55e);
		font-size: 0.875rem;
	}

	.save-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.8rem 1.5rem;
		background: linear-gradient(
			135deg,
			var(--color-accent-blue) 0%,
			color-mix(in srgb, var(--color-accent-blue) 84%, black) 100%
		);
		color: white;
		font-size: 0.95rem;
		font-weight: 600;
		border: none;
		border-radius: 0.65rem;
		cursor: pointer;
		transition:
			filter 0.15s ease,
			transform 0.15s ease,
			opacity 0.15s ease;
		min-width: 152px;
		flex-shrink: 0;
	}

	.save-button:hover:not(:disabled) {
		filter: brightness(1.03);
		transform: translateY(-1px);
	}

	.save-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 640px) {
		.settings-grid {
			gap: 0.85rem;
		}

		.settings-section {
			padding: 1.25rem;
			grid-column: 1 / -1;
		}

		.save-section {
			flex-direction: column;
			align-items: stretch;
		}

		.save-button {
			width: 100%;
		}
	}

	@media (max-width: 900px) {
		.settings-section {
			grid-column: 1 / -1;
		}
	}
</style>
