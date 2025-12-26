<script lang="ts">
	import { _ } from 'svelte-i18n';
</script>

<svelte:head>
	<title>How It Works - Free Invoice Generator | FreeInvoice.info</title>
	<meta
		name="description"
		content="Learn how to create professional invoices in 3 simple steps with FreeInvoice.info. Free invoice generator with no signup required. Step-by-step guide for freelancers and businesses."
	/>
</svelte:head>

<div class="how-it-works-page">
	<div class="content-container">
		<h1 class="page-title">How to Create an Invoice</h1>
		<p class="page-subtitle">
			Create professional invoices in just 3 simple steps. No signup required, completely free.
		</p>

		<div class="steps-section">
			<!-- Step 1 -->
			<div class="step-card">
				<div class="step-header">
					<div class="step-number">1</div>
					<h2 class="step-title">Fill in Your Details</h2>
				</div>
				<div class="step-content">
					<p class="step-description">
						Start by entering your business information and client details. This forms the basic
						structure of your invoice.
					</p>
					<div class="step-details">
						<h3>What to include:</h3>
						<ul>
							<li>
								<strong>Your Business Info:</strong> Your name/company name, address, contact details
							</li>
							<li>
								<strong>Client Info:</strong> Client's name/company, address, contact information
							</li>
							<li>
								<strong>Invoice Details:</strong> Invoice number, date, and due date (automatically calculated
								as 30 days from invoice date)
							</li>
							<li>
								<strong>Company Logo:</strong> Upload your logo for a professional look (optional but
								recommended)
							</li>
						</ul>
					</div>
					<div class="tip-box">
						<strong>💡 Pro Tip:</strong> Upload your company logo to make your invoices look more professional
						and branded. Accepted formats: PNG, JPG, SVG.
					</div>
				</div>
			</div>

			<!-- Step 2 -->
			<div class="step-card">
				<div class="step-header">
					<div class="step-number">2</div>
					<h2 class="step-title">Add Line Items & Customize</h2>
				</div>
				<div class="step-content">
					<p class="step-description">
						Add the products or services you're billing for, along with pricing details. Customize
						with taxes, discounts, and shipping if needed.
					</p>
					<div class="step-details">
						<h3>For each line item, add:</h3>
						<ul>
							<li><strong>Item Name/Description:</strong> What you're charging for</li>
							<li><strong>Quantity:</strong> How many units</li>
							<li><strong>Unit Price:</strong> Price per unit</li>
							<li><strong>Amount:</strong> Automatically calculated (quantity × price)</li>
						</ul>
						<h3>Additional options:</h3>
						<ul>
							<li>
								<strong>Tax:</strong> Add tax as a percentage or flat amount (e.g., 15% VAT or $50 tax)
							</li>
							<li>
								<strong>Discount:</strong> Apply discount as percentage or flat amount (e.g., 10% off
								or $20 discount)
							</li>
							<li><strong>Shipping:</strong> Add shipping/delivery charges if applicable</li>
							<li>
								<strong>Amount Paid:</strong> Record partial payments to calculate the balance due
							</li>
						</ul>
					</div>
					<div class="tip-box">
						<strong>💡 Pro Tip:</strong> Add detailed descriptions for each line item to avoid confusion
						and make it clear what you're billing for.
					</div>
				</div>
			</div>

			<!-- Step 3 -->
			<div class="step-card">
				<div class="step-header">
					<div class="step-number">3</div>
					<h2 class="step-title">Preview & Download PDF</h2>
				</div>
				<div class="step-content">
					<p class="step-description">
						Switch to the Preview tab to see how your invoice looks. Choose a template, then
						download or print your professional PDF invoice.
					</p>
					<div class="step-details">
						<h3>Final steps:</h3>
						<ul>
							<li><strong>Select Template:</strong> Choose from multiple professional templates</li>
							<li>
								<strong>Preview Invoice:</strong> Review all details before downloading to ensure everything
								is correct
							</li>
							<li>
								<strong>Download PDF:</strong> Click the download button to get your invoice as a PDF
								file
							</li>
							<li>
								<strong>Or Print:</strong> Print directly from your browser if you need a hard copy
							</li>
							<li>
								<strong>Save Draft:</strong> Save your invoice as a draft to access it later or make
								edits
							</li>
						</ul>
					</div>
					<div class="tip-box">
						<strong>💡 Pro Tip:</strong> Save your invoice as a draft before downloading. This way you
						can easily access it later to create similar invoices or track your billing history.
					</div>
				</div>
			</div>
		</div>

		<!-- Additional Tips Section -->
		<section class="tips-section">
			<h2 class="section-title">Best Practices for Professional Invoices</h2>
			<div class="tips-grid">
				<div class="tip-card">
					<h3>✓ Be Clear & Specific</h3>
					<p>Provide detailed descriptions of services or products to avoid confusion.</p>
				</div>
				<div class="tip-card">
					<h3>✓ Set Clear Payment Terms</h3>
					<p>Specify payment due date, accepted payment methods, and any late payment penalties.</p>
				</div>
				<div class="tip-card">
					<h3>✓ Include All Contact Info</h3>
					<p>Make it easy for clients to reach you with questions about the invoice.</p>
				</div>
				<div class="tip-card">
					<h3>✓ Number Your Invoices</h3>
					<p>Use sequential invoice numbers for easier tracking and bookkeeping.</p>
				</div>
				<div class="tip-card">
					<h3>✓ Add Your Logo</h3>
					<p>Brand your invoices with your company logo for a professional appearance.</p>
				</div>
				<div class="tip-card">
					<h3>✓ Keep Records</h3>
					<p>Save all your invoices for tax purposes and financial tracking.</p>
				</div>
			</div>
		</section>

		<!-- CTA Section -->
		<section class="cta-section">
			<h2>Ready to Create Your Invoice?</h2>
			<p>Start generating professional invoices now - it's free and takes just minutes!</p>
			<a href="/app" class="cta-button">Create Invoice Now</a>
		</section>
	</div>
</div>

<style>
	.how-it-works-page {
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
		margin: 0 0 1rem;
		text-align: center;
	}

	.page-subtitle {
		font-size: 1.25rem;
		line-height: 1.6;
		color: var(--color-text-secondary);
		text-align: center;
		margin: 0 0 3rem;
	}

	.steps-section {
		margin-bottom: 3rem;
	}

	.step-card {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-lg);
		padding: 2rem;
		margin-bottom: 2rem;
		transition: all 0.3s ease;
	}

	.step-card:hover {
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
	}

	.step-header {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
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
		font-size: 2rem;
		font-weight: 700;
		flex-shrink: 0;
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
	}

	.step-title {
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0;
	}

	.step-content {
		padding-left: 5.5rem;
	}

	.step-description {
		font-size: 1.0625rem;
		line-height: 1.7;
		color: var(--color-text-secondary);
		margin: 0 0 1.5rem;
	}

	.step-details {
		margin-bottom: 1.5rem;
	}

	.step-details h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.75rem;
	}

	.step-details ul {
		list-style: none;
		padding: 0;
		margin: 0 0 1.25rem;
	}

	.step-details ul li {
		padding: 0.5rem 0 0.5rem 1.5rem;
		position: relative;
		font-size: 1rem;
		line-height: 1.6;
		color: var(--color-text-secondary);
	}

	.step-details ul li::before {
		content: '→';
		position: absolute;
		left: 0;
		color: var(--color-accent, #3b82f6);
		font-weight: 700;
	}

	.tip-box {
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05));
		border-left: 4px solid var(--color-accent, #3b82f6);
		padding: 1rem 1.25rem;
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		line-height: 1.6;
		color: var(--color-text-secondary);
	}

	.tips-section {
		padding: 2rem 0;
		margin-bottom: 2rem;
	}

	.section-title {
		font-size: 1.875rem;
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0 0 2rem;
		text-align: center;
	}

	.tips-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.tip-card {
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		padding: 1.5rem;
		transition: all 0.2s ease;
	}

	.tip-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.tip-card h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 0.75rem;
	}

	.tip-card p {
		font-size: 0.9375rem;
		line-height: 1.6;
		color: var(--color-text-secondary);
		margin: 0;
	}

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
		.how-it-works-page {
			padding: 1rem;
		}

		.content-container {
			padding: 2rem 1.5rem;
		}

		.page-title {
			margin-bottom: 0.75rem;
		}

		.page-subtitle {
			font-size: 1.125rem;
			margin-bottom: 2rem;
		}

		.step-card {
			padding: 1.5rem;
			margin-bottom: 1.5rem;
		}

		.step-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.step-number {
			width: 3rem;
			height: 3rem;
			font-size: 1.5rem;
		}

		.step-title {
			font-size: 1.5rem;
		}

		.step-content {
			padding-left: 0;
		}

		.tips-grid {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.cta-section {
			padding: 2rem 0 0.5rem;
			margin-top: 2rem;
		}
	}
</style>
