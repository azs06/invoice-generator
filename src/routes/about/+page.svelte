<script>
	import { _ } from 'svelte-i18n';
</script>

<svelte:head>
	<title>About - Free Invoice Generator | FreeInvoice.info</title>
	<meta
		name="description"
		content="Learn about FreeInvoice.info - a free, privacy-focused invoice generator for freelancers and small businesses. No signup required, completely open source."
	/>
</svelte:head>

<div class="about-page">
	<div class="content-container">
		<h1 class="page-title">About FreeInvoice.info</h1>

		<section class="intro-section">
			<p class="lead">
				FreeInvoice.info is a free, privacy-focused invoice generator designed for freelancers,
				small businesses, and contractors who need a simple way to create professional invoices
				without signing up for yet another service.
			</p>
		</section>

		<section class="section">
			<h2 class="section-title">Our Mission</h2>
			<p>
				We believe that creating invoices should be simple, free, and respect your privacy. No
				hidden fees, no premium tiers, no tracking. Just a straightforward tool that helps you get
				paid for your work.
			</p>
			<p>
				Too many invoice generators require accounts, upload your sensitive business data to their
				servers, and charge subscription fees. We wanted to create an alternative that puts you in
				control of your data while providing all the features you need.
			</p>
		</section>

		<section class="section">
			<h2 class="section-title">Why We Built This</h2>
			<div class="values-grid">
				<div class="value-card">
					<h3>Privacy First</h3>
					<p>
						Your invoice data never leaves your device. Everything is stored locally in your
						browser using IndexedDB. We don't have servers collecting your information, we don't
						track what you invoice for, and we don't know who your clients are.
					</p>
				</div>

				<div class="value-card">
					<h3>Truly Free</h3>
					<p>
						No hidden costs, no premium tiers, no feature limitations. All features are available
						to everyone at no charge. No credit card required, no trial period, no upsells.
					</p>
				</div>

				<div class="value-card">
					<h3>Open Source</h3>
					<p>
						Built transparently with modern web technologies (SvelteKit, Tailwind CSS). You can
						verify exactly what the code does, contribute improvements, or even run your own
						version.
					</p>
				</div>

				<div class="value-card">
					<h3>No Signup Required</h3>
					<p>
						Start creating invoices immediately. No email verification, no password to remember, no
						account to manage. Just visit the site and start working.
					</p>
				</div>
			</div>
		</section>

		<section class="section">
			<h2 class="section-title">Who Is This For?</h2>
			<div class="audience-grid">
				<div class="audience-card">
					<h3>Freelancers</h3>
					<p>
						Create professional invoices for your clients without the overhead of expensive
						invoicing software or monthly subscriptions.
					</p>
				</div>

				<div class="audience-card">
					<h3>Small Businesses</h3>
					<p>
						Perfect for small businesses and startups that need a simple invoicing solution without
						complex accounting features.
					</p>
				</div>

				<div class="audience-card">
					<h3>Contractors</h3>
					<p>
						Generate invoices on-the-go for your contracting work with a tool that works on any
						device, anywhere.
					</p>
				</div>

				<div class="audience-card">
					<h3>Consultants</h3>
					<p>
						Send professional invoices to your consulting clients with customizable templates and
						branding options.
					</p>
				</div>
			</div>
		</section>

		<section class="section">
			<h2 class="section-title">Technology Stack</h2>
			<p>
				FreeInvoice.info is built with modern web technologies to ensure fast performance,
				reliability, and a great user experience:
			</p>
			<ul class="tech-list">
				<li><strong>SvelteKit:</strong> Modern web framework for fast, reactive applications</li>
				<li><strong>Svelte 5:</strong> Latest version with improved reactivity and performance</li>
				<li><strong>IndexedDB:</strong> Client-side storage for your invoice data</li>
				<li><strong>html2pdf.js:</strong> High-quality PDF generation</li>
				<li>
					<strong>Multi-language Support:</strong> English and Bengali with easy extensibility
				</li>
			</ul>
		</section>

		<section class="contact-section">
			<h2 class="section-title">Get in Touch</h2>
			<p class="contact-intro">
				Have questions, suggestions, or found a bug? We'd love to hear from you!
			</p>

			<div class="contact-methods">
				<div class="contact-card">
					<div class="contact-icon">
						<svg
							viewBox="0 0 20 20"
							fill="currentColor"
							xmlns="http://www.w3.org/2000/svg"
							aria-hidden="true"
						>
							<path
								d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z"
							/>
							<path
								d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z"
							/>
						</svg>
					</div>
					<h3>Email</h3>
					<p class="contact-detail">
						<a href="mailto:atik.aiub@gmail.com" class="contact-link">atik.aiub@gmail.com</a>
					</p>
					<p class="contact-description">
						Send us an email for support, feedback, or general inquiries.
					</p>
				</div>

				<div class="contact-card">
					<div class="contact-icon">
						<svg
							viewBox="0 0 20 20"
							fill="currentColor"
							xmlns="http://www.w3.org/2000/svg"
							aria-hidden="true"
						>
							<path
								fill-rule="evenodd"
								d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 10 4.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 20 10.017C20 4.484 15.522 0 10 0Z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<h3>GitHub</h3>
					<p class="contact-detail">
						<a
							href="https://github.com/azs06"
							target="_blank"
							rel="noopener noreferrer"
							class="contact-link"
						>
							github.com/azs06
						</a>
					</p>
					<p class="contact-description">
						Report issues, request features, or contribute to the project on GitHub.
					</p>
				</div>
			</div>
		</section>

		<section class="cta-section">
			<h2>Ready to Create Your Invoice?</h2>
			<p>Start now - no signup required, completely free.</p>
			<a href="/" class="cta-button">Get Started</a>
		</section>
	</div>
</div>

<style>
	.about-page {
		max-width: 1000px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		min-height: 100vh;
	}

	.content-container {
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-lg);
		padding: 3rem;
		box-shadow: var(--shadow-soft);
	}

	.page-title {
		font-size: clamp(2rem, 5vw, 2.75rem);
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 2rem;
		text-align: center;
	}

	.intro-section {
		margin-bottom: 3rem;
		padding-bottom: 2rem;
		border-bottom: 2px solid var(--color-border-primary);
	}

	.lead {
		font-size: 1.25rem;
		line-height: 1.7;
		color: var(--color-text-secondary);
		margin: 0;
		text-align: center;
	}

	.section {
		margin-bottom: 3rem;
	}

	.section-title {
		font-size: 1.875rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 1.5rem;
	}

	.section p {
		font-size: 1rem;
		line-height: 1.7;
		color: var(--color-text-secondary);
		margin: 0 0 1rem;
	}

	.section p:last-child {
		margin-bottom: 0;
	}

	.values-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1.5rem;
		margin-top: 1.5rem;
	}

	.value-card {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		padding: 1.5rem;
		transition: all 0.2s ease;
	}

	.value-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.value-card h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.75rem;
	}

	.value-card p {
		font-size: 0.9375rem;
		line-height: 1.6;
		color: var(--color-text-secondary);
		margin: 0;
	}

	.audience-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1.5rem;
		margin-top: 1.5rem;
	}

	.audience-card {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		padding: 1.5rem;
		text-align: center;
		transition: all 0.2s ease;
	}

	.audience-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.audience-card h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.75rem;
	}

	.audience-card p {
		font-size: 0.9375rem;
		line-height: 1.6;
		color: var(--color-text-secondary);
		margin: 0;
	}

	.tech-list {
		list-style: none;
		padding: 0;
		margin: 1.5rem 0 0;
	}

	.tech-list li {
		padding: 0.75rem 0 0.75rem 2rem;
		position: relative;
		font-size: 1rem;
		line-height: 1.6;
		color: var(--color-text-secondary);
	}

	.tech-list li::before {
		content: '→';
		position: absolute;
		left: 0;
		color: var(--color-accent, #3b82f6);
		font-weight: 700;
	}

	/* Contact Section */
	.contact-section {
		margin-bottom: 3rem;
		padding: 2rem 0;
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(37, 99, 235, 0.02));
		border-radius: var(--radius-lg);
	}

	.contact-section .section-title {
		text-align: center;
	}

	.contact-intro {
		text-align: center;
		font-size: 1.0625rem;
		color: var(--color-text-secondary);
		margin: 0 0 2rem;
	}

	.contact-methods {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 2rem;
		padding: 0 2rem;
	}

	.contact-card {
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-lg);
		padding: 2rem;
		text-align: center;
		transition: all 0.3s ease;
	}

	.contact-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
	}

	.contact-icon {
		width: 3rem;
		height: 3rem;
		margin: 0 auto 1rem;
		color: var(--color-accent, #3b82f6);
	}

	.contact-icon svg {
		width: 100%;
		height: 100%;
	}

	.contact-card h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.75rem;
	}

	.contact-detail {
		font-size: 1rem;
		margin: 0 0 0.75rem;
	}

	.contact-link {
		color: var(--color-accent, #3b82f6);
		text-decoration: none;
		font-weight: 500;
		transition: color 0.2s ease;
	}

	.contact-link:hover {
		color: #2563eb;
		text-decoration: underline;
	}

	.contact-description {
		font-size: 0.9375rem;
		line-height: 1.6;
		color: var(--color-text-secondary);
		margin: 0;
	}

	/* CTA Section */
	.cta-section {
		text-align: center;
		padding: 3rem 0 1rem;
		margin-top: 3rem;
		border-top: 2px solid var(--color-border-primary);
	}

	.cta-section h2 {
		font-size: 1.875rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.75rem;
	}

	.cta-section p {
		font-size: 1.125rem;
		color: var(--color-text-secondary);
		margin: 0 0 2rem;
	}

	.cta-button {
		display: inline-block;
		padding: 0.875rem 2rem;
		background-color: var(--color-accent, #3b82f6);
		color: white;
		text-decoration: none;
		border-radius: var(--radius-pill);
		font-weight: 600;
		font-size: 1.0625rem;
		transition: all 0.2s ease;
		box-shadow: var(--shadow-soft);
	}

	.cta-button:hover {
		background-color: #2563eb;
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(37, 99, 235, 0.3);
	}

	/* Mobile Responsive */
	@media (max-width: 768px) {
		.about-page {
			padding: 1rem;
		}

		.content-container {
			padding: 2rem 1.5rem;
		}

		.page-title {
			margin-bottom: 1.5rem;
		}

		.intro-section {
			margin-bottom: 2rem;
			padding-bottom: 1.5rem;
		}

		.lead {
			font-size: 1.125rem;
		}

		.section {
			margin-bottom: 2rem;
		}

		.section-title {
			font-size: 1.5rem;
		}

		.values-grid,
		.audience-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.contact-methods {
			grid-template-columns: 1fr;
			gap: 1.5rem;
			padding: 0 1rem;
		}

		.cta-section {
			padding: 2rem 0 0.5rem;
			margin-top: 2rem;
		}
	}
</style>
