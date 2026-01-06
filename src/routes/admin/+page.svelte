<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let filterRole = $state<'all' | 'admin' | 'user' | 'banned'>('all');
	let actionLoading = $state<string | null>(null);
	let confirmModal = $state<{ action: string; userId: string; userName: string } | null>(null);

	const filteredUsers = $derived(() => {
		let result = data.users;

		// Filter by search
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(u) => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)
			);
		}

		// Filter by role/status
		if (filterRole === 'admin') {
			result = result.filter((u) => u.role === 'admin' || u.isSuperAdmin);
		} else if (filterRole === 'user') {
			result = result.filter((u) => u.role === 'user' && !u.isSuperAdmin);
		} else if (filterRole === 'banned') {
			result = result.filter((u) => u.isBanned);
		}

		return result;
	});

	const formatDate = (date: Date) => {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	};

	const banUser = async (userId: string, ban: boolean) => {
		actionLoading = userId;
		try {
			const res = await fetch(`/api/admin/users/${userId}/ban`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ banned: ban })
			});
			if (res.ok) {
				location.reload();
			} else {
				const err = await res.json();
				alert(err.message || 'Failed to update user');
			}
		} finally {
			actionLoading = null;
			confirmModal = null;
		}
	};

	const deleteUser = async (userId: string) => {
		actionLoading = userId;
		try {
			const res = await fetch(`/api/admin/users/${userId}/delete`, {
				method: 'DELETE'
			});
			if (res.ok) {
				location.reload();
			} else {
				const err = await res.json();
				alert(err.message || 'Failed to delete user');
			}
		} finally {
			actionLoading = null;
			confirmModal = null;
		}
	};

	const changeRole = async (userId: string, newRole: 'admin' | 'user') => {
		actionLoading = userId;
		try {
			const res = await fetch(`/api/admin/users/${userId}/role`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ role: newRole })
			});
			if (res.ok) {
				location.reload();
			} else {
				const err = await res.json();
				alert(err.message || 'Failed to change role');
			}
		} finally {
			actionLoading = null;
		}
	};

	const handleConfirm = () => {
		if (!confirmModal) return;
		if (confirmModal.action === 'ban') {
			banUser(confirmModal.userId, true);
		} else if (confirmModal.action === 'unban') {
			banUser(confirmModal.userId, false);
		} else if (confirmModal.action === 'delete') {
			deleteUser(confirmModal.userId);
		}
	};
</script>

<svelte:head>
	<title>Admin - User Management</title>
</svelte:head>

<div class="admin-page">
	<header class="page-header">
		<h1>User Management</h1>
		<p class="subtitle">Manage users, roles, and access</p>
	</header>

	<!-- Stats Cards -->
	<div class="stats-grid">
		<div class="stat-card">
			<div class="stat-value">{data.stats.totalUsers}</div>
			<div class="stat-label">Total Users</div>
		</div>
		<div class="stat-card active">
			<div class="stat-value">{data.stats.activeUsers}</div>
			<div class="stat-label">Active</div>
		</div>
		<div class="stat-card banned">
			<div class="stat-value">{data.stats.bannedUsers}</div>
			<div class="stat-label">Banned</div>
		</div>
		<div class="stat-card admin">
			<div class="stat-value">{data.stats.adminUsers}</div>
			<div class="stat-label">Admins</div>
		</div>
	</div>

	<!-- Filter Bar -->
	<div class="filter-bar">
		<div class="search-box">
			<svg viewBox="0 0 20 20" fill="currentColor" class="search-icon">
				<path
					fill-rule="evenodd"
					d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
					clip-rule="evenodd"
				/>
			</svg>
			<input type="text" placeholder="Search users..." bind:value={searchQuery} />
		</div>
		<div class="filter-buttons">
			<button class:active={filterRole === 'all'} onclick={() => (filterRole = 'all')}>All</button>
			<button class:active={filterRole === 'admin'} onclick={() => (filterRole = 'admin')}
				>Admins</button
			>
			<button class:active={filterRole === 'user'} onclick={() => (filterRole = 'user')}
				>Users</button
			>
			<button class:active={filterRole === 'banned'} onclick={() => (filterRole = 'banned')}
				>Banned</button
			>
		</div>
	</div>

	<!-- Users Table -->
	<div class="table-container">
		<table class="users-table">
			<thead>
				<tr>
					<th>User</th>
					<th>Role</th>
					<th>Status</th>
					<th>Invoices</th>
					<th>Joined</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each filteredUsers() as user (user.id)}
					<tr class:banned={user.isBanned}>
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
							{#if user.isSuperAdmin}
								<span class="badge super-admin">Super Admin</span>
							{:else if user.role === 'admin'}
								<span class="badge admin">Admin</span>
							{:else}
								<span class="badge user">User</span>
							{/if}
						</td>
						<td>
							{#if user.isBanned}
								<span class="badge banned">Banned</span>
							{:else}
								<span class="badge active">Active</span>
							{/if}
						</td>
						<td>{user.invoiceCount}</td>
						<td>{formatDate(user.createdAt)}</td>
						<td class="actions-cell">
							{#if !user.isSuperAdmin}
								{#if actionLoading === user.id}
									<span class="loading-spinner"></span>
								{:else}
									{#if data.currentUserIsSuperAdmin}
										{#if user.role === 'admin'}
											<button
												class="action-btn demote"
												onclick={() => changeRole(user.id, 'user')}
												title="Remove admin"
												aria-label="Remove admin"
											>
												<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
													<path
														fill-rule="evenodd"
														d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z"
														clip-rule="evenodd"
													/>
												</svg>
											</button>
										{:else}
											<button
												class="action-btn promote"
												onclick={() => changeRole(user.id, 'admin')}
												title="Make admin"
												aria-label="Make admin"
											>
												<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
													<path
														fill-rule="evenodd"
														d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
														clip-rule="evenodd"
													/>
												</svg>
											</button>
										{/if}
									{/if}
									{#if user.isBanned}
										<button
											class="action-btn unban"
											onclick={() =>
												(confirmModal = { action: 'unban', userId: user.id, userName: user.name })}
											title="Unban user"
											aria-label="Unban user"
										>
											<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
												<path
													fill-rule="evenodd"
													d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
													clip-rule="evenodd"
												/>
											</svg>
										</button>
									{:else}
										<button
											class="action-btn ban"
											onclick={() =>
												(confirmModal = { action: 'ban', userId: user.id, userName: user.name })}
											title="Ban user"
											aria-label="Ban user"
										>
											<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
												<path
													fill-rule="evenodd"
													d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"
													clip-rule="evenodd"
												/>
											</svg>
										</button>
									{/if}
									<button
										class="action-btn delete"
										onclick={() =>
											(confirmModal = { action: 'delete', userId: user.id, userName: user.name })}
										title="Delete user"
										aria-label="Delete user"
									>
										<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
											<path
												fill-rule="evenodd"
												d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
												clip-rule="evenodd"
											/>
										</svg>
									</button>
								{/if}
							{:else}
								<span class="protected-badge">Protected</span>
							{/if}
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="6" class="empty-state">No users found</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
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
				{#if confirmModal.action === 'ban'}
					Ban User
				{:else if confirmModal.action === 'unban'}
					Unban User
				{:else}
					Delete User
				{/if}
			</h3>
			<p>
				{#if confirmModal.action === 'ban'}
					Are you sure you want to ban <strong>{confirmModal.userName}</strong>? They will be logged
					out and unable to access their account.
				{:else if confirmModal.action === 'unban'}
					Are you sure you want to unban <strong>{confirmModal.userName}</strong>? They will be able
					to log in again.
				{:else}
					Are you sure you want to delete <strong>{confirmModal.userName}</strong>? They will be
					moved to deleted users and can be restored later.
				{/if}
			</p>
			<div class="modal-actions">
				<button class="btn secondary" onclick={() => (confirmModal = null)}>Cancel</button>
				<button
					class="btn {confirmModal.action === 'unban' ? 'primary' : 'danger'}"
					onclick={handleConfirm}
				>
					{#if confirmModal.action === 'ban'}
						Ban User
					{:else if confirmModal.action === 'unban'}
						Unban User
					{:else}
						Delete User
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.admin-page {
		max-width: 1200px;
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

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-lg);
		padding: 1.25rem;
		text-align: center;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.stat-label {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-card.active .stat-value {
		color: #10b981;
	}
	.stat-card.banned .stat-value {
		color: #ef4444;
	}
	.stat-card.admin .stat-value {
		color: #8b5cf6;
	}

	/* Filter Bar */
	.filter-bar {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	.search-box {
		position: relative;
		flex: 1;
		min-width: 200px;
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		width: 1.25rem;
		height: 1.25rem;
		color: var(--color-text-secondary);
	}

	.search-box input {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 2.5rem;
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		background: var(--color-bg-primary);
		color: var(--color-text-primary);
		font-size: 0.9rem;
	}

	.filter-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.filter-buttons button {
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		background: var(--color-bg-primary);
		color: var(--color-text-secondary);
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.filter-buttons button.active {
		background: var(--color-accent-blue);
		border-color: var(--color-accent-blue);
		color: white;
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

	.users-table tr.banned {
		background: rgba(239, 68, 68, 0.05);
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
		background: linear-gradient(135deg, #6366f1, #8b5cf6);
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

	/* Badges */
	.badge {
		display: inline-block;
		padding: 0.25rem 0.6rem;
		border-radius: 9999px;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.badge.super-admin {
		background: linear-gradient(135deg, #f59e0b, #d97706);
		color: white;
	}

	.badge.admin {
		background: #8b5cf6;
		color: white;
	}

	.badge.user {
		background: var(--color-bg-secondary);
		color: var(--color-text-secondary);
	}

	.badge.active {
		background: #dcfce7;
		color: #166534;
	}

	.badge.banned {
		background: #fee2e2;
		color: #991b1b;
	}

	.protected-badge {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		font-style: italic;
	}

	/* Actions */
	.actions-cell {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		padding: 0.4rem;
		border: none;
		border-radius: var(--radius-sm);
		background: var(--color-bg-secondary);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.action-btn svg {
		width: 1rem;
		height: 1rem;
		display: block;
	}

	.action-btn.promote {
		color: #10b981;
	}
	.action-btn.promote:hover {
		background: #dcfce7;
	}
	.action-btn.demote {
		color: #f59e0b;
	}
	.action-btn.demote:hover {
		background: #fef3c7;
	}
	.action-btn.ban {
		color: #ef4444;
	}
	.action-btn.ban:hover {
		background: #fee2e2;
	}
	.action-btn.unban {
		color: #10b981;
	}
	.action-btn.unban:hover {
		background: #dcfce7;
	}
	.action-btn.delete {
		color: #6b7280;
	}
	.action-btn.delete:hover {
		background: #f3f4f6;
		color: #ef4444;
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

	.empty-state {
		text-align: center;
		color: var(--color-text-secondary);
		padding: 3rem !important;
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
		max-width: 400px;
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
		background: #ef4444;
		color: white;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.users-table {
			font-size: 0.85rem;
		}

		.users-table th:nth-child(4),
		.users-table td:nth-child(4),
		.users-table th:nth-child(5),
		.users-table td:nth-child(5) {
			display: none;
		}
	}
</style>
