<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let actionLoading = $state<string | null>(null);
	let confirmModal = $state<{
		action: 'restore' | 'destroy';
		userId: string;
		userName: string;
	} | null>(null);

	const formatDate = (date: Date) => {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	};

	const restoreUser = async (userId: string) => {
		actionLoading = userId;
		try {
			const res = await fetch(`/api/admin/users/${userId}/restore`, {
				method: 'POST'
			});
			if (res.ok) {
				location.reload();
			} else {
				const err = await res.json();
				alert(err.message || 'Failed to restore user');
			}
		} finally {
			actionLoading = null;
			confirmModal = null;
		}
	};

	const destroyUser = async (userId: string) => {
		actionLoading = userId;
		try {
			const res = await fetch(`/api/admin/users/${userId}/destroy`, {
				method: 'DELETE'
			});
			if (res.ok) {
				location.reload();
			} else {
				const err = await res.json();
				alert(err.message || 'Failed to permanently delete user');
			}
		} finally {
			actionLoading = null;
			confirmModal = null;
		}
	};

	const handleConfirm = () => {
		if (!confirmModal) return;
		if (confirmModal.action === 'restore') {
			restoreUser(confirmModal.userId);
		} else if (confirmModal.action === 'destroy') {
			destroyUser(confirmModal.userId);
		}
	};
</script>

<svelte:head>
	<title>Admin - Deleted Users</title>
</svelte:head>

<div class="admin-page">
	<header class="page-header">
		<h1>Deleted Users</h1>
		<p class="subtitle">Restore or permanently delete users</p>
	</header>

	{#if data.users.length === 0}
		<div class="empty-state-card">
			<svg viewBox="0 0 20 20" fill="currentColor" class="empty-icon">
				<path
					fill-rule="evenodd"
					d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
					clip-rule="evenodd"
				/>
			</svg>
			<h3>No Deleted Users</h3>
			<p>Deleted users will appear here for restoration or permanent deletion.</p>
			<a href="/admin" class="back-link">← Back to Users</a>
		</div>
	{:else}
		<div class="info-banner">
			<svg viewBox="0 0 20 20" fill="currentColor">
				<path
					fill-rule="evenodd"
					d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
					clip-rule="evenodd"
				/>
			</svg>
			<p>
				<strong>Warning:</strong> Permanently deleting a user will remove all their data including invoices
				and PDFs. This action cannot be undone.
			</p>
		</div>

		<div class="table-container">
			<table class="users-table">
				<thead>
					<tr>
						<th>User</th>
						<th>Invoices</th>
						<th>Deleted</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.users as user (user.id)}
						<tr>
							<td class="user-cell">
								{#if user.image}
									<img
										src={user.image}
										alt={user.name}
										class="user-avatar"
										referrerpolicy="no-referrer"
									/>
								{:else}
									<div class="user-avatar-fallback">{user.name.substring(0, 2).toUpperCase()}</div>
								{/if}
								<div class="user-info">
									<span class="user-name">{user.name}</span>
									<span class="user-email">{user.email}</span>
								</div>
							</td>
							<td>
								<span class="invoice-count">{user.invoiceCount}</span>
							</td>
							<td class="deleted-at">
								{formatDate(user.deletedAt)}
							</td>
							<td class="actions-cell">
								{#if actionLoading === user.id}
									<span class="loading-spinner"></span>
								{:else}
									<button
										class="action-btn restore"
										onclick={() =>
											(confirmModal = { action: 'restore', userId: user.id, userName: user.name })}
									>
										<svg viewBox="0 0 20 20" fill="currentColor">
											<path
												fill-rule="evenodd"
												d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
												clip-rule="evenodd"
											/>
										</svg>
										Restore
									</button>
									<button
										class="action-btn destroy"
										onclick={() =>
											(confirmModal = { action: 'destroy', userId: user.id, userName: user.name })}
									>
										<svg viewBox="0 0 20 20" fill="currentColor">
											<path
												fill-rule="evenodd"
												d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
												clip-rule="evenodd"
											/>
										</svg>
										Delete Forever
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<!-- Confirmation Modal -->
{#if confirmModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-overlay" onclick={() => (confirmModal = null)}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h3>
				{#if confirmModal.action === 'restore'}
					Restore User
				{:else}
					<span class="danger-text">⚠️ Permanently Delete User</span>
				{/if}
			</h3>
			<div class="modal-body">
				{#if confirmModal.action === 'restore'}
					<p>Are you sure you want to restore <strong>{confirmModal.userName}</strong>? They will be
					able to log in again.</p>
				{:else}
					<p><strong class="danger-text">This action cannot be undone!</strong></p>
					<p>Permanently deleting <strong>{confirmModal.userName}</strong> will remove:</p>
					<ul>
						<li>User account and all sessions</li>
						<li>All saved invoices</li>
						<li>All PDF files stored in cloud</li>
					</ul>
				{/if}
			</div>
			<div class="modal-actions">
				<button class="btn secondary" onclick={() => (confirmModal = null)}>Cancel</button>
				<button
					class="btn {confirmModal.action === 'restore' ? 'primary' : 'danger'}"
					onclick={handleConfirm}
				>
					{#if confirmModal.action === 'restore'}
						Restore User
					{:else}
						Yes, Delete Forever
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.admin-page {
		max-width: 1000px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.page-header h1 {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 0.25rem;
	}

	.subtitle {
		color: var(--color-text-secondary);
		margin: 0;
	}

	/* Empty State */
	.empty-state-card {
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-lg);
		padding: 3rem;
		text-align: center;
	}

	.empty-icon {
		width: 3rem;
		height: 3rem;
		color: var(--color-text-secondary);
		margin-bottom: 1rem;
	}

	.empty-state-card h3 {
		margin: 0 0 0.5rem;
		color: var(--color-text-primary);
	}

	.empty-state-card p {
		margin: 0 0 1.5rem;
		color: var(--color-text-secondary);
	}

	.back-link {
		color: var(--color-accent-blue);
		text-decoration: none;
		font-weight: 500;
	}

	/* Info Banner */
	.info-banner {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		background: #fef3c7;
		border: 1px solid #f59e0b;
		border-radius: var(--radius-md);
		padding: 1rem;
		margin-bottom: 1.5rem;
	}

	.info-banner svg {
		width: 1.25rem;
		height: 1.25rem;
		color: #b45309;
		flex-shrink: 0;
		margin-top: 0.1rem;
	}

	.info-banner p {
		margin: 0;
		color: #92400e;
		font-size: 0.9rem;
	}

	/* Table */
	.table-container {
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.users-table {
		width: 100%;
		border-collapse: collapse;
	}

	.users-table th,
	.users-table td {
		padding: 1rem;
		text-align: left;
		border-bottom: 1px solid var(--color-border-primary);
	}

	.users-table th {
		background: var(--color-bg-secondary);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-secondary);
	}

	.user-cell {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.user-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		object-fit: cover;
	}

	.user-avatar-fallback {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: linear-gradient(135deg, #9ca3af, #6b7280);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.85rem;
	}

	.user-info {
		display: flex;
		flex-direction: column;
	}

	.user-name {
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.user-email {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}

	.invoice-count {
		background: var(--color-bg-secondary);
		padding: 0.25rem 0.6rem;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
	}

	.deleted-at {
		color: var(--color-text-secondary);
		font-size: 0.85rem;
	}

	/* Actions */
	.actions-cell {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.75rem;
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.action-btn svg {
		width: 0.9rem;
		height: 0.9rem;
	}

	.action-btn.restore {
		background: #dcfce7;
		color: #166534;
	}

	.action-btn.restore:hover {
		background: #bbf7d0;
	}

	.action-btn.destroy {
		background: #fee2e2;
		color: #991b1b;
	}

	.action-btn.destroy:hover {
		background: #fecaca;
	}

	.loading-spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid var(--color-border-secondary);
		border-top-color: var(--color-accent-blue);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Modal */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.modal {
		background: var(--color-bg-primary);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		max-width: 450px;
		width: 90%;
	}

	.modal h3 {
		margin: 0 0 1rem;
		font-size: 1.25rem;
	}

	.modal p {
		color: var(--color-text-secondary);
		margin: 0 0 1.5rem;
	}

	.modal ul {
		margin: 0.75rem 0 0;
		padding-left: 1.25rem;
	}

	.modal li {
		margin-bottom: 0.25rem;
	}

	.danger-text {
		color: #dc2626;
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
	}

	.btn {
		padding: 0.6rem 1.25rem;
		border-radius: var(--radius-md);
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		border: none;
	}

	.btn.secondary {
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
	}

	.btn.primary {
		background: var(--color-accent-blue);
		color: white;
	}

	.btn.danger {
		background: #dc2626;
		color: white;
	}

	@media (max-width: 640px) {
		.actions-cell {
			flex-direction: column;
		}
	}
</style>
