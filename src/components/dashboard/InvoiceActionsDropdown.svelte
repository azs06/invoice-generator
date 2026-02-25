<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { _ } from 'svelte-i18n';

	interface Props {
		invoiceId: string;
		isArchived: boolean;
		hasPdf: boolean;
		isPdfStale: boolean;
		onDownloadPdf: (id: string) => void;
		onShare: (id: string) => void;
		onSendEmail: (id: string) => void;
		onExport: (id: string) => void;
		onArchive: (id: string) => void;
		onDelete: (id: string) => void;
		isDownloading?: boolean;
		isDeleting?: boolean;
	}

	let {
		invoiceId,
		isArchived,
		hasPdf,
		isPdfStale,
		onDownloadPdf,
		onShare,
		onSendEmail,
		onExport,
		onArchive,
		onDelete,
		isDownloading = false,
		isDeleting = false
	}: Props = $props();

	let isOpen = $state<boolean>(false);
	let triggerEl = $state<HTMLButtonElement | null>(null);
	let menuEl = $state<HTMLDivElement | null>(null);
	let menuStyle = $state<string>('');
	let scrollTargets: (HTMLElement | Window)[] = [];
	let removeListeners: (() => void) | null = null;

	const updateMenuPosition = () => {
		if (!triggerEl || typeof window === 'undefined') return;
		const rect = triggerEl.getBoundingClientRect();
		const menuWidth = menuEl?.offsetWidth ?? 200;
		const menuHeight = menuEl?.offsetHeight ?? 220;
		const viewportPadding = 8;
		let topOffset = rect.bottom + 6;
		let leftOffset = rect.right - menuWidth;

		if (topOffset + menuHeight > window.innerHeight - viewportPadding) {
			topOffset = rect.top - menuHeight - 6;
		}

		if (topOffset < viewportPadding) {
			topOffset = viewportPadding;
		}

		if (leftOffset < viewportPadding) {
			leftOffset = viewportPadding;
		}

		if (leftOffset + menuWidth > window.innerWidth - viewportPadding) {
			leftOffset = window.innerWidth - menuWidth - viewportPadding;
		}

		menuStyle = `top: ${topOffset}px; left: ${leftOffset}px;`;
	};

	const startListeners = () => {
		if (removeListeners) return;
		scrollTargets = [];
		const handler = () => {
			if (isOpen) updateMenuPosition();
		};
		const dashboardScroll = document.querySelector('.dashboard-main') as HTMLElement | null;
		const tableScroll = triggerEl?.closest('.table-wrapper') as HTMLElement | null;
		scrollTargets = [window];
		if (dashboardScroll) scrollTargets.push(dashboardScroll);
		if (tableScroll) scrollTargets.push(tableScroll);
		scrollTargets.forEach((target) => {
			target.addEventListener('scroll', handler, { passive: true });
		});
		window.addEventListener('resize', handler);
		removeListeners = () => {
			scrollTargets.forEach((target) => {
				target.removeEventListener('scroll', handler);
			});
			window.removeEventListener('resize', handler);
			scrollTargets = [];
			removeListeners = null;
		};
	};

	const stopListeners = () => {
		if (removeListeners) {
			removeListeners();
		}
	};

	const toggleDropdown = (e: MouseEvent) => {
		e.stopPropagation();
		if (!isOpen) {
			updateMenuPosition();
			startListeners();
		}
		isOpen = !isOpen;
		if (!isOpen) stopListeners();
	};

	const closeDropdown = () => {
		isOpen = false;
		stopListeners();
	};

	const handleAction = (action: () => void) => {
		action();
		closeDropdown();
	};

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			closeDropdown();
		}
	};

	$effect(() => {
		if (isOpen && menuEl) updateMenuPosition();
	});

	onMount(() => {
		return () => {
			stopListeners();
		};
	});

	onDestroy(() => {
		stopListeners();
	});
</script>

<svelte:window onclick={closeDropdown} onkeydown={handleKeydown} />

<div class="dropdown-container">
	<button
		bind:this={triggerEl}
		class="dropdown-trigger"
		onclick={toggleDropdown}
		aria-label={$_('dashboard.more_actions') || 'More actions'}
		aria-expanded={isOpen}
		aria-haspopup="true"
	>
		<svg viewBox="0 0 20 20" fill="currentColor">
			<path
				d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"
			/>
		</svg>
	</button>

	{#if isOpen}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			bind:this={menuEl}
			class="dropdown-menu"
			style={menuStyle}
			onclick={(e) => e.stopPropagation()}
			role="menu"
			tabindex="0"
		>
			<button
				class="dropdown-item"
				onclick={() => handleAction(() => onDownloadPdf(invoiceId))}
				disabled={isDownloading}
				role="menuitem"
			>
				{#if isDownloading}
					<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<circle cx="12" cy="12" r="9" stroke-width="2" stroke-dasharray="45 15" />
					</svg>
				{:else if !hasPdf}
					<svg viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm5.75 6.75a.75.75 0 0 0-1.5 0v1.5h-1.5a.75.75 0 0 0 0 1.5h1.5v1.5a.75.75 0 0 0 1.5 0v-1.5h1.5a.75.75 0 0 0 0-1.5h-1.5v-1.5Z"
							clip-rule="evenodd"
						/>
					</svg>
				{:else}
					<svg viewBox="0 0 20 20" fill="currentColor">
						<path
							d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z"
						/>
						<path
							d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z"
						/>
					</svg>
				{/if}
				<span>PDF</span>
				{#if isPdfStale && hasPdf}
					<span class="stale-badge">!</span>
				{/if}
			</button>

			<button
				class="dropdown-item"
				onclick={() => handleAction(() => onShare(invoiceId))}
				role="menuitem"
			>
				<svg viewBox="0 0 20 20" fill="currentColor">
					<path
						d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z"
					/>
					<path
						d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z"
					/>
				</svg>
				<span>{$_('dashboard.share') || 'Share'}</span>
			</button>

			<button
				class="dropdown-item"
				onclick={() => handleAction(() => onSendEmail(invoiceId))}
				role="menuitem"
			>
				<svg viewBox="0 0 20 20" fill="currentColor">
					<path
						d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z"
					/>
					<path
						d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z"
					/>
				</svg>
				<span>Send</span>
			</button>

			<button
				class="dropdown-item"
				onclick={() => handleAction(() => onExport(invoiceId))}
				role="menuitem"
			>
				<svg viewBox="0 0 20 20" fill="currentColor">
					<path
						d="M10.75 6.75a.75.75 0 0 0-1.5 0v6.614l-2.955-3.129a.75.75 0 0 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 1 0-1.09-1.03l-2.955 3.129V6.75Z"
					/>
					<path
						d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z"
					/>
				</svg>
				<span>{$_('export_import.export') || 'Export'}</span>
			</button>

			<div class="dropdown-divider"></div>

			<button
				class="dropdown-item"
				onclick={() => handleAction(() => onArchive(invoiceId))}
				role="menuitem"
			>
				<svg viewBox="0 0 20 20" fill="currentColor">
					<path d="M2 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H2Z" />
					<path
						fill-rule="evenodd"
						d="M2 7.5h16l-.811 7.71a2 2 0 0 1-1.99 1.79H4.802a2 2 0 0 1-1.99-1.79L2 7.5Zm5.22 1.72a.75.75 0 0 1 1.06 0L10 10.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L11.06 12l1.72 1.72a.75.75 0 1 1-1.06 1.06L10 13.06l-1.72 1.72a.75.75 0 0 1-1.06-1.06L8.94 12l-1.72-1.72a.75.75 0 0 1 0-1.06Z"
						clip-rule="evenodd"
					/>
				</svg>
				<span
					>{isArchived
						? $_('dashboard.unarchive') || 'Unarchive'
						: $_('dashboard.archive') || 'Archive'}</span
				>
			</button>

			<button
				class="dropdown-item danger"
				onclick={() => handleAction(() => onDelete(invoiceId))}
				disabled={isDeleting}
				role="menuitem"
			>
				{#if isDeleting}
					<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<circle cx="12" cy="12" r="9" stroke-width="2" stroke-dasharray="45 15" />
					</svg>
				{:else}
					<svg viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
							clip-rule="evenodd"
						/>
					</svg>
				{/if}
				<span>{$_('dashboard.delete') || 'Delete'}</span>
			</button>
		</div>
	{/if}
</div>

<style>
	.dropdown-container {
		position: relative;
		display: inline-block;
	}

	.dropdown-trigger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: 1px solid var(--surface-paper-border);
		border-radius: var(--radius-md);
		background: var(--surface-paper);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.15s;
	}

	.dropdown-trigger:hover {
		background: var(--surface-paper-muted);
		color: var(--color-text-primary);
	}

	.dropdown-trigger svg {
		width: 1rem;
		height: 1rem;
	}

	.dropdown-menu {
		position: fixed;
		min-width: 180px;
		background: var(--surface-paper);
		border: 1px solid var(--surface-paper-border);
		border-radius: var(--radius-lg);
		/* flat: no shadow */
		z-index: 9999;
		overflow: hidden;
		animation: fadeIn 0.15s ease;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		width: 100%;
		padding: 0.625rem 0.875rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-primary);
		text-decoration: none;
		background: none;
		border: none;
		cursor: pointer;
		transition: background 0.15s ease;
		text-align: left;
	}

	.dropdown-item:hover:not(:disabled) {
		background: var(--surface-paper-muted);
	}

	.dropdown-item:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.dropdown-item svg {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
		color: var(--color-text-secondary);
	}

	.dropdown-item.danger {
		color: #ef4444;
	}

	.dropdown-item.danger svg {
		color: #ef4444;
	}

	.dropdown-item.danger:hover:not(:disabled) {
		background: rgba(239, 68, 68, 0.1);
	}

	.dropdown-divider {
		height: 1px;
		margin: 0.25rem 0;
		background: var(--surface-paper-border);
	}

	.stale-badge {
		margin-left: auto;
		width: 16px;
		height: 16px;
		background: #f59e0b;
		color: white;
		border-radius: 50%;
		font-size: 10px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	.spin {
		animation: spin 0.9s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
