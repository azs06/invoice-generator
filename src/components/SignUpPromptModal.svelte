<script lang="ts">
	import { _ } from 'svelte-i18n';

	interface Props {
		open?: boolean;
		onClose?: () => void;
		onContinueBasic?: () => void;
	}

	let { open = false, onClose, onContinueBasic }: Props = $props();

	const handleSignUp = (): void => {
		// Redirect to Google OAuth sign-in
		window.location.href = '/api/auth/signin/google';
	};

	const handleContinueBasic = (): void => {
		// Set session storage flag so we don't show this again
		if (typeof window !== 'undefined') {
			sessionStorage.setItem('dismissedSignUpPrompt', 'true');
		}
		onContinueBasic?.();
		onClose?.();
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
			aria-labelledby="signup-prompt-title"
			onpointerdown={stopPropagation}
		>
			<div class="modal-icon">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path
						d="M12 15V17M6 21H18C19.1046 21 20 20.1046 20 19V13C20 11.8954 19.1046 11 18 11H6C4.89543 11 4 11.8954 4 13V19C4 20.1046 4.89543 21 6 21ZM16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11H16Z"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</div>

			<h2 id="signup-prompt-title" class="modal-title">Unlock Cloud Sync & Sharing</h2>

			<p class="modal-description">Sign up for free to enhance your invoicing:</p>

			<ul class="benefits-list">
				<li>
					<span class="benefit-icon">✨</span>
					<span>Higher resolution, professional-grade PDFs</span>
				</li>
				<li>
					<span class="benefit-icon">☁️</span>
					<span>Sync up to 10 invoices to the cloud</span>
				</li>
				<li>
					<span class="benefit-icon">📱</span>
					<span>Access synced invoices from any device</span>
				</li>
				<li>
					<span class="benefit-icon">🔗</span>
					<span>Share invoices with clients via link</span>
				</li>
			</ul>

			<div class="modal-actions">
				<button class="signup-button" onclick={handleSignUp}>
					<svg class="google-icon" viewBox="0 0 24 24" aria-hidden="true">
						<path
							fill="#4285F4"
							d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
						/>
						<path
							fill="#34A853"
							d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
						/>
						<path
							fill="#FBBC05"
							d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
						/>
						<path
							fill="#EA4335"
							d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
						/>
					</svg>
					Sign Up Free with Google
				</button>

				<button class="continue-button" onclick={handleContinueBasic}>
					Continue with Basic Download
				</button>
			</div>

			<p class="modal-footer-text">Your local invoices are always free and unlimited. Cloud sync adds sharing and multi-device access.</p>
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
		background: #3b82f6;
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

	.signup-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.875rem 1.5rem;
		border-radius: var(--radius-md);
		font-weight: 600;
		font-size: 1rem;
		border: 1px solid var(--color-border-primary);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.signup-button:hover {
		background: var(--color-bg-secondary);
	}

	.google-icon {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
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

	.modal-footer-text {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		margin: 1rem 0 0 0;
	}

	.signup-button:focus-visible,
	.continue-button:focus-visible {
		outline: 2px solid rgba(59, 130, 246, 0.3);
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
