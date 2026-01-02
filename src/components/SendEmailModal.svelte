<script lang="ts">
	import { _ } from 'svelte-i18n';

	interface Props {
		invoiceId: string;
		invoiceNumber?: string;
		recipientName?: string;
		onClose: () => void;
	}

	let { invoiceId, invoiceNumber = '', recipientName = '', onClose }: Props = $props();

	let recipientEmail = $state<string>('');
	let subject = $state<string>(`Invoice ${invoiceNumber}`.trim());
	let message = $state<string>(
		`Dear ${recipientName || 'Client'},\n\nPlease find attached the invoice for your reference.\n\nBest regards`
	);
	let isSending = $state<boolean>(false);
	let error = $state<string | null>(null);

	const validateEmail = (email: string): boolean => {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	};

	const handleSend = async () => {
		if (!validateEmail(recipientEmail)) {
			error = 'Please enter a valid email address';
			return;
		}

		isSending = true;
		error = null;

		// Simulate sending - actual implementation will come later
		await new Promise((resolve) => setTimeout(resolve, 1000));

		isSending = false;
		alert($_('email_modal.not_implemented') || 'Email sending will be available in a future update.');
		onClose();
	};

	const handleBackdropClick = (event: MouseEvent): void => {
		if (event.target === event.currentTarget) {
			onClose();
		}
	};

	const handleBackdropKeydown = (event: KeyboardEvent): void => {
		if (event.key === 'Escape') {
			onClose();
		}
	};
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="modal-backdrop"
	role="dialog"
	tabindex="-1"
	aria-modal="true"
	aria-labelledby="email-modal-title"
	onclick={handleBackdropClick}
	onkeydown={handleBackdropKeydown}
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal-content" onclick={(e) => e.stopPropagation()}>
		<header class="modal-header">
			<h2 id="email-modal-title">{$_('email_modal.title') || 'Send Invoice via Email'}</h2>
			<button class="close-button" onclick={onClose} aria-label="Close modal">
				<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path
						d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
					/>
				</svg>
			</button>
		</header>

		<div class="modal-body">
			{#if error}
				<div class="error-message">{error}</div>
			{/if}

			<div class="form-group">
				<label for="recipient-email">{$_('email_modal.recipient_email') || 'Recipient Email'}</label>
				<input
					id="recipient-email"
					type="email"
					bind:value={recipientEmail}
					placeholder={$_('email_modal.recipient_email_placeholder') || 'client@example.com'}
					class="form-input"
					class:error={error && !validateEmail(recipientEmail)}
				/>
			</div>

			<div class="form-group">
				<label for="email-subject">{$_('email_modal.subject') || 'Subject'}</label>
				<input
					id="email-subject"
					type="text"
					bind:value={subject}
					placeholder={$_('email_modal.subject_placeholder') || 'Invoice #123'}
					class="form-input"
				/>
			</div>

			<div class="form-group">
				<label for="email-message">{$_('email_modal.message') || 'Message (optional)'}</label>
				<textarea
					id="email-message"
					bind:value={message}
					placeholder={$_('email_modal.message_placeholder') || 'Add a personal message...'}
					class="form-textarea"
					rows="5"
				></textarea>
			</div>

			<div class="coming-soon-notice">
				<svg viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
						clip-rule="evenodd"
					/>
				</svg>
				<span>{$_('email_modal.not_implemented') || 'Email sending will be available in a future update.'}</span>
			</div>
		</div>

		<footer class="modal-footer">
			<button class="cancel-button" onclick={onClose} disabled={isSending}>
				{$_('email_modal.cancel') || 'Cancel'}
			</button>
			<button
				class="send-button"
				onclick={handleSend}
				disabled={isSending || !recipientEmail}
			>
				{#if isSending}
					<span class="spinner"></span>
					{$_('email_modal.sending') || 'Sending...'}
				{:else}
					<svg viewBox="0 0 20 20" fill="currentColor">
						<path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
						<path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
					</svg>
					{$_('email_modal.send') || 'Send Email'}
				{/if}
			</button>
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
		animation: fadeIn 0.15s ease;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.modal-content {
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-lg);
		width: 100%;
		max-width: 480px;
		max-height: 90vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
		animation: slideUp 0.2s ease;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
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
		transition: all 0.15s;
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

	.form-input,
	.form-textarea {
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: 0.9375rem;
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		transition: border-color 0.15s ease, box-shadow 0.15s ease;
	}

	.form-input:focus,
	.form-textarea:focus {
		outline: none;
		border-color: var(--color-accent-blue);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
	}

	.form-input.error {
		border-color: #ef4444;
	}

	.form-textarea {
		resize: vertical;
		min-height: 100px;
		font-family: inherit;
	}

	.coming-soon-notice {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
		padding: 0.875rem 1rem;
		background: rgba(59, 130, 246, 0.08);
		border: 1px solid rgba(59, 130, 246, 0.2);
		border-radius: var(--radius-md);
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
	}

	.coming-soon-notice svg {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		color: #3b82f6;
		margin-top: 0.125rem;
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
		transition: all 0.15s;
	}

	.cancel-button:hover:not(:disabled) {
		background: var(--color-bg-secondary);
	}

	.cancel-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.send-button {
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
		transition: all 0.15s;
		min-width: 120px;
	}

	.send-button:hover:not(:disabled) {
		background: #2563eb;
	}

	.send-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.send-button svg {
		width: 1rem;
		height: 1rem;
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

		.modal-header,
		.modal-body,
		.modal-footer {
			padding-left: 1rem;
			padding-right: 1rem;
		}

		.modal-footer {
			flex-direction: column-reverse;
		}

		.cancel-button,
		.send-button {
			width: 100%;
		}
	}
</style>
