<script lang="ts">
	import { _ } from 'svelte-i18n';

	interface Props {
		invoiceId: string;
		invoiceNumber?: string;
		recipientEmail?: string;
		onClose: () => void;
		onCreated?: () => void;
	}

	let { invoiceId, invoiceNumber = '', recipientEmail = '', onClose, onCreated }: Props = $props();

	const REMIND_OPTIONS = [1, 3, 7, 14, 30];

	let remindAfterDays = $state<number>(3);
	let email = $state<string>(recipientEmail);
	let isSaving = $state<boolean>(false);
	let error = $state<string | null>(null);
	let success = $state<boolean>(false);

	const validateEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

	const messageForStatus = (status: number): string => {
		if (status === 401) return $_('reminders.error_auth');
		if (status === 402) return $_('reminders.error_upgrade');
		if (status === 404) return $_('reminders.error_not_found');
		if (status === 409) return $_('reminders.error_duplicate');
		return $_('reminders.error_generic');
	};

	const handleCreate = async () => {
		const to = email.trim();
		if (!validateEmail(to)) {
			error = $_('reminders.error_invalid_email');
			return;
		}

		isSaving = true;
		error = null;

		try {
			const res = await fetch('/api/reminders', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ invoiceId, recipientEmail: to, remindAfterDays })
			});

			if (!res.ok) {
				error = messageForStatus(res.status);
				return;
			}

			success = true;
			onCreated?.();
		} catch {
			error = $_('reminders.error_generic');
		} finally {
			isSaving = false;
		}
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
	aria-labelledby="reminder-modal-title"
	onclick={handleBackdropClick}
	onkeydown={handleBackdropKeydown}
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal-content" onclick={(e) => e.stopPropagation()}>
		<header class="modal-header">
			<h2 id="reminder-modal-title">{$_('reminders.modal_title')}</h2>
			<button class="close-button" onclick={onClose} aria-label={$_('reminders.close')}>
				<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path
						d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
					/>
				</svg>
			</button>
		</header>

		<div class="modal-body">
			{#if success}
				<div class="success-state">
					<div class="success-icon" aria-hidden="true">
						<svg viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<h3>{$_('reminders.success_title')}</h3>
					<p>{$_('reminders.success_message')}</p>
				</div>
			{:else}
				<p class="modal-intro">{$_('reminders.description')}</p>
				{#if invoiceNumber}
					<p class="source-line">{$_('reminders.source_label')}: <strong>{invoiceNumber}</strong></p>
				{/if}

				{#if error}
					<div class="error-message">{error}</div>
				{/if}

				<div class="form-group">
					<label for="reminder-days">{$_('reminders.remind_after')}</label>
					<select id="reminder-days" bind:value={remindAfterDays} class="form-input">
						{#each REMIND_OPTIONS as days}
							<option value={days}>{$_('reminders.days_after_due', { values: { days } })}</option>
						{/each}
					</select>
				</div>

				<div class="form-group">
					<label for="reminder-email">{$_('reminders.recipient_email')}</label>
					<input
						id="reminder-email"
						type="email"
						bind:value={email}
						placeholder={$_('reminders.recipient_email_placeholder')}
						class="form-input"
					/>
				</div>
			{/if}
		</div>

		<footer class="modal-footer">
			{#if success}
				<button class="primary-button" onclick={onClose}>{$_('reminders.close')}</button>
			{:else}
				<button class="cancel-button" onclick={onClose} disabled={isSaving}>
					{$_('reminders.cancel')}
				</button>
				<button class="primary-button" onclick={handleCreate} disabled={isSaving || !email}>
					{#if isSaving}
						<span class="spinner"></span>
						{$_('reminders.creating')}
					{:else}
						{$_('reminders.create')}
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
		max-width: 460px;
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

	.source-line {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
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
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
	}

	.form-input:focus {
		outline: none;
		border-color: var(--color-accent-blue);
	}

	.success-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.75rem;
		padding: 1rem 0.5rem;
	}

	.success-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		border-radius: 50%;
		background: rgba(34, 197, 94, 0.12);
		color: #22c55e;
	}

	.success-icon svg {
		width: 1.75rem;
		height: 1.75rem;
	}

	.success-state h3 {
		margin: 0;
		font-size: 1.0625rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.success-state p {
		margin: 0;
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
		line-height: 1.5;
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
