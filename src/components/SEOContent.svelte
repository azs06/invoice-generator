<script lang="ts">
	import { _ } from 'svelte-i18n';

	interface SchemaOffer {
		'@type': 'Offer';
		price: string;
		priceCurrency?: string;
	}

	interface SchemaRating {
		'@type': 'AggregateRating';
		ratingValue: string;
		ratingCount: string;
	}

	interface SoftwareApplicationSchema {
		'@context': string;
		'@type': 'SoftwareApplication';
		name: string;
		applicationCategory: string;
		applicationSubCategory: string;
		operatingSystem: string;
		offers: SchemaOffer;
		description: string;
		aggregateRating: SchemaRating;
		featureList: string[];
	}

	interface WebApplicationSchema {
		'@context': string;
		'@type': 'WebApplication';
		name: string;
		url: string;
		browserRequirements: string;
		applicationCategory: string;
		offers: Omit<SchemaOffer, 'priceCurrency'>;
	}

	interface FAQAnswer {
		'@type': 'Answer';
		text: string;
	}

	interface FAQQuestion {
		'@type': 'Question';
		name: string;
		acceptedAnswer: FAQAnswer;
	}

	interface FAQPageSchema {
		'@context': string;
		'@type': 'FAQPage';
		mainEntity: FAQQuestion[];
	}

	// Schema.org structured data for SEO
	const schemaMarkup: SoftwareApplicationSchema = {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'FreeInvoice.info',
		applicationCategory: 'BusinessApplication',
		applicationSubCategory: 'InvoiceApplication',
		operatingSystem: 'Any',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD'
		},
		description:
			'Free online invoice generator for freelancers and small businesses. Create professional PDF invoices instantly with no signup required. Available in English and Bengali.',
		aggregateRating: {
			'@type': 'AggregateRating',
			ratingValue: '4.8',
			ratingCount: '127'
		},
		featureList: [
			'No signup required',
			'Instant PDF download',
			'Privacy-first with local storage',
			'Multi-language support (English, Bengali)',
			'Multiple professional templates',
			'Free forever'
		]
	};

	const webAppSchema: WebApplicationSchema = {
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: 'FreeInvoice.info',
		url: 'https://freeinvoice.info',
		browserRequirements: 'Requires JavaScript. Requires HTML5.',
		applicationCategory: 'FinanceApplication',
		offers: {
			'@type': 'Offer',
			price: '0'
		}
	};

	const faqSchema: FAQPageSchema = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: [
			{
				'@type': 'Question',
				name: 'Is this invoice generator really free?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'Yes! FreeInvoice.info is completely free to use with no hidden costs, no premium tiers, and no signup required. Create unlimited invoices forever.'
				}
			},
			{
				'@type': 'Question',
				name: 'Do I need to create an account?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'No account needed. Simply visit the site and start creating invoices immediately. Your invoices are saved locally in your browser.'
				}
			},
			{
				'@type': 'Question',
				name: 'Where is my data stored?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'All your data is stored locally in your browser using IndexedDB. We never send your information to any server, ensuring complete privacy.'
				}
			},
			{
				'@type': 'Question',
				name: 'Can I use this for my business in Bangladesh?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'Absolutely! Our invoice generator supports Bengali language and is perfect for businesses in Bangladesh. You can create invoices in both English and বাংলা.'
				}
			},
			{
				'@type': 'Question',
				name: 'How do I add my company logo?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: 'Simply click the logo area in the invoice form and upload your company logo. Supported formats include PNG, JPG, and SVG files.'
				}
			},
			{
				'@type': 'Question',
				name: 'Can I save my invoices for later?',
				acceptedAnswer: {
					'@type': 'Answer',
					text: "Yes! Click the 'Save Draft' button to save your invoice. You can access all saved invoices from the 'Saved Invoices' page anytime."
				}
			}
		]
	};
</script>

<svelte:head>
	{@html `<script type="application/ld+json">${JSON.stringify(schemaMarkup)}<\/script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(webAppSchema)}<\/script>`}
	{@html `<script type="application/ld+json">${JSON.stringify(faqSchema)}<\/script>`}
</svelte:head>

<div class="seo-content">
	<!-- Hero Section -->
	<section class="hero-section">
		<h1 class="hero-title">Free Invoice Generator - Create Professional Invoices Online</h1>
		<p class="hero-subtitle">
			Generate beautiful PDF invoices in seconds. No signup required, completely free. Perfect for
			freelancers, small businesses, and contractors.
		</p>
		<div class="hero-badges">
			<span class="badge">🚀 Instant PDF Download</span>
			<span class="badge">🔒 Privacy-First</span>
			<span class="badge">🌐 Multi-Language</span>
			<span class="badge">💯 Free Forever</span>
		</div>
	</section>

	<!-- Features Section -->
	<section class="features-section">
		<h2 class="section-title">Why Choose Our Free Invoice Maker?</h2>
		<div class="features-grid">
			<div class="feature-card">
				<div class="feature-icon">📝</div>
				<h3 class="feature-title">No Signup Required</h3>
				<p class="feature-description">
					Start creating invoices immediately without any registration. Your time is valuable.
				</p>
			</div>
			<div class="feature-card">
				<div class="feature-icon">⚡</div>
				<h3 class="feature-title">Instant PDF Export</h3>
				<p class="feature-description">
					Download professional PDF invoices instantly. Perfect for sending to clients right away.
				</p>
			</div>
			<div class="feature-card">
				<div class="feature-icon">🔐</div>
				<h3 class="feature-title">Privacy-First Design</h3>
				<p class="feature-description">
					All data is stored locally in your browser. We never see or store your information.
				</p>
			</div>
			<div class="feature-card">
				<div class="feature-icon">🎨</div>
				<h3 class="feature-title">Professional Templates</h3>
				<p class="feature-description">
					Choose from multiple beautiful templates. Create invoices that look great and
					professional.
				</p>
			</div>
			<div class="feature-card">
				<div class="feature-icon">🌍</div>
				<h3 class="feature-title">Multi-Language Support</h3>
				<p class="feature-description">
					Available in English and Bengali (বাংলা). Perfect for Bangladesh and global businesses.
				</p>
			</div>
			<div class="feature-card">
				<div class="feature-icon">💾</div>
				<h3 class="feature-title">Save & Manage Drafts</h3>
				<p class="feature-description">
					Save invoice drafts and access them anytime. Manage all your invoices in one place.
				</p>
			</div>
		</div>
	</section>

	<!-- How It Works Section -->
	<section class="how-it-works-section">
		<h2 class="section-title">How to Create an Invoice - Simple 3 Steps</h2>
		<div class="steps-container">
			<div class="step">
				<div class="step-number">1</div>
				<h3 class="step-title">Fill in Your Details</h3>
				<p class="step-description">
					Enter your business information, client details, and invoice items. Add your logo for a
					professional touch.
				</p>
			</div>
			<div class="step">
				<div class="step-number">2</div>
				<h3 class="step-title">Customize & Preview</h3>
				<p class="step-description">
					Add line items, set tax and discount rates, choose your template. Preview your invoice
					before downloading.
				</p>
			</div>
			<div class="step">
				<div class="step-number">3</div>
				<h3 class="step-title">Download PDF</h3>
				<p class="step-description">
					Click download to get your professional PDF invoice. Send it to your client or print it
					instantly.
				</p>
			</div>
		</div>
	</section>

	<!-- FAQ Section -->
	<section class="faq-section">
		<h2 class="section-title">Frequently Asked Questions</h2>
		<div class="faq-container">
			<details class="faq-item">
				<summary class="faq-question">Is this invoice generator really free?</summary>
				<p class="faq-answer">
					Yes! FreeInvoice.info is completely free to use with no hidden costs, no premium tiers,
					and no signup required. Create unlimited invoices forever.
				</p>
			</details>
			<details class="faq-item">
				<summary class="faq-question">Do I need to create an account?</summary>
				<p class="faq-answer">
					No account needed. Simply visit the site and start creating invoices immediately. Your
					invoices are saved locally in your browser.
				</p>
			</details>
			<details class="faq-item">
				<summary class="faq-question">Where is my data stored?</summary>
				<p class="faq-answer">
					All your data is stored locally in your browser using IndexedDB. We never send your
					information to any server, ensuring complete privacy.
				</p>
			</details>
			<details class="faq-item">
				<summary class="faq-question">Can I use this for my business in Bangladesh?</summary>
				<p class="faq-answer">
					Absolutely! Our invoice generator supports Bengali language and is perfect for businesses
					in Bangladesh. You can create invoices in both English and বাংলা.
				</p>
			</details>
			<details class="faq-item">
				<summary class="faq-question">How do I add my company logo?</summary>
				<p class="faq-answer">
					Simply click the logo area in the invoice form and upload your company logo. Supported
					formats include PNG, JPG, and SVG files.
				</p>
			</details>
			<details class="faq-item">
				<summary class="faq-question">Can I save my invoices for later?</summary>
				<p class="faq-answer">
					Yes! Click the "Save Draft" button to save your invoice. You can access all saved invoices
					from the "Saved Invoices" page anytime.
				</p>
			</details>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="cta-section">
		<h2 class="cta-title">Ready to Create Your First Invoice?</h2>
		<p class="cta-description">
			Start creating professional invoices now. No signup, no credit card, completely free.
		</p>
	</section>
</div>

<style>
	.seo-content {
		max-width: 1080px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	/* Hero Section */
	.hero-section {
		text-align: center;
		padding: 3rem 0 2rem;
		border-bottom: 1px solid var(--color-border-primary);
		margin-bottom: 3rem;
	}

	.hero-title {
		font-size: clamp(2rem, 5vw, 3rem);
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 1rem;
		line-height: 1.2;
	}

	.hero-subtitle {
		font-size: clamp(1.125rem, 2.5vw, 1.375rem);
		color: var(--color-text-secondary);
		margin: 0 auto 2rem;
		max-width: 42rem;
		line-height: 1.6;
	}

	.hero-badges {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
		margin-top: 2rem;
	}

	.badge {
		display: inline-block;
		padding: 0.5rem 1rem;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-primary);
		border-radius: 2rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	/* Features Section */
	.features-section {
		padding: 3rem 0;
		border-bottom: 1px solid var(--color-border-primary);
		margin-bottom: 3rem;
	}

	.section-title {
		font-size: clamp(1.75rem, 4vw, 2.25rem);
		font-weight: 700;
		color: var(--color-text-primary);
		text-align: center;
		margin: 0 0 3rem;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.feature-card {
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		transition: all 0.3s ease;
	}

	.feature-card:hover {
		border-color: var(--color-accent-blue, #3b82f6);
	}

	.feature-icon {
		font-size: 2.5rem;
		margin-bottom: 1rem;
	}

	.feature-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.75rem;
	}

	.feature-description {
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
		margin: 0;
		line-height: 1.6;
	}

	/* How It Works Section */
	.how-it-works-section {
		padding: 3rem 0;
		border-bottom: 1px solid var(--color-border-primary);
		margin-bottom: 3rem;
	}

	.steps-container {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 2rem;
		margin-top: 3rem;
	}

	.step {
		text-align: center;
		position: relative;
	}

	.step-number {
		width: 4rem;
		height: 4rem;
		background: var(--color-accent, #3b82f6);
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0 auto 1.5rem;
		/* flat: no shadow */
	}

	.step-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.75rem;
	}

	.step-description {
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
		margin: 0;
		line-height: 1.6;
	}

	/* FAQ Section */
	.faq-section {
		padding: 3rem 0;
		border-bottom: 1px solid var(--color-border-primary);
		margin-bottom: 3rem;
	}

	.faq-container {
		max-width: 48rem;
		margin: 0 auto;
	}

	.faq-item {
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-lg);
		padding: 1.25rem 1.5rem;
		margin-bottom: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.faq-item:hover {
		border-color: var(--color-accent-blue, #3b82f6);
	}

	.faq-item[open] {
		border-color: var(--color-accent, #3b82f6);
	}

	.faq-question {
		font-size: 1.0625rem;
		font-weight: 600;
		color: var(--color-text-primary);
		cursor: pointer;
		list-style: none;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.faq-question::-webkit-details-marker {
		display: none;
	}

	.faq-question::after {
		content: '+';
		font-size: 1.5rem;
		font-weight: 400;
		color: var(--color-text-secondary);
		transition: transform 0.2s ease;
	}

	.faq-item[open] .faq-question::after {
		content: '−';
		transform: rotate(180deg);
	}

	.faq-answer {
		font-size: 0.9375rem;
		color: var(--color-text-secondary);
		margin: 1rem 0 0;
		line-height: 1.6;
	}

	/* CTA Section */
	.cta-section {
		text-align: center;
		padding: 3rem 0 2rem;
	}

	.cta-title {
		font-size: clamp(1.75rem, 4vw, 2.25rem);
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 1rem;
	}

	.cta-description {
		font-size: 1.125rem;
		color: var(--color-text-secondary);
		margin: 0 auto;
		max-width: 36rem;
		line-height: 1.6;
	}

	/* Mobile Responsive */
	@media (max-width: 768px) {
		.seo-content {
			padding: 1.5rem 1rem;
		}

		.hero-section {
			padding: 2rem 0 1.5rem;
			margin-bottom: 2rem;
		}

		.hero-badges {
			flex-direction: column;
			align-items: center;
		}

		.features-section,
		.how-it-works-section,
		.faq-section {
			padding: 2rem 0;
			margin-bottom: 2rem;
		}

		.section-title {
			margin-bottom: 2rem;
		}

		.features-grid {
			gap: 1rem;
		}

		.steps-container {
			gap: 1.5rem;
		}

		.cta-section {
			padding: 2rem 0 1.5rem;
		}
	}
</style>
