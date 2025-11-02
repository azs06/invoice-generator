<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		getAllInvoices,
		deleteInvoice,
		clearAllInvoices,
		saveInvoice,
		getInvoice
	} from '$lib/db.js';
	import { toUSCurrency } from '$lib/currency.js';

	export const prerender = true;

	let allInvoices = [];
	let savedInvoices = [];
	let search = '';
	let showInvoiceDeleteModal = false;
	let invoiceToDelete = null;
	let showArchived = false;
	let filterMode = 'all';
	let isLoading = true;

	const parseDate = (value) => {
		if (!value) return 0;
		const parsed = Date.parse(value);
		return Number.isNaN(parsed) ? 0 : parsed;
	};

	const formatDate = (value) => {
		const parsed = parseDate(value);
		if (!parsed) return 'Date not set';
		return new Intl.DateTimeFormat(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(parsed);
	};

	const formatAmount = (value = 0) => {
		const amount = Number(value);
		const safeAmount = Number.isFinite(amount) ? amount : 0;
		return toUSCurrency(safeAmount);
	};

	const balanceDueAmount = (invoice) => {
		const value = Number(invoice?.balanceDue ?? invoice?.total ?? 0);
		if (!Number.isFinite(value)) return 0;
		return Math.max(value, 0);
	};

	const invoiceTitle = (invoice) => {
		if (!invoice) return 'Untitled invoice';
		const draftName = invoice.draftName?.trim();
		if (draftName) return draftName;
		const label = invoice.invoiceLabel?.trim() || 'Invoice';
		const number = invoice.invoiceNumber?.trim();
		return number ? `${label} ${number}` : label;
	};

	const applyFilters = () => {
		let filtered = allInvoices.filter(({ invoice }) => {
			const archived = invoice?.archived === true;
			return showArchived ? archived : !archived;
		});

		filtered = filtered.filter(({ invoice }) => {
			if (!invoice) return false;
			if (filterMode === 'draft') return invoice.draft === true;
			if (filterMode === 'finalized') return invoice.draft === false;
			return true;
		});

		const term = search.trim().toLowerCase();
		if (term) {
			filtered = filtered.filter(({ invoice }) => {
				if (!invoice) return false;
				const haystack = [
					invoice.draftName,
					invoice.invoiceLabel,
					invoice.invoiceNumber,
					invoice.invoiceTo,
					invoice.invoiceFrom
				]
					.filter(Boolean)
					.join(' ')
					.toLowerCase();
				return haystack.includes(term);
			});
		}

		filtered.sort((a, b) => {
			const dateA = parseDate(a.invoice?.date);
			const dateB = parseDate(b.invoice?.date);
			if (dateA === dateB) {
				return (b.invoice?.invoiceNumber || '').localeCompare(a.invoice?.invoiceNumber || '');
			}
			return dateB - dateA;
		});

		savedInvoices = filtered;
	};

	const loadInvoices = async () => {
		isLoading = true;
		const invoices = await getAllInvoices();
		allInvoices = invoices;
		applyFilters();
		isLoading = false;
	};

	const onSearchInput = (event) => {
		search = event.target.value;
		applyFilters();
	};

	const setArchivedView = (value) => {
		showArchived = value;
		applyFilters();
	};

	const setFilterMode = (mode) => {
		filterMode = mode;
		applyFilters();
	};

	const removeInvoice = async (id = invoiceToDelete) => {
		if (!id) return;
		await deleteInvoice(id);
		invoiceToDelete = null;
		showInvoiceDeleteModal = false;
		await loadInvoices();
	};

	const clearData = async () => {
		await clearAllInvoices();
		allInvoices = [];
		savedInvoices = [];
	};

	const archiveInvoice = async (id) => {
		const data = await getInvoice(id);
		if (data) {
			data.archived = true;
			await saveInvoice(id, data);
			await loadInvoices();
		}
	};

	const unarchiveInvoice = async (id) => {
		const data = await getInvoice(id);
		if (data) {
			data.archived = false;
			await saveInvoice(id, data);
			await loadInvoices();
		}
	};

	const confirmDeleteInvoice = (id) => {
		invoiceToDelete = id;
		showInvoiceDeleteModal = true;
	};

	const cancelDelete = () => {
		invoiceToDelete = null;
		showInvoiceDeleteModal = false;
	};

	const openInvoice = (id) => {
		goto(`/?invoice=${id}`);
	};

	onMount(() => {
		loadInvoices();
	});
</script>

<section class="saved-page">
	<div class="page-shell">
		<header class="page-header">
			<span class="page-badge">Saved invoices</span>
			<h1 class="page-title">My invoices</h1>
			<p class="page-subtitle">We automatically save your invoice drafts to your device.</p>

			<div class="header-controls">
				<label class="search-field">
					<span class="sr-only">Search saved invoices</span>
					<svg class="search-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.6"
							d="m17.5 17.5-3.6-3.6m1.1-4.4a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Z"
						/>
					</svg>
					<input
						type="search"
						placeholder="Search by client, label, or invoice #"
						bind:value={search}
						on:input={onSearchInput}
					/>
				</label>
				<button class="primary-button" type="button" on:click={() => goto('/')}>
					<svg class="button-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path
							fill-rule="evenodd"
							d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 0 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z"
							clip-rule="evenodd"
						/>
					</svg>
					<span>New invoice</span>
				</button>
			</div>

			<div class="filter-toolbar">
				<div class="filter-group">
					<span class="filter-label">Collection</span>
					<div class="chip-group">
						<button
							type="button"
							class:active={!showArchived}
							on:click={() => setArchivedView(false)}
							aria-pressed={!showArchived}
						>
							Active
						</button>
						<button
							type="button"
							class:active={showArchived}
							on:click={() => setArchivedView(true)}
							aria-pressed={showArchived}
						>
							Archived
						</button>
					</div>
				</div>

				<div class="filter-group">
					<span class="filter-label">Status</span>
					<div class="chip-group">
						<button
							type="button"
							class:active={filterMode === 'all'}
							on:click={() => setFilterMode('all')}
							aria-pressed={filterMode === 'all'}
						>
							All
						</button>
						<button
							type="button"
							class:active={filterMode === 'draft'}
							on:click={() => setFilterMode('draft')}
							aria-pressed={filterMode === 'draft'}
						>
							Drafts
						</button>
						<button
							type="button"
							class:active={filterMode === 'finalized'}
							on:click={() => setFilterMode('finalized')}
							aria-pressed={filterMode === 'finalized'}
						>
							Finalized
						</button>
					</div>
				</div>
			</div>
		</header>

		{#if isLoading}
			<div class="state-card">
				<div class="state-spinner" aria-hidden="true"></div>
				<p>Loading saved invoices…</p>
			</div>
		{:else if savedInvoices.length === 0}
			<div class="state-card">
				<h2>No saved invoices yet</h2>
				<p>Start a draft and it will appear here automatically.</p>
				<button class="primary-button" type="button" on:click={() => goto('/')}>
					<svg class="button-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path
							fill-rule="evenodd"
							d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 0 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z"
							clip-rule="evenodd"
						/>
					</svg>
					<span>Create invoice</span>
				</button>
			</div>
		{:else}
			<div class="invoice-grid">
				{#each savedInvoices as record (record.id)}
					{#if record.invoice}
						<article class="invoice-card">
							<div class="invoice-card__top">
								<div>
									<h3 class="invoice-card__title">{invoiceTitle(record.invoice)}</h3>
									<div class="invoice-card__badges">
										<span
											class="status-badge {record.invoice.draft ? 'status-badge--draft' : 'status-badge--finalized'}"
										>
											{record.invoice.draft ? 'Draft' : 'Finalized'}
										</span>
										{#if record.invoice.archived}
											<span class="status-badge status-badge--archived">Archived</span>
										{/if}
									</div>
								</div>
								<div class="invoice-card__amount">
									<span class="meta-label">Balance due</span>
									<span class="amount-value">{formatAmount(balanceDueAmount(record.invoice))}</span>
								</div>
							</div>

							<div class="invoice-card__meta">
								<div>
									<span class="meta-label">Client</span>
									<span class="meta-value">{record.invoice.invoiceTo || 'Client not set'}</span>
								</div>
								<div>
									<span class="meta-label">Invoice #</span>
									<span class="meta-value">{record.invoice.invoiceNumber || 'Not assigned'}</span>
								</div>
								<div>
									<span class="meta-label">Issued</span>
									<span class="meta-value">{formatDate(record.invoice.date)}</span>
								</div>
							</div>

							<div class="card-divider"></div>

							<div class="card-actions">
								<button class="ghost-button" type="button" on:click={() => openInvoice(record.id)}>
									<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
										<path
											fill-rule="evenodd"
											d="M10 3c-5 0-9 4.03-9 7s4 7 9 7 9-4.03 9-7-4-7-9-7Zm0 11.25a4.25 4.25 0 1 1 0-8.5 4.25 4.25 0 0 1 0 8.5Zm0-1.5a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Z"
											clip-rule="evenodd"
										/>
									</svg>
									<span>Open</span>
								</button>

								<div class="card-actions__secondary">
									{#if record.invoice.archived}
										<button
											class="ghost-button ghost-button--success"
											type="button"
											on:click={() => unarchiveInvoice(record.id)}
										>
											<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
												<path
													fill-rule="evenodd"
													d="M10 3a7 7 0 0 0-6.492 4.41.75.75 0 0 0 1.384.558A5.5 5.5 0 1 1 4.5 10H3a.75.75 0 0 0 0 1.5h3.75a.75.75 0 0 0 .75-.75V7a.75.75 0 0 0-1.5 0v1.332A7.001 7.001 0 0 1 17 10a7 7 0 0 0-7-7Z"
													clip-rule="evenodd"
												/>
											</svg>
											<span>Unarchive</span>
										</button>
									{:else}
										<button
											class="ghost-button"
											type="button"
											on:click={() => archiveInvoice(record.id)}
										>
											<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
												<path d="M4 3a2 2 0 0 0-2 2v1.5A1.5 1.5 0 0 0 3.5 8H4v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8h.5A1.5 1.5 0 0 0 18 6.5V5a2 2 0 0 0-2-2H4Zm3 6.5A.5.5 0 0 1 7.5 9h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5ZM4 5h12v1.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V5Z" />
											</svg>
											<span>Archive</span>
										</button>
									{/if}

									<button
										class="ghost-button ghost-button--danger"
										type="button"
										on:click={() => confirmDeleteInvoice(record.id)}
									>
										<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
											<path
												fill-rule="evenodd"
												d="M8.75 3a1.75 1.75 0 0 0-1.744 1.61l-.067.676H4a.75.75 0 0 0 0 1.5h.577l.641 9.137A2.25 2.25 0 0 0 7.463 18h5.074a2.25 2.25 0 0 0 2.245-2.077l.641-9.137H16a.75.75 0 0 0 0-1.5h-2.94l-.067-.676A1.75 1.75 0 0 0 11.25 3h-2.5Zm3.146 3.286-.036-.36A.25.25 0 0 0 11.25 5.5h-2.5a.25.25 0 0 0-.249.226l-.036.36h3.432Zm-3.146 3.964a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5Zm4 0a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5Z"
												clip-rule="evenodd"
											/>
										</svg>
										<span>Delete</span>
									</button>
								</div>
							</div>
						</article>
					{/if}
				{/each}
			</div>
		{/if}

		<footer class="page-footer">
			<p>These invoices are stored on this device. Clearing your browser cache will remove them.</p>
			<button class="ghost-button ghost-button--danger" type="button" on:click={clearData}>
				Clear everything
			</button>
		</footer>
	</div>

	{#if showInvoiceDeleteModal}
		<div class="modal-backdrop" role="dialog" aria-modal="true">
			<div class="modal" role="document">
				<h2>Delete this invoice?</h2>
				<p>This action cannot be undone. You will need to recreate the invoice manually.</p>
				<div class="modal-actions">
					<button class="danger-button" type="button" on:click={removeInvoice}>Delete</button>
					<button class="ghost-button" type="button" on:click={cancelDelete}>Cancel</button>
				</div>
			</div>
		</div>
	{/if}
</section>

<style>
	.saved-page {
		padding: clamp(2rem, 4vw, 3rem) 1.5rem 3rem;
	}

	.page-shell {
		max-width: 1120px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}

	.page-header {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding: clamp(1.75rem, 3vw, 2.5rem);
		border-radius: var(--radius-lg);
		border: 1px solid var(--surface-card-border);
		background: linear-gradient(
			135deg,
			var(--surface-card-gradient-top),
			var(--surface-card-gradient-bottom)
		);
		box-shadow: var(--shadow-medium);
		overflow: hidden;
	}

	.page-header::after {
		content: '';
		position: absolute;
		inset: -40% -30% auto auto;
		width: 320px;
		height: 320px;
		background: radial-gradient(circle at center, rgba(59, 130, 246, 0.12) 0%, transparent 70%);
		pointer-events: none;
	}

	.page-badge {
		align-self: flex-start;
		padding: 0.25rem 0.85rem;
		border-radius: var(--radius-pill);
		background: rgba(59, 130, 246, 0.12);
		color: var(--color-accent-blue);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.page-title {
		margin: 0;
		font-size: clamp(1.75rem, 3vw, 2.4rem);
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.page-subtitle {
		margin: 0;
		max-width: 520px;
		color: var(--color-text-secondary);
	}

	.header-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: center;
	}

	.search-field {
		position: relative;
		display: flex;
		align-items: center;
		flex: 1 1 240px;
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-pill);
		padding: 0.35rem 1rem 0.35rem 2.75rem;
		box-shadow: var(--shadow-soft);
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.search-field:focus-within {
		border-color: var(--color-accent-blue);
		box-shadow: var(--shadow-focus);
	}

	.search-field input {
		width: 100%;
		border: none;
		outline: none;
		background: transparent;
		color: var(--color-text-primary);
		font-size: 0.95rem;
		padding: 0.35rem 0;
	}

	.search-icon {
		position: absolute;
		left: 1rem;
		width: 1.1rem;
		height: 1.1rem;
		color: var(--color-text-secondary);
	}

	.primary-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		border-radius: var(--radius-pill);
		border: none;
		background: var(--color-accent-blue);
		color: #ffffff;
		padding: 0.6rem 1.3rem;
		font-weight: 600;
		cursor: pointer;
		box-shadow: var(--shadow-medium);
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.primary-button:hover {
		transform: translateY(-1px);
		box-shadow: 0 12px 28px -18px rgba(59, 130, 246, 0.8);
	}

	.primary-button:active {
		transform: translateY(0);
	}

	.button-icon {
		width: 1rem;
		height: 1rem;
	}

	.filter-toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid rgba(148, 163, 184, 0.2);
	}

	.filter-group {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
	}

	.filter-label {
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		letter-spacing: 0.08em;
	}

	.chip-group {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.chip-group button {
		padding: 0.35rem 0.9rem;
		border-radius: var(--radius-pill);
		border: 1px solid var(--color-border-secondary);
		background: rgba(255, 255, 255, 0.65);
		color: var(--color-text-secondary);
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
	}

	.chip-group button:hover {
		transform: translateY(-1px);
	}

	.chip-group button.active {
		background: rgba(59, 130, 246, 0.12);
		border-color: rgba(59, 130, 246, 0.45);
		color: var(--color-accent-blue);
		box-shadow: var(--shadow-soft);
	}

	.invoice-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.75rem;
	}

	.invoice-card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding: 1.5rem;
		border-radius: var(--radius-lg);
		border: 1px solid var(--surface-card-border);
		background: linear-gradient(
			180deg,
			var(--surface-card-gradient-top),
			var(--surface-card-gradient-bottom)
		);
		box-shadow: var(--shadow-soft);
		overflow: hidden;
		min-height: 220px;
	}

	.invoice-card::before {
		content: '';
		position: absolute;
		inset: -40% auto auto -40%;
		width: 160px;
		height: 160px;
		background: radial-gradient(circle at center, rgba(59, 130, 246, 0.08) 0%, transparent 70%);
		pointer-events: none;
	}

	.invoice-card__top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		position: relative;
		z-index: 1;
	}

	.invoice-card__title {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.invoice-card__badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.45rem;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.6rem;
		border-radius: var(--radius-pill);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.status-badge--draft {
		background: rgba(251, 191, 36, 0.2);
		color: #92400e;
	}

	.status-badge--finalized {
		background: rgba(16, 185, 129, 0.2);
		color: #047857;
	}

	.status-badge--archived {
		background: rgba(148, 163, 184, 0.25);
		color: var(--color-text-secondary);
	}

	.invoice-card__amount {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
		min-width: 120px;
		text-align: right;
	}

	.meta-label {
		display: block;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-secondary);
	}

	.amount-value {
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.invoice-card__meta {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 1rem;
		position: relative;
		z-index: 1;
	}

	.meta-value {
		font-weight: 600;
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.card-divider {
		height: 1px;
		background: rgba(148, 163, 184, 0.25);
		position: relative;
		z-index: 1;
	}

	.card-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		position: relative;
		z-index: 1;
	}

	.card-actions__secondary {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.ghost-button {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		border-radius: var(--radius-pill);
		border: 1px solid rgba(148, 163, 184, 0.6);
		background: rgba(255, 255, 255, 0.75);
		color: var(--color-text-primary);
		padding: 0.45rem 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
	}

	.ghost-button:hover {
		transform: translateY(-1px);
		border-color: var(--color-accent-blue);
		color: var(--color-accent-blue);
	}

	.ghost-button svg {
		width: 0.95rem;
		height: 0.95rem;
	}

	.ghost-button--danger {
		border-color: rgba(239, 68, 68, 0.55);
		color: #b91c1c;
	}

	.ghost-button--danger:hover {
		background: rgba(239, 68, 68, 0.08);
		border-color: #ef4444;
		color: #ef4444;
	}

	.ghost-button--success {
		border-color: rgba(16, 185, 129, 0.45);
		color: #047857;
	}

	.ghost-button--success:hover {
		background: rgba(16, 185, 129, 0.1);
		border-color: #10b981;
		color: #047857;
	}

	.state-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 2.5rem 2rem;
		border-radius: var(--radius-lg);
		border: 1px solid var(--surface-card-border);
		background: linear-gradient(
			180deg,
			var(--surface-glass-overlay-top),
			var(--surface-glass-overlay-bottom)
		);
		box-shadow: var(--shadow-soft);
		text-align: center;
	}

	.state-card h2 {
		margin: 0;
		font-size: 1.3rem;
	}

	.state-card p {
		margin: 0;
		color: var(--color-text-secondary);
		max-width: 420px;
	}

	.state-spinner {
		width: 2.2rem;
		height: 2.2rem;
		border-radius: 50%;
		border: 3px solid rgba(148, 163, 184, 0.35);
		border-top-color: var(--color-accent-blue);
		animation: spin 1s linear infinite;
	}

	.page-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
		color: var(--color-text-secondary);
		font-size: 0.9rem;
	}

	.page-footer button {
		align-self: flex-start;
	}

	.modal-backdrop {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(15, 23, 42, 0.35);
		backdrop-filter: blur(2px);
		z-index: 100;
		padding: 1.5rem;
	}

	.modal {
		background: var(--color-bg-primary);
		padding: 2rem;
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-primary);
		box-shadow: var(--shadow-medium);
		max-width: 360px;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.modal h2 {
		margin: 0;
		font-size: 1.2rem;
		color: var(--color-text-primary);
	}

	.modal p {
		margin: 0;
		color: var(--color-text-secondary);
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.danger-button {
		border: none;
		border-radius: var(--radius-pill);
		background: #ef4444;
		color: #ffffff;
		padding: 0.55rem 1.2rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s ease, transform 0.2s ease;
	}

	.danger-button:hover {
		background: #dc2626;
		transform: translateY(-1px);
	}

	.danger-button:active {
		transform: translateY(0);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 900px) {
		.page-header {
			padding: 1.75rem;
		}
	}

	@media (max-width: 768px) {
		.header-controls {
			flex-direction: column;
			align-items: stretch;
		}

		.primary-button {
			width: 100%;
			justify-content: center;
		}

		.card-actions {
			flex-direction: column;
			align-items: stretch;
		}

		.card-actions__secondary {
			width: 100%;
			justify-content: stretch;
		}

		.ghost-button,
		.ghost-button--danger,
		.ghost-button--success {
			justify-content: center;
			width: 100%;
		}
	}

	@media (max-width: 580px) {
		.invoice-card__top {
			flex-direction: column;
			align-items: flex-start;
		}

		.invoice-card__amount {
			text-align: left;
			align-items: flex-start;
		}
	}
</style>
