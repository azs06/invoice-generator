<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import type { Snippet } from 'svelte';

	type SheetSize = 'compact' | 'default' | 'tall';

	interface Props {
		open: boolean;
		title: string;
		onClose?: () => void;
		ariaLabel?: string;
		size?: SheetSize;
		initialFocusSelector?: string;
		testId?: string;
		children?: Snippet;
		footer?: Snippet;
	}

	let {
		open,
		title,
		onClose,
		ariaLabel,
		size = 'default',
		initialFocusSelector,
		testId,
		children,
		footer
	}: Props = $props();

	let sheetElement = $state<HTMLElement | null>(null);
	const titleId = `mobile-sheet-title-${Math.random().toString(36).slice(2, 10)}`;

	const closeSheet = (): void => {
		onClose?.();
	};

	const getFocusableElements = (): HTMLElement[] => {
		if (!sheetElement) {
			return [];
		}

		return Array.from(
			sheetElement.querySelectorAll<HTMLElement>(
				'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		).filter((element) => {
			if (element.getAttribute('aria-hidden') === 'true') {
				return false;
			}
			return element.offsetParent !== null || getComputedStyle(element).position === 'fixed';
		});
	};

	const focusInitialElement = async (): Promise<void> => {
		if (!sheetElement) {
			return;
		}

		await tick();

		if (initialFocusSelector) {
			const preferredTarget = sheetElement.querySelector<HTMLElement>(initialFocusSelector);
			if (preferredTarget) {
				preferredTarget.focus();
				return;
			}
		}

		const focusableElements = getFocusableElements();
		if (focusableElements.length > 0) {
			focusableElements[0].focus();
			return;
		}

		sheetElement.focus();
	};

	const trapFocus = (event: KeyboardEvent): void => {
		if (event.key === 'Escape') {
			const target = event.target;
			if (target instanceof HTMLElement && target.closest('[data-testid="mobile-margin-dialog"]')) {
				return;
			}
			event.preventDefault();
			closeSheet();
			return;
		}

		if (event.key !== 'Tab') {
			return;
		}

		const focusableElements = getFocusableElements();
		if (focusableElements.length === 0) {
			event.preventDefault();
			return;
		}

		const first = focusableElements[0];
		const last = focusableElements[focusableElements.length - 1];
		const active = document.activeElement;

		if (event.shiftKey && active === first) {
			event.preventDefault();
			last.focus();
			return;
		}

		if (!event.shiftKey && active === last) {
			event.preventDefault();
			first.focus();
		}
	};

	const handleBackdropKeydown = (event: KeyboardEvent): void => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			closeSheet();
		}
	};

	$effect(() => {
		if (typeof document === 'undefined' || !open) {
			return;
		}

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		void focusInitialElement();

		return () => {
			document.body.style.overflow = previousOverflow;
		};
	});

	onDestroy(() => {
		if (typeof document !== 'undefined' && document.body.style.overflow === 'hidden') {
			document.body.style.overflow = '';
		}
	});
</script>

{#if open}
	<div
		class="mobile-sheet-backdrop"
		role="button"
		tabindex="0"
		aria-label={ariaLabel ? `Close ${ariaLabel}` : `Close ${title}`}
		onclick={closeSheet}
		onkeydown={handleBackdropKeydown}
	>
		<div
			class={`mobile-sheet mobile-sheet--${size}`}
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			aria-label={ariaLabel ?? undefined}
			tabindex="-1"
			bind:this={sheetElement}
			onkeydown={trapFocus}
			onclick={(event) => event.stopPropagation()}
			onpointerdown={(event) => event.stopPropagation()}
			data-testid={testId}
		>
			<header class="mobile-sheet__header">
				<h2 id={titleId} class="mobile-sheet__title">{title}</h2>
				<button type="button" class="mobile-sheet__close" onclick={closeSheet} aria-label={`Close ${title}`}>
					<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path
							fill-rule="evenodd"
							d="M4.22 4.22a.75.75 0 0 1 1.06 0L10 8.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L11.06 10l4.72 4.72a.75.75 0 1 1-1.06 1.06L10 11.06l-4.72 4.72a.75.75 0 0 1-1.06-1.06L8.94 10 4.22 5.28a.75.75 0 0 1 0-1.06Z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
			</header>
			<div class="mobile-sheet__body">
				{@render children?.()}
			</div>
			<div class="mobile-sheet__footer">
				{@render footer?.()}
			</div>
		</div>
	</div>
{/if}

<style>
	.mobile-sheet-backdrop {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		padding: 0.5rem;
		padding-bottom: calc(var(--mobile-safe-bottom) + 0.25rem);
		background: rgba(12, 16, 24, 0.46);
		backdrop-filter: blur(1px);
		z-index: 70;
		animation: sheet-backdrop-in var(--mobile-sheet-motion) var(--motion-ease);
	}

	.mobile-sheet {
		width: min(42rem, calc(100vw - 1rem));
		max-height: min(86vh, 46rem);
		overflow: auto;
		background: var(--surface-paper);
		border: 1px solid var(--surface-paper-border);
		border-radius: var(--mobile-sheet-radius) var(--mobile-sheet-radius) 0 0;
		box-shadow: var(--mobile-sheet-shadow);
		animation: sheet-slide-in var(--mobile-sheet-motion) var(--motion-ease);
	}

	.mobile-sheet--compact {
		max-height: min(58vh, 24rem);
	}

	.mobile-sheet--tall {
		max-height: min(92vh, 58rem);
	}

	.mobile-sheet__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.85rem 0.95rem;
		border-bottom: 1px solid var(--color-border-primary);
	}

	.mobile-sheet__title {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 650;
		color: var(--color-text-primary);
	}

	.mobile-sheet__close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--mobile-touch-target);
		height: var(--mobile-touch-target);
		padding: 0;
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-pill);
		background: var(--color-bg-primary);
		color: var(--color-text-secondary);
		cursor: pointer;
	}

	.mobile-sheet__close svg {
		width: 0.95rem;
		height: 0.95rem;
	}

	.mobile-sheet__body {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 0.9rem;
	}

	.mobile-sheet__footer {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0 0.9rem calc(var(--mobile-safe-bottom) + 0.6rem);
	}

	.mobile-sheet__footer:empty {
		display: none;
	}

	@keyframes sheet-slide-in {
		from {
			transform: translateY(14px);
			opacity: 0;
		}

		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	@keyframes sheet-backdrop-in {
		from {
			opacity: 0;
		}

		to {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.mobile-sheet-backdrop,
		.mobile-sheet {
			animation: none;
		}
	}
</style>
