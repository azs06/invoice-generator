<script lang="ts">
	import { page } from '$app/stores';
	import { _ } from 'svelte-i18n';
	import UpgradePromptModal from './UpgradePromptModal.svelte';
	import type { PaymentDetails } from '$lib/types';

	interface Props {
		paymentDetails?: PaymentDetails;
		onUpdate?: (value: PaymentDetails) => void;
	}

	let { paymentDetails = undefined, onUpdate = () => {} }: Props = $props();

	let gatingActive = $derived(
		$page.data.monetizationEnabled === true && $page.data.tier !== 'pro'
	);
	let showUpgradeModal = $state(false);
	let expanded = $state(false);

	let current = $derived(paymentDetails ?? { enabled: false, payUrl: '', instructions: '' });
	let urlInvalid = $derived(current.payUrl !== '' && !current.payUrl.startsWith('https://'));

	const toggleExpanded = (): void => {
		expanded = !expanded;
	};

	const handleLockedClick = (): void => {
		showUpgradeModal = true;
	};

	const handleEnabledChange = (event: Event): void => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		onUpdate({ ...current, enabled: target.checked });
	};

	const handlePayUrlInput = (event: Event): void => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLInputElement)) {
			return;
		}
		onUpdate({ ...current, payUrl: target.value.trim() });
	};

	const handleInstructionsInput = (event: Event): void => {
		const target = event.currentTarget;
		if (!(target instanceof HTMLTextAreaElement)) {
			return;
		}
		onUpdate({ ...current, instructions: target.value });
	};
</script>

<div class="payment-details">
	<button
		type="button"
		class="section-toggle"
		onclick={toggleExpanded}
		aria-expanded={expanded}
		aria-controls="payment-details-body"
	>
		<span class="toggle-chevron" class:open={expanded} aria-hidden="true">&#9656;</span>
		<span class="toggle-title">{$_('payment_details.section_title')}</span>
		{#if gatingActive}
			<span class="pro-badge">{$_('upgrade.pro_badge')}</span>
		{/if}
	</button>

	{#if expanded}
		<div id="payment-details-body" class="section-body">
			{#if gatingActive}
				<button type="button" class="lock-overlay" onclick={handleLockedClick}>
					<span class="lock-hint">
						🔒 {$_('payment_details.locked_hint')}
					</span>
				</button>
			{/if}

			<fieldset class="fields" disabled={gatingActive}>
				<label class="enable-toggle">
					<input
						type="checkbox"
						checked={current.enabled}
						onchange={handleEnabledChange}
						data-testid="payment-details-enabled"
					/>
					<span>{$_('payment_details.enable_label')}</span>
				</label>

				<div class="field">
					<label for="payment-pay-url">{$_('payment_details.pay_url_label')}</label>
					<input
						id="payment-pay-url"
						type="url"
						value={current.payUrl}
						oninput={handlePayUrlInput}
						placeholder={$_('payment_details.pay_url_placeholder')}
						aria-invalid={urlInvalid}
						class:invalid={urlInvalid}
					/>
					{#if urlInvalid}
						<small class="field-error">{$_('payment_details.pay_url_error')}</small>
					{:else}
						<small class="field-hint">{$_('payment_details.pay_url_hint')}</small>
					{/if}
				</div>

				<div class="field">
					<label for="payment-instructions">{$_('payment_details.instructions_label')}</label>
					<textarea
						id="payment-instructions"
						rows="4"
						value={current.instructions}
						oninput={handleInstructionsInput}
						placeholder={$_('payment_details.instructions_placeholder')}
					></textarea>
				</div>
			</fieldset>
		</div>
	{/if}
</div>

<UpgradePromptModal
	open={showUpgradeModal}
	message={$_('payment_details.locked_message')}
	onClose={() => (showUpgradeModal = false)}
/>

<style>
	.payment-details {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.section-toggle {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.35rem 0;
		border: none;
		background: transparent;
		cursor: pointer;
		text-align: left;
	}

	.toggle-chevron {
		color: var(--color-text-secondary);
		font-size: 0.78rem;
		transition: transform var(--motion-fast) var(--motion-ease);
	}

	.toggle-chevron.open {
		transform: rotate(90deg);
	}

	.toggle-title {
		font-weight: 600;
		color: var(--color-text-secondary);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.pro-badge {
		padding: 0.1rem 0.42rem;
		border-radius: 999px;
		background: #f59e0b;
		color: white;
		font-size: 0.62rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.section-body {
		position: relative;
	}

	.lock-overlay {
		position: absolute;
		inset: 0;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--color-bg-primary) 55%, transparent);
		cursor: pointer;
	}

	.lock-hint {
		padding: 0.4rem 0.75rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		color: var(--color-text-secondary);
		font-size: 0.78rem;
		font-weight: 600;
	}

	.fields {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin: 0;
		padding: 0;
		border: none;
	}

	.fields:disabled {
		opacity: 0.6;
	}

	.enable-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.84rem;
		color: var(--color-text-primary);
		cursor: pointer;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.field label {
		font-weight: 600;
		color: var(--color-text-secondary);
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	input[type='url'],
	textarea {
		padding: 0.58rem 0.72rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		font-size: 0.84rem;
		transition:
			border-color var(--motion-fast) var(--motion-ease),
			box-shadow var(--motion-fast) var(--motion-ease);
	}

	textarea {
		min-height: 88px;
		resize: vertical;
	}

	input[type='url']:focus,
	textarea:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}

	input[type='url'].invalid {
		border-color: var(--color-error, #dc2626);
	}

	.field-hint {
		font-size: 0.72rem;
		color: var(--color-text-secondary);
	}

	.field-error {
		font-size: 0.72rem;
		color: var(--color-error, #dc2626);
	}
</style>
