<script lang="ts">
	import { _, locale } from 'svelte-i18n';
	import { currencies, type CurrencyCode } from '$lib/stores/currency';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const activeLocale = $derived($locale || 'en');

	/** Locale for a given currency code, falling back to the UI locale. */
	function localeFor(code: string): string {
		return currencies[code as CurrencyCode]?.locale || activeLocale;
	}

	function formatMoney(amount: number, code: string): string {
		try {
			return new Intl.NumberFormat(localeFor(code), {
				style: 'currency',
				currency: code,
				currencyDisplay: 'symbol',
				maximumFractionDigits: 2
			}).format(amount);
		} catch {
			const symbol = currencies[code as CurrencyCode]?.symbol ?? '';
			return `${symbol}${amount.toFixed(2)}`;
		}
	}

	function monthLabel(year: number, month: number): string {
		try {
			return new Intl.DateTimeFormat(activeLocale, { month: 'short' }).format(
				new Date(Date.UTC(year, month, 1))
			);
		} catch {
			return String(month + 1);
		}
	}
</script>

<svelte:head>
	<title>{$_('reports.title')} | FreeInvoice</title>
</svelte:head>

<div class="reports-page app-page">
	<div class="reports-container">
		<header class="reports-header">
			<p class="kicker">{$_('reports.kicker')}</p>
			<h1>{$_('reports.title')}</h1>
			<p class="subtitle">{$_('reports.subtitle')}</p>
		</header>

		{#if !data.hasData}
			<div class="empty-state">
				<div class="empty-icon" aria-hidden="true">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M3 3v18h18M8 15v3M13 10v8M18 6v12"
						/>
					</svg>
				</div>
				<h2>{$_('reports.empty_title')}</h2>
				<p>{$_('reports.empty_description')}</p>
			</div>
		{:else}
			{#each data.reports as report (report.code)}
				{@const maxMonthly = Math.max(0, ...report.monthly.map((m) => m.total))}
				<div class="currency-block">
					{#if data.reports.length > 1}
						<div class="currency-heading">
							<span class="currency-badge">{report.symbol}</span>
							<span class="currency-code">{report.code}</span>
						</div>
					{/if}

					<section class="report-section">
						<div class="section-header">
							<div class="section-heading">
								<h2>{$_('reports.revenue_title')}</h2>
								<p class="section-description">{$_('reports.revenue_description')}</p>
							</div>
							<div class="section-metric">
								<span class="metric-label">{$_('reports.revenue_total')}</span>
								<span class="metric-value">{formatMoney(report.revenueTotal, report.code)}</span>
							</div>
						</div>

						{#if maxMonthly <= 0}
							<p class="section-empty">{$_('reports.no_revenue')}</p>
						{:else}
							<div class="chart" role="img" aria-label={$_('reports.revenue_description')}>
								{#each report.monthly as bucket (bucket.key)}
									<div class="chart-col">
										<div class="chart-bar-track">
											<div
												class="chart-bar"
												style:height={`${maxMonthly > 0 ? (bucket.total / maxMonthly) * 100 : 0}%`}
												title={formatMoney(bucket.total, report.code)}
											></div>
										</div>
										<span class="chart-label">{monthLabel(bucket.year, bucket.month)}</span>
									</div>
								{/each}
							</div>
						{/if}
					</section>

					<section class="report-section">
						<div class="section-header">
							<div class="section-heading">
								<h2>{$_('reports.outstanding_title')}</h2>
								<p class="section-description">{$_('reports.outstanding_description')}</p>
							</div>
							<div class="section-metric">
								<span class="metric-label">{$_('reports.outstanding_total')}</span>
								<span class="metric-value">
									{formatMoney(report.outstanding.total, report.code)}
								</span>
							</div>
						</div>

						{#if report.outstanding.count === 0}
							<p class="section-empty">{$_('reports.no_outstanding')}</p>
						{:else}
							<div class="stat-grid">
								<div class="stat-card">
									<span class="stat-title">{$_('reports.not_due')}</span>
									<span class="stat-value">
										{formatMoney(report.outstanding.notDue, report.code)}
									</span>
									<span class="stat-sub">
										{$_('reports.invoices_count', {
											values: { count: report.outstanding.notDueCount }
										})}
									</span>
								</div>
								<div class="stat-card overdue">
									<span class="stat-title">{$_('reports.overdue')}</span>
									<span class="stat-value">
										{formatMoney(report.outstanding.overdue, report.code)}
									</span>
									<span class="stat-sub">
										{$_('reports.invoices_count', {
											values: { count: report.outstanding.overdueCount }
										})}
									</span>
								</div>
							</div>
						{/if}
					</section>

					<section class="report-section">
						<div class="section-header">
							<div class="section-heading">
								<h2>{$_('reports.clients_title')}</h2>
								<p class="section-description">{$_('reports.clients_description')}</p>
							</div>
						</div>

						{#if report.clients.length === 0}
							<p class="section-empty">{$_('reports.no_clients')}</p>
						{:else}
							<div class="table-scroll">
								<table class="clients-table">
									<thead>
										<tr>
											<th>{$_('reports.client_col')}</th>
											<th class="num">{$_('reports.paid_col')}</th>
											<th class="num">{$_('reports.outstanding_col')}</th>
										</tr>
									</thead>
									<tbody>
										{#each report.clients as client (client.name)}
											<tr>
												<td class="client-name">{client.name}</td>
												<td class="num">{formatMoney(client.paid, report.code)}</td>
												<td class="num">{formatMoney(client.outstanding, report.code)}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
					</section>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.reports-page {
		background:
			radial-gradient(
				circle at top right,
				color-mix(in srgb, var(--color-accent-blue) 14%, transparent),
				transparent 42%
			),
			var(--surface-paper);
		padding: clamp(1rem, 2vw, 1.75rem) clamp(0.75rem, 1.8vw, 1.5rem);
	}

	.reports-container {
		width: min(960px, 100%);
		margin: 0 auto;
	}

	.reports-header {
		margin-bottom: clamp(1.25rem, 1.8vw, 2rem);
	}

	.kicker {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-accent-blue);
		margin: 0 0 0.5rem 0;
	}

	.reports-header h1 {
		font-size: clamp(1.8rem, 2.6vw, 2.3rem);
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 0.35rem 0;
	}

	.subtitle {
		font-size: 1.05rem;
		color: var(--color-text-secondary);
		margin: 0;
	}

	.empty-state {
		text-align: center;
		padding: clamp(2rem, 6vw, 4rem) 1.5rem;
		background: linear-gradient(180deg, var(--surface-paper) 0%, var(--surface-paper-muted) 100%);
		border: 1px solid var(--surface-paper-border);
		border-radius: calc(var(--radius-lg) + 0.4rem);
	}

	.empty-icon {
		width: 3rem;
		height: 3rem;
		margin: 0 auto 1rem;
		color: var(--color-accent-blue);
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--color-accent-blue) 12%, transparent);
	}

	.empty-icon svg {
		width: 1.5rem;
		height: 1.5rem;
	}

	.empty-state h2 {
		font-size: 1.2rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 0.4rem 0;
	}

	.empty-state p {
		font-size: 0.95rem;
		color: var(--color-text-secondary);
		margin: 0 auto;
		max-width: 34rem;
		line-height: 1.5;
	}

	.currency-block {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1.75rem;
	}

	.currency-heading {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.currency-badge {
		width: 2rem;
		height: 2rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		font-weight: 700;
		background: color-mix(in srgb, var(--color-accent-blue) 12%, transparent);
		color: var(--color-accent-blue);
	}

	.currency-code {
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: var(--color-text-primary);
	}

	.report-section {
		background: linear-gradient(180deg, var(--surface-paper) 0%, var(--surface-paper-muted) 100%);
		border: 1px solid var(--surface-paper-border);
		border-radius: calc(var(--radius-lg) + 0.4rem);
		padding: clamp(1.1rem, 2vw, 1.5rem);
	}

	.section-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}

	.section-heading h2 {
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 0.3rem 0;
	}

	.section-description {
		font-size: 0.9rem;
		color: var(--color-text-secondary);
		margin: 0;
		line-height: 1.5;
	}

	.section-metric {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.15rem;
		text-align: right;
	}

	.metric-label {
		font-size: 0.72rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-secondary);
	}

	.metric-value {
		font-size: 1.35rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.section-empty {
		font-size: 0.9rem;
		color: var(--color-text-secondary);
		margin: 0;
	}

	.chart {
		display: flex;
		align-items: flex-end;
		gap: clamp(0.2rem, 1.2vw, 0.6rem);
		height: 180px;
		padding-top: 0.5rem;
	}

	.chart-col {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		min-width: 0;
		height: 100%;
	}

	.chart-bar-track {
		flex: 1;
		width: 100%;
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}

	.chart-bar {
		width: 100%;
		max-width: 2.2rem;
		min-height: 2px;
		border-radius: 0.35rem 0.35rem 0 0;
		background: linear-gradient(
			180deg,
			var(--color-accent-blue) 0%,
			color-mix(in srgb, var(--color-accent-blue) 70%, transparent) 100%
		);
		transition: filter 0.15s ease;
	}

	.chart-bar:hover {
		filter: brightness(1.08);
	}

	.chart-label {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		white-space: nowrap;
	}

	.stat-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.85rem;
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1rem 1.1rem;
		border: 1px solid var(--surface-paper-border);
		border-radius: var(--radius-md);
		background: var(--surface-paper);
	}

	.stat-card.overdue {
		border-color: color-mix(in srgb, #ef4444 40%, var(--surface-paper-border));
		background: color-mix(in srgb, #ef4444 6%, var(--surface-paper));
	}

	.stat-title {
		font-size: 0.78rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-secondary);
	}

	.stat-card.overdue .stat-title {
		color: #ef4444;
	}

	.stat-value {
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}

	.stat-sub {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}

	.table-scroll {
		overflow-x: auto;
	}

	.clients-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.9rem;
	}

	.clients-table th,
	.clients-table td {
		padding: 0.6rem 0.75rem;
		text-align: left;
		border-bottom: 1px solid var(--surface-paper-border);
	}

	.clients-table th {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-secondary);
	}

	.clients-table th.num,
	.clients-table td.num {
		text-align: right;
		white-space: nowrap;
	}

	.clients-table tbody tr:last-child td {
		border-bottom: none;
	}

	.client-name {
		font-weight: 600;
		color: var(--color-text-primary);
	}

	@media (max-width: 640px) {
		.section-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.section-metric {
			align-items: flex-start;
			text-align: left;
		}

		.stat-grid {
			grid-template-columns: 1fr;
		}

		.chart {
			height: 140px;
		}
	}
</style>
