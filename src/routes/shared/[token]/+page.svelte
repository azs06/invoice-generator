<script lang="ts">
	import InvoicePreviewComponent from '$components/InvoicePreviewComponent.svelte';
	import { _ } from 'svelte-i18n';
	import type { InvoiceData } from '$lib/types';

	let { data } = $props();
	let invoice = $state<InvoiceData | null>(data.invoice);

	$effect(() => {
		invoice = data.invoice;
	});

	/**
	 * A safe http(s) payment URL to render, or null.
	 * Only returns http:/https: URLs so javascript:, data:, etc. can never
	 * become a clickable link on this public page.
	 */
	const safePayUrl = $derived.by((): string | null => {
		const details = invoice?.paymentDetails;
		if (!details?.enabled || !details.payUrl) {
			return null;
		}
		try {
			const url = new URL(details.payUrl);
			if (url.protocol === 'http:' || url.protocol === 'https:') {
				return url.href;
			}
		} catch {
			return null;
		}
		return null;
	});

	const printInvoice = (): void => {
		if (typeof window !== 'undefined') {
			window.print();
		}
	};

	const downloadPDF = async (): Promise<void> => {
		if (typeof window === 'undefined' || !invoice) {
			return;
		}

		const previewElement = document.querySelector('.invoice-preview');
		if (!previewElement) {
			return;
		}

		try {
			const html2pdf = (await import('html2pdf.js')).default;

			await html2pdf()
				.from(previewElement)
				.set({
					margin: 0.5,
					filename: `invoice-${invoice.invoiceNumber || 'shared'}.pdf`,
					html2canvas: {
						scale: 3,
						useCORS: true
					},
					jsPDF: {
						unit: 'in',
						format: 'letter',
						orientation: 'portrait'
					}
				})
				.save();
		} catch (error) {
			console.error('Failed to download PDF:', error);
			alert('Failed to generate PDF. Please try again.');
		}
	};
</script>

<svelte:head>
	<title>Shared Invoice - {invoice?.invoiceNumber || 'View'} | FreeInvoice.info</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if invoice}
	<div class="shared-invoice-page">
		<header class="shared-header">
			<a href="/" class="brand-link"><span class="brand-text font-bold">FreeInvoice.info</span></a>
			<div class="actions">
				<button class="action-button" onclick={printInvoice} title="Print Invoice">
					<svg class="icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path d="M6 2a2 2 0 0 0-2 2v3h12V4a2 2 0 0 0-2-2H6Z" />
						<path
							fill-rule="evenodd"
							d="M4 8a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1v-3.5a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 15 12.5V16h1a3 3 0 0 0 3-3v-2a3 3 0 0 0-3-3H4Zm1.5 5.5V18a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2v-4.5a.5.5 0 0 0-.5-.5h-7a.5.5 0 0 0-.5.5Z"
							clip-rule="evenodd"
						/>
					</svg>
					<span>Print</span>
				</button>
				<button class="action-button primary" onclick={downloadPDF} title="Download PDF">
					<svg class="icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path
							d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614l-2.72-2.72a.75.75 0 0 0-1.06 1.061l4 4a.75.75 0 0 0 1.06 0l4-4a.75.75 0 0 0-1.06-1.06l-2.72 2.72V2.75Z"
						/>
						<path
							d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z"
						/>
					</svg>
					<span>Download PDF</span>
				</button>
			</div>
		</header>

		<main class="shared-content">
			{#if safePayUrl}
				<section class="pay-invoice" aria-label={$_('payment_details.pay_heading')}>
					<div class="pay-invoice-text">
						<h2 class="pay-invoice-heading">{$_('payment_details.pay_heading')}</h2>
						{#if invoice.paymentDetails?.instructions}
							<p class="pay-invoice-instructions">{invoice.paymentDetails.instructions}</p>
						{/if}
					</div>
					<a
						class="pay-invoice-button"
						href={safePayUrl}
						target="_blank"
						rel="noopener noreferrer nofollow"
					>
						{$_('payment_details.pay_button')}
					</a>
				</section>
			{/if}
			<InvoicePreviewComponent {invoice} />
		</main>

		{#if !data.hideBadge}
			<footer class="shared-footer">
				<p>
					This invoice was shared via <a href="/">FreeInvoice.info</a> - Create professional invoices
					for free.
				</p>
			</footer>
		{/if}
	</div>
{:else}
	<div class="error-page">
		<h1>Invoice Not Found</h1>
		<p>This shared invoice link is invalid, expired, or has been revoked.</p>
		<a href="/" class="home-link">Go to FreeInvoice.info</a>
	</div>
{/if}

<style>
	.shared-invoice-page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--color-bg-secondary, #f9fafb);
	}

	.shared-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 2rem;
		background: var(--color-bg-primary, #fff);
		border-bottom: 1px solid var(--color-border-primary, #e5e7eb);
	}

	.actions {
		display: flex;
		gap: 0.75rem;
	}

	.action-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-border-primary, #e5e7eb);
		border-radius: 0.5rem;
		background: var(--color-bg-primary, #fff);
		color: var(--color-text-primary, #111827);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.action-button:hover {
		background: var(--color-bg-secondary, #f9fafb);
		border-color: var(--color-text-secondary, #6b7280);
	}

	.action-button.primary {
		background: var(--color-accent-blue, #2563eb);
		color: white;
		border-color: var(--color-accent-blue, #2563eb);
	}

	.action-button.primary:hover {
		background: #1d4ed8;
		border-color: #1d4ed8;
	}

	.action-button .icon {
		width: 1rem;
		height: 1rem;
	}

	.shared-content {
		flex: 1;
		padding: 2rem;
		max-width: 900px;
		margin: 0 auto;
		width: 100%;
	}

	.pay-invoice {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 1rem;
		margin-bottom: 2rem;
		padding: 1.25rem 1.5rem;
		border: 1px solid var(--color-border-primary, #e5e7eb);
		border-radius: 0.75rem;
		background: var(--color-bg-primary, #fff);
		box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.06));
	}

	.pay-invoice-text {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
	}

	.pay-invoice-heading {
		margin: 0;
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--color-text-primary, #111827);
	}

	.pay-invoice-instructions {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--color-text-secondary, #6b7280);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.pay-invoice-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		background: var(--color-accent-blue, #2563eb);
		color: white;
		font-size: 0.95rem;
		font-weight: 600;
		text-decoration: none;
		transition: background 0.2s ease;
	}

	.pay-invoice-button:hover {
		background: #1d4ed8;
	}

	.shared-footer {
		text-align: center;
		padding: 1.5rem 2rem;
		background: var(--color-bg-primary, #fff);
		border-top: 1px solid var(--color-border-primary, #e5e7eb);
	}

	.shared-footer p {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-text-secondary, #6b7280);
	}

	.shared-footer a {
		color: var(--color-accent-blue, #2563eb);
		text-decoration: none;
		font-weight: 500;
	}

	.shared-footer a:hover {
		text-decoration: underline;
	}

	.error-page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 2rem;
		text-align: center;
	}

	.error-page h1 {
		font-size: 2rem;
		font-weight: 600;
		color: var(--color-text-primary, #111827);
	}

	.error-page p {
		font-size: 1rem;
		color: var(--color-text-secondary, #6b7280);
	}

	.home-link {
		display: inline-block;
		margin-top: 1rem;
		padding: 0.75rem 1.5rem;
		background: var(--color-accent-blue, #2563eb);
		color: white;
		text-decoration: none;
		border-radius: 0.5rem;
		font-weight: 500;
		transition: background 0.2s ease;
	}

	.home-link:hover {
		background: #1d4ed8;
	}

	@media (max-width: 768px) {
		.shared-header {
			padding: 1rem;
			flex-wrap: wrap;
			gap: 1rem;
		}

		.actions {
			width: 100%;
		}

		.action-button {
			flex: 1;
			justify-content: center;
		}

		.shared-content {
			padding: 1rem;
		}

		.pay-invoice-button {
			flex: 1;
			width: 100%;
		}
	}

	@media print {
		.shared-header,
		.shared-footer,
		.pay-invoice {
			display: none;
		}

		.shared-content {
			padding: 0;
			max-width: none;
		}

		.shared-invoice-page {
			background: white;
		}
	}
</style>
