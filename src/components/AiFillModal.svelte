<script lang="ts">
	import { _ } from 'svelte-i18n';
	import type { ExtractedInvoice } from '$lib/types';

	interface Props {
		isSignedIn: boolean;
		onApply: (result: ExtractedInvoice) => void;
		onClose: () => void;
		onSignIn: () => void;
		onUpgrade: () => void;
	}

	let { isSignedIn, onApply, onClose, onSignIn, onUpgrade }: Props = $props();

	const MIN_LENGTH = 20;
	const MAX_LENGTH = 4000;

	let text = $state<string>('');
	let isLoading = $state<boolean>(false);
	let error = $state<string | null>(null);
	let result = $state<ExtractedInvoice | null>(null);

	const canGenerate = $derived(text.trim().length >= MIN_LENGTH && text.trim().length <= MAX_LENGTH);

	const messageForStatus = (status: number): string => {
		if (status === 401) return $_('ai.error_auth');
		if (status === 429) return $_('ai.error_limit');
		if (status === 503) return $_('ai.error_unavailable');
		if (status === 400) return $_('ai.error_length');
		if (status === 422) return $_('ai.error_no_content');
		return $_('ai.error_generic');
	};

	const handleGenerate = async (): Promise<void> => {
		if (!canGenerate || isLoading) return;
		isLoading = true;
		error = null;
		result = null;

		try {
			const res = await fetch('/api/ai/invoice-from-text', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: text.trim() })
			});

			if (res.status === 402) {
				// Pro-gated: hand off to the upgrade prompt like other gated features.
				onClose();
				onUpgrade();
				return;
			}

			if (!res.ok) {
				error = messageForStatus(res.status);
				return;
			}

			result = (await res.json()) as ExtractedInvoice;
		} catch {
			error = $_('ai.error_generic');
		} finally {
			isLoading = false;
		}
	};

	const handleApply = (): void => {
		if (result) {
			onApply(result);
			onClose();
		}
	};

	const handleBack = (): void => {
		result = null;
	};

	const handleBackdropClick = (event: MouseEvent): void => {
		if (event.target === event.currentTarget) onClose();
	};

	const handleBackdropKeydown = (event: KeyboardEvent): void => {
		if (event.key === 'Escape') onClose();
	};
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="modal-backdrop"
	role="dialog"
	tabindex="-1"
	aria-modal="true"
	aria-labelledby="ai-fill-title"
	onclick={handleBackdropClick}
	onkeydown={handleBackdropKeydown}
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal-content" onclick={(e) => e.stopPropagation()}>
		<header class="modal-header">
			<h2 id="ai-fill-title">{$_('ai.modal_title')}</h2>
			<button class="close-button" onclick={onClose} aria-label={$_('ai.close')}>
				<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path
						d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
					/>
				</svg>
			</button>
		</header>

		<div class="modal-body">
			{#if !isSignedIn}
				<div class="signin-state">
					<p class="modal-intro">{$_('ai.signin_prompt')}</p>
					<button class="primary-button" onclick={onSignIn}>{$_('ai.sign_in')}</button>
				</div>
			{:else if result}
				<p class="modal-intro">{$_('ai.preview_intro')}</p>

				{#if result.clientName || result.clientDetails}
					<div class="preview-block">
						<span class="preview-label">{$_('ai.preview_bill_to')}</span>
						<div class="preview-value">
							{#if result.clientName}<strong>{result.clientName}</strong>{/if}
							{#if result.clientDetails}<span class="preview-multiline">{result.clientDetails}</span>{/if}
						</div>
					</div>
				{/if}

				{#if result.items.length > 0}
					<div class="preview-block">
						<span class="preview-label">{$_('ai.preview_items')}</span>
						<table class="preview-table">
							<thead>
								<tr>
									<th>{$_('ai.col_description')}</th>
									<th class="num">{$_('ai.col_qty')}</th>
									<th class="num">{$_('ai.col_rate')}</th>
								</tr>
							</thead>
							<tbody>
								{#each result.items as item (item.description + item.rate)}
									<tr>
										<td>{item.description}</td>
										<td class="num">{item.quantity}</td>
										<td class="num">{item.rate}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}

				{#if result.dueDate}
					<div class="preview-block">
						<span class="preview-label">{$_('ai.preview_due_date')}</span>
						<div class="preview-value">{result.dueDate}</div>
					</div>
				{/if}

				{#if result.notes}
					<div class="preview-block">
						<span class="preview-label">{$_('ai.preview_notes')}</span>
						<div class="preview-value preview-multiline">{result.notes}</div>
					</div>
				{/if}

				<p class="preview-note">{$_('ai.preview_note')}</p>
			{:else}
				<p class="modal-intro">{$_('ai.description')}</p>

				{#if error}
					<div class="error-message">{error}</div>
				{/if}

				<div class="form-group">
					<label for="ai-fill-text">{$_('ai.textarea_label')}</label>
					<textarea
						id="ai-fill-text"
						bind:value={text}
						class="form-input"
						rows="6"
						maxlength={MAX_LENGTH}
						placeholder={$_('ai.textarea_placeholder')}
						disabled={isLoading}
					></textarea>
					<span class="char-count">{text.trim().length} / {MAX_LENGTH}</span>
				</div>
			{/if}
		</div>

		<footer class="modal-footer">
			{#if !isSignedIn}
				<button class="cancel-button" onclick={onClose}>{$_('ai.cancel')}</button>
			{:else if result}
				<button class="cancel-button" onclick={handleBack}>{$_('ai.back')}</button>
				<button class="primary-button" onclick={handleApply}>{$_('ai.apply')}</button>
			{:else}
				<button class="cancel-button" onclick={onClose} disabled={isLoading}>{$_('ai.cancel')}</button>
				<button class="primary-button" onclick={handleGenerate} disabled={!canGenerate || isLoading}>
					{#if isLoading}
						<span class="spinner"></span>
						{$_('ai.generating')}
					{:else}
						{$_('ai.generate')}
					{/if}
				</button>
			{/if}
		</footer>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 1rem;
	}

	.modal-content {
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-lg);
		width: 100%;
		max-width: 520px;
		max-height: 90vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--color-border-primary);
	}

	.modal-header h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		border: none;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
	}

	.close-button:hover {
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
	}

	.close-button svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.modal-intro {
		margin: 0;
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
		line-height: 1.5;
	}

	.signin-state {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 1rem;
	}

	.error-message {
		padding: 0.75rem 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: var(--radius-md);
		color: #ef4444;
		font-size: 0.875rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.form-input {
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: 0.9375rem;
		font-family: inherit;
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		resize: vertical;
	}

	.form-input:focus {
		outline: none;
		border-color: var(--color-accent-blue);
	}

	.char-count {
		align-self: flex-end;
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.preview-block {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.preview-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-text-secondary);
	}

	.preview-value {
		font-size: 0.9375rem;
		color: var(--color-text-primary);
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.preview-multiline {
		white-space: pre-wrap;
	}

	.preview-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.preview-table th,
	.preview-table td {
		padding: 0.5rem 0.625rem;
		text-align: left;
		border-bottom: 1px solid var(--color-border-primary);
		color: var(--color-text-primary);
	}

	.preview-table th {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.preview-table .num {
		text-align: right;
		white-space: nowrap;
	}

	.preview-note {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		font-style: italic;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		padding: 1.25rem 1.5rem;
		border-top: 1px solid var(--color-border-primary);
		background: var(--color-bg-secondary);
	}

	.cancel-button {
		padding: 0.625rem 1.25rem;
		font-size: 0.9375rem;
		font-weight: 500;
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		cursor: pointer;
	}

	.cancel-button:hover:not(:disabled) {
		background: var(--color-bg-secondary);
	}

	.cancel-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.primary-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		font-size: 0.9375rem;
		font-weight: 500;
		border: none;
		border-radius: var(--radius-md);
		background: #3b82f6;
		color: white;
		cursor: pointer;
		min-width: 130px;
	}

	.primary-button:hover:not(:disabled) {
		background: #2563eb;
	}

	.primary-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.spinner {
		width: 14px;
		height: 14px;
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

	@media (max-width: 480px) {
		.modal-content {
			max-height: 100vh;
			border-radius: 0;
		}

		.modal-footer {
			flex-direction: column-reverse;
		}

		.cancel-button,
		.primary-button {
			width: 100%;
		}
	}
</style>
