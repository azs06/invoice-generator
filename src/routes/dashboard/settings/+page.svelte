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
			<h1>{$_('settings.title')}</h1>
			<p class="subtitle">{$_('settings.subtitle') || 'Manage your account preferences'}</p>
		</header>

		<div class="settings-content">
			<section class="settings-section">
				<h2>{$_('settings.invoice_prefix')}</h2>
				<p class="section-description">{$_('settings.invoice_prefix_description')}</p>
				<div class="input-group">
					<input
						type="text"
						bind:value={invoicePrefix}
						maxlength="10"
						placeholder="INV-"
						class="text-input"
						class:error={invoicePrefix && !validatePrefix(invoicePrefix)}
					/>
					<span class="input-hint">Example: {invoicePrefix}20260102-1234</span>
				</div>
			</section>

			<section class="settings-section">
				<h2>{$_('settings.preferred_currency')}</h2>
				<p class="section-description">{$_('settings.preferred_currency_description')}</p>
				<div class="input-group">
					<select bind:value={preferredCurrency} class="select-input">
						{#each currencyOptions as currency}
							<option value={currency.code}>
								{currency.symbol} - {currency.name} ({currency.code})
							</option>
						{/each}
					</select>
				</div>
			</section>

			<section class="settings-section billing-section">
				<h2>{$_('settings.billing')}</h2>
				<p class="section-description">{$_('settings.billing_description')}</p>
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
				{#if saveError}
					<div class="error-message">{saveError}</div>
				{/if}
				{#if saveSuccess}
					<div class="success-message">{$_('settings.saved')}</div>
				{/if}
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
		background: var(--surface-paper);
		padding: 1.5rem 1rem;
	}

	.settings-container {
		max-width: 640px;
		margin: 0 auto;
	}

	.settings-header {
		margin-bottom: 2rem;
	}

	.settings-header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 0.25rem 0;
	}

	.subtitle {
		font-size: 1rem;
		color: var(--color-text-secondary);
		margin: 0;
	}

	.settings-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.settings-section {
		background: var(--surface-paper-muted);
		border: 1px solid var(--surface-paper-border);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
	}

	.settings-section h2 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.5rem 0;
	}

	.section-description {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin: 0 0 1rem 0;
		line-height: 1.5;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.text-input,
	.select-input {
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: 0.9375rem;
		border: 1px solid var(--surface-paper-border);
		border-radius: var(--radius-md);
		background: var(--surface-paper);
		color: var(--color-text-primary);
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.text-input:focus,
	.select-input:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
	}

	.text-input.error {
		border-color: var(--color-danger);
	}

	.input-hint {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
	}

	.billing-section {
		opacity: 0.7;
	}

	.coming-soon-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--color-bg-tertiary, rgba(0, 0, 0, 0.05));
		border-radius: var(--radius-md);
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text-secondary);
	}

	.save-section {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.75rem;
	}

	.error-message {
		width: 100%;
		padding: 0.75rem 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: var(--radius-md);
		color: var(--color-danger, #ef4444);
		font-size: 0.875rem;
	}

	.success-message {
		width: 100%;
		padding: 0.75rem 1rem;
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
		padding: 0.75rem 1.5rem;
		background: var(--color-accent-blue);
		color: white;
		font-size: 0.9375rem;
		font-weight: 500;
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition:
			background 0.15s ease,
			opacity 0.15s ease;
		min-width: 140px;
	}

	.save-button:hover:not(:disabled) {
		background: var(--color-accent-blue-hover, #2563eb);
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
		.settings-page {
			padding: 1rem 0.75rem;
		}

		.settings-section {
			padding: 1.25rem;
		}

		.save-section {
			align-items: stretch;
		}

		.save-button {
			width: 100%;
		}
	}
</style>
