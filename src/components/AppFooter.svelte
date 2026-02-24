<script lang="ts">
	import { _ } from 'svelte-i18n';
</script>

<footer class="app-footer">
	<div class="footer-content">
		<div class="footer-section">
			<h3 class="footer-title">Resources</h3>
			<nav class="footer-links">
				<a href="/how-it-works" class="footer-link">How It Works</a>
				<a href="/features" class="footer-link">Features</a>
				<a href="/about" class="footer-link">About</a>
			</nav>
		</div>

		<div class="footer-section">
			<h3 class="footer-title">Quick Links</h3>
			<nav class="footer-links">
				<a href="/" class="footer-link">Create Invoice</a>
				<a href="/saved-invoices" class="footer-link">Saved Invoices</a>
			</nav>
		</div>

		<div class="footer-copyright">
			<p>&copy; {new Date().getFullYear()} FreeInvoice.info. All rights reserved.</p>
		</div>
	</div>
</footer>

<style>
	.app-footer {
		width: 100%;
		background: var(--color-bg-secondary);
		border-top: 1px solid var(--color-border-secondary);
		padding: 2rem 0 1rem;
		margin-top: 3rem;
	}

	.footer-content {
		max-width: 1280px;
		margin: 0 auto;
		padding: 0 1.5rem;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 2rem;
	}

	.footer-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.footer-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.footer-links {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.footer-link {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.footer-link:hover {
		color: var(--color-accent, #3b82f6);
	}

	.footer-copyright {
		grid-column: 1 / -1;
		text-align: center;
		padding-top: 1.5rem;
		margin-top: 1.5rem;
		border-top: 1px solid var(--color-border-secondary);
	}

	.footer-copyright p {
		font-size: 0.8125rem;
		color: var(--color-text-secondary);
		margin: 0;
	}

	@media (max-width: 768px) {
		.app-footer {
			padding: 1.5rem 0 0.75rem;
			margin-top: 2rem;
		}

		.footer-content {
			grid-template-columns: 1fr;
			gap: 1.5rem;
			padding-inline: 0.75rem;
		}

		.footer-copyright {
			padding-top: 1rem;
			margin-top: 1rem;
		}
	}

	@media (max-width: 1024px) and (min-width: 769px) {
		.footer-content {
			padding-inline: 1rem;
		}
	}
</style>
