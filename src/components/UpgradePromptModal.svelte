<script lang="ts">
	import { _ } from 'svelte-i18n';

	interface Props {
		open?: boolean;
		message?: string;
		onClose?: () => void;
	}

	let { open = false, message = '', onClose }: Props = $props();

	const handleUpgrade = (): void => {
		window.location.href = '/dashboard/settings';
	};

	const handleBackdropClick = (): void => {
		onClose?.();
	};

	const handleBackdropKeydown = (event: KeyboardEvent): void => {
		if (event.key === 'Escape') {
			event.preventDefault();
			onClose?.();
		}
	};

	const stopPropagation = (event: Event): void => {
		event.stopPropagation();
	};
</script>

{#if open}
	<div
		class="modal-backdrop"
		role="button"
		tabindex="0"
		onclick={handleBackdropClick}
		onkeydown={handleBackdropKeydown}
	>
		<div
			class="modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="upgrade-prompt-title"
			onpointerdown={stopPropagation}
		>
			<div class="modal-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<path
						d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 0h14v2a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-2z"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</div>

			<h2 id="upgrade-prompt-title" class="modal-title">{$_('upgrade.title')}</h2>

			{#if message}
				<p class="modal-description">{message}</p>
			{/if}
			<p class="modal-description">{$_('upgrade.description')}</p>

			<ul class="benefits-list">
				<li>
					<span class="benefit-icon">💳</span>
					<span>{$_('upgrade.benefit_payments')}</span>
				</li>
				<li>
					<span class="benefit-icon">📄</span>
					<span>{$_('upgrade.benefit_pdf')}</span>
				</li>
				<li>
					<span class="benefit-icon">🔗</span>
					<span>{$_('upgrade.benefit_sharing')}</span>
				</li>
			</ul>

			<div class="modal-actions">
				<button class="upgrade-button" onclick={handleUpgrade}>
					{$_('upgrade.upgrade_button')}
				</button>
				<button class="continue-button" onclick={() => onClose?.()}>
					{$_('upgrade.maybe_later')}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.modal {
		background: var(--color-bg-primary);
		padding: 2rem;
		border-radius: var(--radius-lg);
		max-width: 420px;
		width: 90%;
		border: 1px solid var(--color-border-primary);
		text-align: center;
	}

	.modal-icon {
		width: 3.5rem;
		height: 3.5rem;
		margin: 0 auto 1rem;
		background: #f59e0b;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
	}

	.modal-icon svg {
		width: 1.75rem;
		height: 1.75rem;
	}

	.modal-title {
		font-size: 1.375rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 0.5rem 0;
		line-height: 1.3;
	}

	.modal-description {
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
		margin: 0 0 1.25rem 0;
	}

	.benefits-list {
		list-style: none;
		padding: 0;
		margin: 0 0 1.5rem 0;
		text-align: left;
	}

	.benefits-list li {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0;
		font-size: 0.9375rem;
		color: var(--color-text-primary);
	}

	.benefit-icon {
		font-size: 1.125rem;
		flex-shrink: 0;
	}

	.modal-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.upgrade-button {
		width: 100%;
		padding: 0.875rem 1.5rem;
		border-radius: var(--radius-md);
		font-weight: 600;
		font-size: 1rem;
		border: none;
		background: #f59e0b;
		color: white;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.upgrade-button:hover {
		background: #d97706;
	}

	.continue-button {
		width: 100%;
		padding: 0.75rem 1.5rem;
		border-radius: var(--radius-md);
		font-weight: 500;
		font-size: 0.9375rem;
		border: none;
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.continue-button:hover {
		color: var(--color-text-primary);
		background: var(--color-bg-tertiary);
	}

	.upgrade-button:focus-visible,
	.continue-button:focus-visible {
		outline: 2px solid rgba(245, 158, 11, 0.4);
		outline-offset: 1px;
	}

	@media (max-width: 480px) {
		.modal {
			padding: 1.5rem;
		}

		.modal-title {
			font-size: 1.25rem;
		}

		.benefits-list li {
			font-size: 0.875rem;
		}
	}
</style>
