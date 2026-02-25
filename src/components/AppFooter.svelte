<footer class="app-footer">
	<div class="footer-content app-container">
		<nav class="footer-links" aria-label="Resources">
			<a href="/how-it-works" class="footer-link">How It Works</a>
			<a href="/features" class="footer-link">Features</a>
			<a href="/about" class="footer-link">About</a>
		</nav>
		<div class="footer-meta">
			<span>&copy; {new Date().getFullYear()} FreeInvoice.info</span>
			<a href="/">Create Invoice</a>
		</div>
	</div>
</footer>

<style>
	.app-footer {
		margin-top: 2rem;
		padding: 0.8rem 0 1.2rem;
		border-top: 1px solid var(--surface-paper-border);
		background: color-mix(in srgb, var(--surface-paper) 84%, transparent);
	}

	.footer-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.footer-links,
	.footer-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.footer-link,
	.footer-meta a,
	.footer-meta span {
		font-size: 0.76rem;
		font-weight: 500;
		color: var(--color-text-secondary);
		text-decoration: none;
	}

	.footer-link:hover,
	.footer-meta a:hover {
		color: var(--color-accent-blue);
	}
</style>
