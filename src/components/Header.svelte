<script>
	import { _ } from 'svelte-i18n';
	import ThemeToggle from './ThemeToggle.svelte';
	import LanguageSelector from './LanguageSelector.svelte';
	import CurrencySelector from './CurrencySelector.svelte';
</script>

<header class="app-header">
	<div class="header-content">
		<div class="brand-group">
			<a href="/" class="brand-link">
				<span class="brand-text">{$_('app.title')}</span>
			</a>

			<nav class="nav-links">
				<a href="/saved-invoices" class="nav-link">{$_('nav.saved_invoices')}</a>
			</nav>
		</div>

		<div class="controls">
			<CurrencySelector />
			<LanguageSelector />
			<ThemeToggle />
		</div>
	</div>
</header>

<style>
	.app-header {
		width: 100%;
		background: var(--color-bg-primary);
		border-bottom: 1px solid var(--color-border-secondary);
		padding: 1rem 1.5rem;
		position: sticky;
		top: 0;
		z-index: 20;
	}

	.header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 1.5em;
	}

	.brand-group {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.brand-link {
		display: inline-flex;
		align-items: center;
		gap: 0.65rem;
		text-decoration: none;
		transition: opacity 0.2s ease;
	}

	.brand-link:hover {
		opacity: 0.85;
	}

	.brand-text {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text-primary);
		letter-spacing: -0.02em;
	}

	.nav-links {
		display: none;
		align-items: center;
		gap: 1rem;
	}

	.nav-link {
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		text-decoration: none;
		padding: 0.4rem 0.65rem;
		border-radius: var(--radius-pill);
		transition: color 0.2s ease, background 0.2s ease;
	}

	.nav-link:hover,
	.nav-link:focus-visible {
		background: rgba(59, 130, 246, 0.12);
		color: var(--color-accent-blue);
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	@media (max-width: 1024px) {
		.header-content {
			padding-inline: 0.5rem;
		}
	}

	@media (min-width: 768px) {
		.nav-links {
			display: inline-flex;
		}
	}
</style>
