<script lang="ts">
	import { onMount } from 'svelte';

	let dismissed = $state(false);
	const STORAGE_KEY = 'ig.cloudBannerDismissed';

	onMount(() => {
		if (typeof window !== 'undefined') {
			dismissed = localStorage.getItem(STORAGE_KEY) === 'true';
		}
	});

	const handleDismiss = (): void => {
		dismissed = true;
		if (typeof window !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, 'true');
		}
	};

	const handleSignUp = (): void => {
		window.location.href = '/api/auth/signin/google';
	};
</script>

{#if !dismissed}
	<div class="cloud-banner">
		<div class="banner-content">
			<div class="banner-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path
						d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</div>
			<div class="banner-text">
				<strong>Introducing Cloud Mode!</strong>
				<span
					>Now you can securely save your invoices to the cloud and access them from any device
					using your freeinvoice account, signup to get started</span
				>
			</div>
			<div class="banner-actions">
				<button class="signup-btn" onclick={handleSignUp}>Sign Up Free</button>
				<button class="dismiss-btn" onclick={handleDismiss} aria-label="Dismiss banner">
					<svg viewBox="0 0 20 20" fill="currentColor">
						<path
							d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
						/>
					</svg>
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.cloud-banner {
		background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
		border: 1px solid #93c5fd;
		border-radius: var(--radius-lg, 0.75rem);
		padding: 1rem 1.25rem;
		margin-bottom: 1.5rem;
	}

	.banner-content {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.banner-icon {
		width: 2.75rem;
		height: 2.75rem;
		background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		flex-shrink: 0;
	}

	.banner-icon svg {
		width: 1.5rem;
		height: 1.5rem;
	}

	.banner-text {
		flex: 1;
		min-width: 0;
		font-size: 0.9375rem;
		color: #1e40af;
		line-height: 1.5;
	}

	.banner-text strong {
		display: block;
		margin-bottom: 0.25rem;
		font-size: 1rem;
		color: #1e3a8a;
	}

	.banner-text span {
		color: #3730a3;
	}

	.banner-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.signup-btn {
		padding: 0.5rem 1.25rem;
		background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
		color: white;
		border: none;
		border-radius: var(--radius-pill, 9999px);
		font-weight: 600;
		font-size: 0.875rem;
		cursor: pointer;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
		white-space: nowrap;
	}

	.signup-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
	}

	.signup-btn:focus-visible {
		outline: none;
		box-shadow:
			0 0 0 3px rgba(59, 130, 246, 0.3),
			0 4px 12px rgba(59, 130, 246, 0.4);
	}

	.dismiss-btn {
		padding: 0.375rem;
		background: transparent;
		border: none;
		color: #6366f1;
		cursor: pointer;
		border-radius: var(--radius-md, 0.5rem);
		transition: background 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.dismiss-btn:hover {
		background: rgba(99, 102, 241, 0.15);
	}

	.dismiss-btn:focus-visible {
		outline: none;
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.3);
	}

	.dismiss-btn svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	@media (max-width: 768px) {
		.banner-content {
			flex-wrap: wrap;
		}

		.banner-text {
			flex-basis: calc(100% - 4rem);
		}

		.banner-actions {
			width: 100%;
			justify-content: flex-start;
			margin-top: 0.5rem;
		}
	}

	@media (max-width: 480px) {
		.cloud-banner {
			padding: 0.875rem 1rem;
		}

		.banner-icon {
			width: 2.25rem;
			height: 2.25rem;
		}

		.banner-icon svg {
			width: 1.25rem;
			height: 1.25rem;
		}

		.banner-text {
			font-size: 0.875rem;
		}

		.banner-text strong {
			font-size: 0.9375rem;
		}

		.signup-btn {
			padding: 0.5rem 1rem;
			font-size: 0.8125rem;
		}
	}
</style>
