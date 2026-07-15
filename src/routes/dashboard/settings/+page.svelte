<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { page } from '$app/stores';
	import type { PageData } from './$types';
	import { currencies, type CurrencyCode } from '$lib/stores/currency';

	let { data }: { data: PageData } = $props();

	interface RecurringSchedule {
		id: string;
		sourceInvoiceId: string;
		sourceInvoiceNumber: string | null;
		frequency: string;
		nextRunAt: string;
		lastRunAt: string | null;
		recipientEmail: string;
		active: boolean;
	}

	let recurring = $state<RecurringSchedule[]>([]);
	let recurringLoading = $state<boolean>(true);
	let recurringBusyId = $state<string | null>(null);

	const loadRecurring = async (): Promise<void> => {
		recurringLoading = true;
		try {
			const res = await fetch('/api/recurring');
			if (res.ok) {
				const body = (await res.json()) as { schedules: RecurringSchedule[] };
				recurring = body.schedules ?? [];
			}
		} catch {
			// Leave the list empty on failure.
		} finally {
			recurringLoading = false;
		}
	};

	const toggleRecurring = async (schedule: RecurringSchedule): Promise<void> => {
		recurringBusyId = schedule.id;
		try {
			const res = await fetch(`/api/recurring/${schedule.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ active: !schedule.active })
			});
			if (res.ok) await loadRecurring();
		} finally {
			recurringBusyId = null;
		}
	};

	const cancelRecurring = async (schedule: RecurringSchedule): Promise<void> => {
		if (!confirm($_('recurring.cancel_confirm'))) return;
		recurringBusyId = schedule.id;
		try {
			const res = await fetch(`/api/recurring/${schedule.id}`, { method: 'DELETE' });
			if (res.ok) await loadRecurring();
		} finally {
			recurringBusyId = null;
		}
	};

	const frequencyLabel = (frequency: string): string => {
		if (frequency === 'weekly') return $_('recurring.frequency_weekly');
		if (frequency === 'yearly') return $_('recurring.frequency_yearly');
		return $_('recurring.frequency_monthly');
	};

	const formatDateTime = (value: string | null): string => {
		if (!value) return $_('recurring.never');
		const ms = Date.parse(value);
		if (Number.isNaN(ms)) return $_('recurring.never');
		return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(ms);
	};

	onMount(() => {
		loadRecurring();
	});

	let isPro = $derived($page.data.tier === 'pro');
	let justUpgraded = $derived($page.url.searchParams.get('upgraded') === '1');

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
				{#if justUpgraded}
					<div class="billing-upgraded">{$_('settings.billing_upgraded')}</div>
				{/if}
				<div class="billing-status">
					<span class="plan-pill" class:pro={isPro}>
						{isPro ? $_('settings.billing_pro_plan') : $_('settings.billing_free_plan')}
					</span>
					{#if isPro}
						<a class="billing-action" href="/api/billing/portal">{$_('settings.billing_manage')}</a>
					{:else}
						<a class="billing-action" href="/pricing">{$_('settings.billing_view_plans')}</a>
					{/if}
				</div>
			</section>

			<section class="settings-section recurring-section">
				<div class="section-header">
					<div class="section-title-row">
						<span class="section-icon icon-recurring" aria-hidden="true">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M4 12a8 8 0 0 1 13.7-5.6L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.6L4 16M4 20v-4h4"
								/>
							</svg>
						</span>
						<h2>{$_('recurring.manage_title')}</h2>
					</div>
					<p class="section-description">{$_('recurring.manage_description')}</p>
				</div>

				{#if recurringLoading}
					<p class="recurring-empty">{$_('recurring.loading')}</p>
				{:else if recurring.length === 0}
					<p class="recurring-empty">{$_('recurring.manage_empty')}</p>
				{:else}
					<ul class="recurring-list">
						{#each recurring as schedule (schedule.id)}
							<li class="recurring-item" class:paused={!schedule.active}>
								<div class="recurring-info">
									<div class="recurring-top">
										<span class="recurring-number"
											>{schedule.sourceInvoiceNumber || schedule.sourceInvoiceId.slice(0, 8)}</span
										>
										<span class="recurring-freq">{frequencyLabel(schedule.frequency)}</span>
										{#if !schedule.active}
											<span class="recurring-paused-badge">{$_('recurring.paused')}</span>
										{/if}
									</div>
									<div class="recurring-meta">
										<span>{$_('recurring.to_label')}: {schedule.recipientEmail}</span>
										<span>{$_('recurring.next_run')}: {formatDateTime(schedule.nextRunAt)}</span>
										<span>{$_('recurring.last_run')}: {formatDateTime(schedule.lastRunAt)}</span>
									</div>
								</div>
								<div class="recurring-actions">
									<button
										class="recurring-btn"
										type="button"
										onclick={() => toggleRecurring(schedule)}
										disabled={recurringBusyId === schedule.id}
									>
										{schedule.active ? $_('recurring.pause') : $_('recurring.resume')}
									</button>
									<button
										class="recurring-btn danger"
										type="button"
										onclick={() => cancelRecurring(schedule)}
										disabled={recurringBusyId === schedule.id}
									>
										{$_('recurring.cancel_schedule')}
									</button>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
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
	}

	.recurring-section {
		grid-column: 1 / -1;
	}

	.icon-recurring {
		background: color-mix(in srgb, var(--color-accent-blue) 12%, transparent);
		color: var(--color-accent-blue);
	}

	.recurring-empty {
		font-size: 0.9rem;
		color: var(--color-text-secondary);
		margin: 0;
	}

	.recurring-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.recurring-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		padding: 0.85rem 1rem;
		border: 1px solid var(--surface-paper-border);
		border-radius: var(--radius-md);
		background: var(--surface-paper);
	}

	.recurring-item.paused {
		opacity: 0.7;
	}

	.recurring-info {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
	}

	.recurring-top {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.recurring-number {
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.recurring-freq {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-accent-blue);
		background: color-mix(in srgb, var(--color-accent-blue) 12%, transparent);
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
	}

	.recurring-paused-badge {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		background: var(--surface-paper-muted);
		padding: 0.1rem 0.45rem;
		border-radius: 999px;
	}

	.recurring-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 1rem;
		font-size: 0.82rem;
		color: var(--color-text-secondary);
	}

	.recurring-actions {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.recurring-btn {
		padding: 0.45rem 0.85rem;
		font-size: 0.82rem;
		font-weight: 600;
		border: 1px solid var(--surface-paper-border);
		border-radius: var(--radius-md);
		background: var(--surface-paper);
		color: var(--color-text-primary);
		cursor: pointer;
	}

	.recurring-btn:hover:not(:disabled) {
		background: var(--surface-paper-muted);
	}

	.recurring-btn.danger {
		color: #ef4444;
		border-color: color-mix(in srgb, #ef4444 40%, transparent);
	}

	.recurring-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.billing-upgraded {
		margin-bottom: 0.75rem;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.85rem;
		font-weight: 600;
		background: color-mix(in srgb, var(--color-success, #16a34a) 12%, transparent);
		color: var(--color-text-primary);
	}

	.billing-status {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.plan-pill {
		display: inline-flex;
		align-items: center;
		padding: 0.4rem 0.9rem;
		border-radius: 999px;
		font-size: 0.8125rem;
		font-weight: 600;
		background: var(--color-bg-secondary, #f3f4f6);
		color: var(--color-text-secondary);
	}

	.plan-pill.pro {
		background: color-mix(in srgb, var(--color-accent-blue) 12%, transparent);
		color: var(--color-accent-blue);
	}

	.billing-action {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-accent-blue);
		text-decoration: none;
	}

	.billing-action:hover {
		text-decoration: underline;
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
