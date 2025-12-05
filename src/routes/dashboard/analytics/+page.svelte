<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { toUSCurrency } from '$lib/currency';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let query = $state('');
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let analysisResult = $state<string | null>(null);

	const prebuiltQueries = [
		{ key: 'revenue_last_month', query: 'What was my total revenue last month?' },
		{ key: 'top_clients', query: 'Who are my top 3 clients by invoice value?' },
		{ key: 'average_invoice', query: "What's my average invoice amount?" },
		{ key: 'unpaid_summary', query: 'Give me a summary of my unpaid invoices' },
		{ key: 'payment_rate', query: 'What percentage of my invoices are paid?' }
	];

	const analyzeQuery = async (queryText: string): Promise<void> => {
		if (!queryText.trim()) {
			error = 'Please enter a question';
			return;
		}

		isLoading = true;
		error = null;
		analysisResult = null;

		try {
			const response = await fetch('/api/ai/analytics', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: queryText.trim(),
					invoiceSummary: data.summary
				})
			});

			const result = await response.json();

			if (!result.success) {
				error = result.error || 'Failed to analyze data';
				return;
			}

			analysisResult = result.analysis;
		} catch (err) {
			console.error('Analysis error:', err);
			error = 'Failed to connect to AI service';
		} finally {
			isLoading = false;
		}
	};

	const handleSubmit = (): void => {
		analyzeQuery(query);
	};

	const handlePrebuiltQuery = (queryText: string): void => {
		query = queryText;
		analyzeQuery(queryText);
	};

	const handleKeydown = (event: KeyboardEvent): void => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSubmit();
		}
	};

	const clearResult = (): void => {
		analysisResult = null;
		error = null;
	};
</script>

<svelte:head>
	<title>{$_('ai.analytics_title')} | Free Invoice Generator</title>
	<meta name="description" content="AI-powered analytics for your invoices" />
</svelte:head>

<div class="analytics-page">
	<header class="page-header">
		<div class="header-content">
			<h1>{$_('ai.analytics_title')}</h1>
			<p class="page-description">{$_('ai.analytics_description')}</p>
		</div>
		<a href="/dashboard" class="back-link">
			<svg viewBox="0 0 20 20" fill="currentColor">
				<path
					fill-rule="evenodd"
					d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
					clip-rule="evenodd"
				/>
			</svg>
			{$_('ai.back_to_dashboard')}
		</a>
	</header>

	<!-- Summary Cards -->
	<section class="summary-cards">
		<div class="summary-card">
			<span class="card-label">{$_('ai.total_invoices')}</span>
			<span class="card-value">{data.summary.totalInvoices}</span>
		</div>
		<div class="summary-card">
			<span class="card-label">{$_('ai.total_revenue')}</span>
			<span class="card-value">{$toUSCurrency(data.summary.totalRevenue)}</span>
		</div>
		<div class="summary-card">
			<span class="card-label">{$_('ai.paid_invoices')}</span>
			<span class="card-value success">{data.summary.paidCount}</span>
		</div>
		<div class="summary-card">
			<span class="card-label">{$_('ai.unpaid_invoices')}</span>
			<span class="card-value warning">{data.summary.unpaidCount}</span>
		</div>
		<div class="summary-card">
			<span class="card-label">{$_('ai.average_amount')}</span>
			<span class="card-value">{$toUSCurrency(data.summary.averageAmount)}</span>
		</div>
	</section>

	<!-- AI Query Section -->
	<section class="ai-section">
		<div class="ai-header">
			<div class="ai-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
					/>
				</svg>
			</div>
			<div>
				<h2>{$_('ai.ask_about_invoices')}</h2>
				<p>{$_('ai.ask_description')}</p>
			</div>
		</div>

		<!-- Quick Query Buttons -->
		<div class="quick-queries">
			{#each prebuiltQueries as pq}
				<button
					type="button"
					class="quick-query-btn"
					onclick={() => handlePrebuiltQuery(pq.query)}
					disabled={isLoading}
				>
					{$_(`ai.query_${pq.key}`)}
				</button>
			{/each}
		</div>

		<!-- Custom Query Input -->
		<div class="query-input-area">
			<input
				type="text"
				bind:value={query}
				placeholder={$_('ai.query_placeholder')}
				onkeydown={handleKeydown}
				disabled={isLoading}
				class="query-input"
			/>
			<button
				type="button"
				class="query-submit-btn"
				onclick={handleSubmit}
				disabled={isLoading || !query.trim()}
			>
				{#if isLoading}
					<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<circle cx="12" cy="12" r="9" stroke-width="2" stroke-dasharray="45 15" />
					</svg>
					{$_('ai.analyzing')}
				{:else}
					<svg viewBox="0 0 20 20" fill="currentColor">
						<path
							fill-rule="evenodd"
							d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
							clip-rule="evenodd"
						/>
					</svg>
					{$_('ai.ask_button')}
				{/if}
			</button>
		</div>

		<!-- Error Display -->
		{#if error}
			<div class="error-message">
				<svg viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
						clip-rule="evenodd"
					/>
				</svg>
				<span>{error}</span>
			</div>
		{/if}

		<!-- Analysis Result -->
		{#if analysisResult}
			<div class="analysis-result">
				<div class="result-header">
					<h3>{$_('ai.analysis_result')}</h3>
					<button type="button" class="clear-btn" onclick={clearResult} aria-label="Clear result">
						<svg viewBox="0 0 20 20" fill="currentColor">
							<path
								d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
							/>
						</svg>
					</button>
				</div>
				<div class="result-content">
					<p>{analysisResult}</p>
				</div>
			</div>
		{/if}
	</section>

	<!-- Top Clients Section -->
	{#if data.summary.topClients.length > 0}
		<section class="data-section">
			<h2>{$_('ai.top_clients_title')}</h2>
			<div class="clients-list">
				{#each data.summary.topClients as client, i}
					<div class="client-item">
						<span class="client-rank">#{i + 1}</span>
						<div class="client-info">
							<span class="client-name">{client.name}</span>
							<span class="client-count">{client.count} {$_('ai.invoices')}</span>
						</div>
						<span class="client-total">{$toUSCurrency(client.total)}</span>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Monthly Breakdown Section -->
	{#if data.summary.monthlyBreakdown.length > 0}
		<section class="data-section">
			<h2>{$_('ai.monthly_breakdown_title')}</h2>
			<div class="monthly-list">
				{#each data.summary.monthlyBreakdown as month}
					<div class="month-item">
						<span class="month-label">{month.month}</span>
						<div class="month-bar">
							<div
								class="month-fill"
								style="width: {(month.total / Math.max(...data.summary.monthlyBreakdown.map((m) => m.total))) * 100}%"
							></div>
						</div>
						<span class="month-total">{$toUSCurrency(month.total)}</span>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>

<style>
	.analytics-page {
		max-width: 1000px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	.header-content h1 {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 0.25rem 0;
	}

	.page-description {
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
		margin: 0;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		font-size: 0.875rem;
		text-decoration: none;
		transition: all 0.2s;
	}

	.back-link:hover {
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
	}

	.back-link svg {
		width: 1rem;
		height: 1rem;
	}

	/* Summary Cards */
	.summary-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.summary-card {
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		padding: 1rem 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.card-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.card-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.card-value.success {
		color: #10b981;
	}

	.card-value.warning {
		color: #f59e0b;
	}

	/* AI Section */
	.ai-section {
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.ai-header {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}

	.ai-icon {
		width: 2.5rem;
		height: 2.5rem;
		background: linear-gradient(135deg, #8b5cf6, #6366f1);
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.ai-icon svg {
		width: 1.25rem;
		height: 1.25rem;
		color: white;
	}

	.ai-header h2 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.25rem 0;
	}

	.ai-header p {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		margin: 0;
	}

	/* Quick Queries */
	.quick-queries {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.quick-query-btn {
		padding: 0.5rem 1rem;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-pill);
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.2s;
	}

	.quick-query-btn:hover:not(:disabled) {
		border-color: #8b5cf6;
		color: #8b5cf6;
	}

	.quick-query-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Query Input */
	.query-input-area {
		display: flex;
		gap: 0.75rem;
	}

	.query-input {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
		font-size: 0.9375rem;
		transition: border-color 0.2s;
	}

	.query-input:focus {
		outline: none;
		border-color: #8b5cf6;
		box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
	}

	.query-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.query-submit-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		background: linear-gradient(135deg, #8b5cf6, #6366f1);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-weight: 500;
		font-size: 0.9375rem;
		cursor: pointer;
		transition: opacity 0.2s;
		white-space: nowrap;
	}

	.query-submit-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.query-submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.query-submit-btn svg {
		width: 1.125rem;
		height: 1.125rem;
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

	/* Error Message */
	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.75rem;
		padding: 0.75rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: var(--radius-md);
		color: #dc2626;
		font-size: 0.875rem;
	}

	:global(.dark) .error-message {
		background: rgba(220, 38, 38, 0.1);
		border-color: rgba(220, 38, 38, 0.3);
	}

	.error-message svg {
		width: 1.125rem;
		height: 1.125rem;
		flex-shrink: 0;
	}

	/* Analysis Result */
	.analysis-result {
		margin-top: 1rem;
		padding: 1rem;
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(99, 102, 241, 0.05));
		border: 1px solid #a5b4fc;
		border-radius: var(--radius-md);
	}

	.result-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.result-header h3 {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.clear-btn {
		padding: 0.25rem;
		background: transparent;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		border-radius: var(--radius-sm);
	}

	.clear-btn:hover {
		color: var(--color-text-primary);
		background: var(--color-bg-secondary);
	}

	.clear-btn svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.result-content p {
		font-size: 0.9375rem;
		color: var(--color-text-primary);
		line-height: 1.6;
		margin: 0;
		white-space: pre-wrap;
	}

	/* Data Sections */
	.data-section {
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.data-section h2 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 1rem 0;
	}

	/* Clients List */
	.clients-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.client-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: var(--color-bg-secondary);
		border-radius: var(--radius-md);
	}

	.client-rank {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--color-text-secondary);
		min-width: 2rem;
	}

	.client-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.client-name {
		font-size: 0.9375rem;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.client-count {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.client-total {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-text-primary);
		font-family: monospace;
	}

	/* Monthly List */
	.monthly-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.month-item {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.month-label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		min-width: 80px;
		font-family: monospace;
	}

	.month-bar {
		flex: 1;
		height: 1.5rem;
		background: var(--color-bg-secondary);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.month-fill {
		height: 100%;
		background: linear-gradient(90deg, #8b5cf6, #6366f1);
		border-radius: var(--radius-sm);
		transition: width 0.3s ease;
	}

	.month-total {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
		font-family: monospace;
		min-width: 100px;
		text-align: right;
	}

	@media (max-width: 768px) {
		.analytics-page {
			padding: 1rem;
		}

		.page-header {
			flex-direction: column;
		}

		.summary-cards {
			grid-template-columns: repeat(2, 1fr);
		}

		.query-input-area {
			flex-direction: column;
		}

		.query-submit-btn {
			justify-content: center;
		}
	}
</style>
