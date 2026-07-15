<script module lang="ts">
	export interface ClientFormValues {
		id?: string;
		name: string;
		email: string;
		phone: string;
		address: string;
		notes: string;
	}
</script>

<script lang="ts">
	import { _ } from 'svelte-i18n';

	interface Props {
		/** Existing client to edit; omit to create a new client. */
		client?: Partial<ClientFormValues>;
		onClose: () => void;
		onSaved?: () => void;
	}

	let { client = {}, onClose, onSaved }: Props = $props();

	const isEdit = Boolean(client.id);

	let name = $state<string>(client.name ?? '');
	let email = $state<string>(client.email ?? '');
	let phone = $state<string>(client.phone ?? '');
	let address = $state<string>(client.address ?? '');
	let notes = $state<string>(client.notes ?? '');
	let isSaving = $state<boolean>(false);
	let error = $state<string | null>(null);

	const validateEmail = (value: string): boolean =>
		value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

	const messageForStatus = (status: number): string => {
		if (status === 401) return $_('clients.error_auth');
		if (status === 402) return $_('clients.error_upgrade');
		if (status === 404) return $_('clients.error_not_found');
		return $_('clients.error_generic');
	};

	const handleSave = async (): Promise<void> => {
		const trimmedName = name.trim();
		if (trimmedName === '') {
			error = $_('clients.error_name_required');
			return;
		}
		if (!validateEmail(email.trim())) {
			error = $_('clients.error_invalid_email');
			return;
		}

		isSaving = true;
		error = null;

		const payload = {
			name: trimmedName,
			email: email.trim(),
			phone: phone.trim(),
			address: address.trim(),
			notes: notes.trim()
		};

		try {
			const res = await fetch(isEdit ? `/api/clients/${client.id}` : '/api/clients', {
				method: isEdit ? 'PUT' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				error = messageForStatus(res.status);
				return;
			}

			onSaved?.();
			onClose();
		} catch {
			error = $_('clients.error_generic');
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
	aria-labelledby="client-modal-title"
	onclick={handleBackdropClick}
	onkeydown={handleBackdropKeydown}
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal-content" onclick={(e) => e.stopPropagation()}>
		<header class="modal-header">
			<h2 id="client-modal-title">
				{isEdit ? $_('clients.edit_title') : $_('clients.add_title')}
			</h2>
			<button class="close-button" onclick={onClose} aria-label={$_('clients.close')}>
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
				<label for="client-name">{$_('clients.name')}</label>
				<input
					id="client-name"
					type="text"
					bind:value={name}
					placeholder={$_('clients.name_placeholder')}
					class="form-input"
				/>
			</div>

			<div class="form-group">
				<label for="client-email">{$_('clients.email')}</label>
				<input
					id="client-email"
					type="email"
					bind:value={email}
					placeholder={$_('clients.email_placeholder')}
					class="form-input"
				/>
			</div>

			<div class="form-group">
				<label for="client-phone">{$_('clients.phone')}</label>
				<input
					id="client-phone"
					type="tel"
					bind:value={phone}
					placeholder={$_('clients.phone_placeholder')}
					class="form-input"
				/>
			</div>

			<div class="form-group">
				<label for="client-address">{$_('clients.address')}</label>
				<textarea
					id="client-address"
					bind:value={address}
					placeholder={$_('clients.address_placeholder')}
					class="form-input"
					rows="3"
				></textarea>
			</div>

			<div class="form-group">
				<label for="client-notes">{$_('clients.notes')}</label>
				<textarea
					id="client-notes"
					bind:value={notes}
					placeholder={$_('clients.notes_placeholder')}
					class="form-input"
					rows="2"
				></textarea>
			</div>
		</div>

		<footer class="modal-footer">
			<button class="cancel-button" onclick={onClose} disabled={isSaving}>
				{$_('clients.cancel')}
			</button>
			<button class="primary-button" onclick={handleSave} disabled={isSaving || !name.trim()}>
				{#if isSaving}
					<span class="spinner"></span>
					{$_('clients.saving')}
				{:else}
					{$_('clients.save')}
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
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		font-family: inherit;
		resize: vertical;
	}

	.form-input:focus {
		outline: none;
		border-color: var(--color-accent-blue);
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
