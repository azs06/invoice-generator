<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { isInvoiceComplete, getIncompletionReasons } from '$lib/invoiceValidation';
	import type { InvoiceData } from '$lib/types';

	interface ShareLink {
		id: string;
		token: string;
		url: string;
		createdAt: string;
		expiresAt: string;
		revoked: boolean;
		viewCount: number;
		lastViewedAt: string | null;
	}

	interface Props {
		invoiceId: string;
		invoice?: InvoiceData | null;
		onClose: () => void;
	}

	let { invoiceId, invoice = null, onClose }: Props = $props();

	// Check invoice completeness
	let canShare = $derived(isInvoiceComplete(invoice));
	let incompletionReasons = $derived(getIncompletionReasons(invoice));

	let isLoading = $state<boolean>(false);
	let isCreating = $state<boolean>(false);
	let links = $state<ShareLink[]>([]);
	let error = $state<string | null>(null);
	let copiedLinkId = $state<string | null>(null);

	const fetchLinks = async (): Promise<void> => {
		isLoading = true;
		error = null;

		try {
			const response = await fetch(`/api/invoices/${invoiceId}/share`);
			if (!response.ok) {
				throw new Error('Failed to fetch share links');
			}
			const data = await response.json();
			links = data.links || [];
		} catch (e) {
			error = 'Failed to load share links. Please try again.';
			console.error('Error fetching share links:', e);
		} finally {
			isLoading = false;
		}
	};

	const createLink = async (): Promise<void> => {
		isCreating = true;
		error = null;

		try {
			const response = await fetch(`/api/invoices/${invoiceId}/share`, {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error('Failed to create share link');
			}

			const newLink = await response.json();
			links = [newLink, ...links];
		} catch (e) {
			error = 'Failed to create share link. Please try again.';
			console.error('Error creating share link:', e);
		} finally {
			isCreating = false;
		}
	};

	const revokeLink = async (linkId: string): Promise<void> => {
		try {
			const response = await fetch(`/api/invoices/${invoiceId}/share?linkId=${linkId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to revoke share link');
			}

			// Update the link in the list
			links = links.map((link) => (link.id === linkId ? { ...link, revoked: true } : link));
		} catch (e) {
			error = 'Failed to revoke share link. Please try again.';
			console.error('Error revoking share link:', e);
		}
	};

	const copyToClipboard = async (url: string, linkId: string): Promise<void> => {
		try {
			await navigator.clipboard.writeText(url);
			copiedLinkId = linkId;
			setTimeout(() => {
				copiedLinkId = null;
			}, 2000);
		} catch (e) {
			console.error('Failed to copy to clipboard:', e);
		}
	};

	const formatDate = (dateStr: string): string => {
		const date = new Date(dateStr);
		return date.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	};

	const formatDateTime = (dateStr: string): string => {
		const date = new Date(dateStr);
		return date.toLocaleString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	};

	const isExpired = (expiresAt: string): boolean => {
		return new Date(expiresAt) < new Date();
	};

	const getTimeRemaining = (expiresAt: string): string => {
		const now = new Date();
		const expiry = new Date(expiresAt);
		const diffMs = expiry.getTime() - now.getTime();

		if (diffMs <= 0) return 'Expired';

		const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
		const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

		if (diffDays > 0) {
			return `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`;
		}
		return `${diffHours} hour${diffHours > 1 ? 's' : ''} remaining`;
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

	// Fetch links on mount
	$effect(() => {
		fetchLinks();
	});
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="modal-backdrop"
	role="dialog"
	tabindex="-1"
	aria-modal="true"
	aria-labelledby="share-modal-title"
	onclick={handleBackdropClick}
	onkeydown={handleBackdropKeydown}
>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal-content" onclick={(e) => e.stopPropagation()}>
		<header class="modal-header">
			<h2 id="share-modal-title">Share Invoice</h2>
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

			<div class="create-link-section">
				{#if !canShare}
					<div class="incomplete-warning">
						<svg viewBox="0 0 20 20" fill="currentColor" class="warning-icon" aria-hidden="true">
							<path
								fill-rule="evenodd"
								d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
								clip-rule="evenodd"
							/>
						</svg>
						<div class="warning-content">
							<strong>Invoice is incomplete</strong>
							<p>Please complete the following to enable sharing:</p>
							<ul>
								{#each incompletionReasons as reason}
									<li>{reason}</li>
								{/each}
							</ul>
						</div>
					</div>
				{:else}
					<p class="description">
						Generate a shareable link that allows anyone to view this invoice without logging in.
						Links expire automatically based on the invoice due date.
					</p>
				{/if}
				<button class="create-link-button" onclick={createLink} disabled={isCreating || !canShare}>
					{#if isCreating}
						<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor">
							<circle cx="12" cy="12" r="9" stroke-width="2" stroke-dasharray="45 15" />
						</svg>
						Creating...
					{:else}
						<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
							<path
								d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z"
							/>
							<path
								d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z"
							/>
						</svg>
						Generate Share Link
					{/if}
				</button>
			</div>

			<div class="links-section">
				<h3>Shared Links</h3>

				{#if isLoading}
					<div class="loading">
						<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor">
							<circle cx="12" cy="12" r="9" stroke-width="2" stroke-dasharray="45 15" />
						</svg>
						Loading...
					</div>
				{:else if links.length === 0}
					<p class="no-links">No share links created yet.</p>
				{:else}
					<ul class="links-list">
						{#each links as link (link.id)}
							<li
								class="link-item"
								class:revoked={link.revoked}
								class:expired={isExpired(link.expiresAt)}
							>
								<div class="link-main">
									<div class="link-url-row">
										<input
											type="text"
											readonly
											value={link.url}
											class="link-url"
											onclick={(e) => (e.target as HTMLInputElement).select()}
										/>
										<button
											class="copy-button"
											onclick={() => copyToClipboard(link.url, link.id)}
											disabled={link.revoked || isExpired(link.expiresAt)}
											title="Copy link"
										>
											{#if copiedLinkId === link.id}
												<svg viewBox="0 0 20 20" fill="currentColor" class="check">
													<path
														fill-rule="evenodd"
														d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
														clip-rule="evenodd"
													/>
												</svg>
											{:else}
												<svg viewBox="0 0 20 20" fill="currentColor">
													<path
														d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3.879a1.5 1.5 0 0 1 1.06.44l3.122 3.12A1.5 1.5 0 0 1 17 6.622V12.5a1.5 1.5 0 0 1-1.5 1.5h-1v-3.379a3 3 0 0 0-.879-2.121L10.5 5.379A3 3 0 0 0 8.379 4.5H7v-1Z"
													/>
													<path
														d="M4.5 6A1.5 1.5 0 0 0 3 7.5v9A1.5 1.5 0 0 0 4.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5.879a1.5 1.5 0 0 0-.44-1.06L9.44 6.439A1.5 1.5 0 0 0 8.378 6H4.5Z"
													/>
												</svg>
											{/if}
										</button>
									</div>

									<div class="link-meta">
										<span class="meta-item">
											<svg viewBox="0 0 20 20" fill="currentColor">
												<path
													fill-rule="evenodd"
													d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z"
													clip-rule="evenodd"
												/>
											</svg>
											Created {formatDate(link.createdAt)}
										</span>

										{#if link.revoked}
											<span class="meta-item status-revoked">Revoked</span>
										{:else if isExpired(link.expiresAt)}
											<span class="meta-item status-expired">Expired</span>
										{:else}
											<span class="meta-item status-active">{getTimeRemaining(link.expiresAt)}</span
											>
										{/if}

										<span class="meta-item views">
											<svg viewBox="0 0 20 20" fill="currentColor">
												<path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
												<path
													fill-rule="evenodd"
													d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
													clip-rule="evenodd"
												/>
											</svg>
											{link.viewCount} view{link.viewCount !== 1 ? 's' : ''}
										</span>

										{#if link.lastViewedAt}
											<span class="meta-item last-viewed">
												Last viewed: {formatDateTime(link.lastViewedAt)}
											</span>
										{/if}
									</div>
								</div>

								{#if !link.revoked && !isExpired(link.expiresAt)}
									<button
										class="revoke-button"
										onclick={() => revokeLink(link.id)}
										title="Revoke link"
									>
										<svg viewBox="0 0 20 20" fill="currentColor">
											<path
												fill-rule="evenodd"
												d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
												clip-rule="evenodd"
											/>
										</svg>
										Revoke
									</button>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
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
		z-index: 1000;
		padding: 1rem;
	}

	.modal-content {
		background: var(--color-bg-primary, #fff);
		border-radius: var(--radius-lg, 0.5rem);
		width: 100%;
		max-width: 560px;
		max-height: 85vh;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--color-border-primary, #e5e7eb);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--color-border-primary, #e5e7eb);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text-primary, #111827);
	}

	.close-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: none;
		background: transparent;
		color: var(--color-text-secondary, #6b7280);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.close-button:hover {
		background: var(--color-bg-secondary, #f3f4f6);
		color: var(--color-text-primary, #111827);
	}

	.close-button svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.modal-body {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.error-message {
		padding: 0.75rem 1rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 0.5rem;
		color: #dc2626;
		font-size: 0.875rem;
	}

	.description {
		margin: 0 0 1rem;
		font-size: 0.875rem;
		color: var(--color-text-secondary, #6b7280);
		line-height: 1.5;
	}

	.incomplete-warning {
		display: flex;
		gap: 0.75rem;
		padding: 1rem;
		background: #fffbeb;
		border: 1px solid #fcd34d;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
	}

	:global(.dark) .incomplete-warning {
		background: rgba(251, 191, 36, 0.1);
		border-color: rgba(251, 191, 36, 0.3);
	}

	.warning-icon {
		width: 1.25rem;
		height: 1.25rem;
		color: #d97706;
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	.warning-content {
		flex: 1;
	}

	.warning-content strong {
		display: block;
		font-size: 0.875rem;
		font-weight: 600;
		color: #92400e;
		margin-bottom: 0.25rem;
	}

	:global(.dark) .warning-content strong {
		color: #fbbf24;
	}

	.warning-content p {
		margin: 0 0 0.5rem;
		font-size: 0.8125rem;
		color: #a16207;
	}

	:global(.dark) .warning-content p {
		color: #fcd34d;
	}

	.warning-content ul {
		margin: 0;
		padding-left: 1rem;
		font-size: 0.8125rem;
		color: #a16207;
	}

	:global(.dark) .warning-content ul {
		color: #fcd34d;
	}

	.warning-content li {
		margin-bottom: 0.125rem;
	}

	.create-link-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.75rem 1rem;
		background: var(--color-accent-blue, #2563eb);
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 0.9375rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s;
	}

	.create-link-button:hover:not(:disabled) {
		background: #1d4ed8;
	}

	.create-link-button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.create-link-button svg {
		width: 1.125rem;
		height: 1.125rem;
	}

	.spinner {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.links-section h3 {
		margin: 0 0 1rem;
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-text-primary, #111827);
	}

	.loading,
	.no-links {
		text-align: center;
		padding: 2rem;
		color: var(--color-text-secondary, #6b7280);
		font-size: 0.875rem;
	}

	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.loading svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.links-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.link-item {
		display: flex;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--color-bg-secondary, #f9fafb);
		border-radius: 0.5rem;
		border: 1px solid var(--color-border-primary, #e5e7eb);
	}

	.link-item.revoked,
	.link-item.expired {
		opacity: 0.6;
	}

	.link-main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.link-url-row {
		display: flex;
		gap: 0.5rem;
	}

	.link-url {
		flex: 1;
		min-width: 0;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border-primary, #e5e7eb);
		border-radius: 0.375rem;
		background: var(--color-bg-primary, #fff);
		font-size: 0.8125rem;
		color: var(--color-text-primary, #111827);
		font-family: ui-monospace, monospace;
	}

	.link-url:focus {
		outline: none;
		border-color: var(--color-accent-blue, #2563eb);
	}

	.copy-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border: 1px solid var(--color-border-primary, #e5e7eb);
		background: var(--color-bg-primary, #fff);
		border-radius: 0.375rem;
		cursor: pointer;
		color: var(--color-text-secondary, #6b7280);
		transition: all 0.2s;
		flex-shrink: 0;
	}

	.copy-button:hover:not(:disabled) {
		border-color: var(--color-accent-blue, #2563eb);
		color: var(--color-accent-blue, #2563eb);
	}

	.copy-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.copy-button svg {
		width: 1rem;
		height: 1rem;
	}

	.copy-button svg.check {
		color: #059669;
	}

	.link-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		font-size: 0.75rem;
		color: var(--color-text-secondary, #6b7280);
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.meta-item svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	.status-revoked {
		color: #dc2626;
		font-weight: 500;
	}

	.status-expired {
		color: #d97706;
		font-weight: 500;
	}

	.status-active {
		color: #059669;
		font-weight: 500;
	}

	.revoke-button {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.625rem;
		border: 1px solid #fecaca;
		background: #fef2f2;
		color: #dc2626;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		align-self: flex-start;
		flex-shrink: 0;
	}

	.revoke-button:hover {
		background: #fecaca;
	}

	.revoke-button svg {
		width: 0.875rem;
		height: 0.875rem;
	}

	@media (max-width: 480px) {
		.modal-content {
			max-height: 90vh;
		}

		.link-item {
			flex-direction: column;
		}

		.revoke-button {
			align-self: stretch;
			justify-content: center;
		}
	}
</style>
