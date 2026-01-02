/**
 * Shared PDF generation utility
 * Extracts the PDF generation logic to be reusable across pages
 */

import type { InvoiceData } from '$lib/types';

export interface PageSettings {
	pageSize: 'a4' | 'letter' | 'legal' | 'a5';
	margins: { top: number; right: number; bottom: number; left: number };
}

export interface PdfGeneratorOptions {
	invoice: InvoiceData;
	previewElement: HTMLElement;
	pageSettings: PageSettings;
}

export interface PdfGeneratorResult {
	blob: Blob;
	storageStatus: 'saved' | 'local-only' | 'client-side';
}

/**
 * Wait for all images in the preview element to load
 */
export async function waitForPreviewImages(previewElement: HTMLElement): Promise<void> {
	const images = Array.from(previewElement.querySelectorAll('img'));

	if (images.length === 0) {
		return;
	}

	await Promise.all(
		images.map((img) => {
			if (img.complete) {
				return Promise.resolve();
			}
			return new Promise((resolve) => {
				img.onload = resolve;
				img.onerror = resolve;
			});
		})
	);
}

/**
 * Clone the preview element and convert all images to base64
 * Also removes UI elements that shouldn't appear in PDF
 */
async function cloneAndProcessPreview(previewElement: HTMLElement): Promise<HTMLElement> {
	const clone = previewElement.cloneNode(true) as HTMLElement;

	// Remove UI elements that shouldn't be in PDF (A4 badge, etc.)
	const indicator = clone.querySelector('.page-size-indicator');
	if (indicator) indicator.remove();

	// Convert images to base64 to ensure they render in the PDF
	const images = clone.querySelectorAll('img');
	for (const img of images) {
		if (img.src && !img.src.startsWith('data:')) {
			try {
				const response = await fetch(img.src);
				const blob = await response.blob();
				const base64 = await new Promise<string>((resolve) => {
					const reader = new FileReader();
					reader.onloadend = () => resolve(reader.result as string);
					reader.readAsDataURL(blob);
				});
				img.src = base64;
			} catch (e) {
				console.warn('Failed to convert image to base64:', img.src, e);
				// Keep original src if conversion fails
			}
		}
	}

	return clone;
}

/**
 * Extract all stylesheets from the document for accurate template rendering
 */
function extractStyles(): string {
	const styles: string[] = [];

	// Get all style elements (includes Svelte component styles)
	for (const style of document.querySelectorAll('style')) {
		styles.push(style.textContent || '');
	}

	// Get all linked stylesheets (same-origin only)
	for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
		try {
			const sheet = (link as HTMLLinkElement).sheet;
			if (sheet) {
				for (const rule of sheet.cssRules) {
					styles.push(rule.cssText);
				}
			}
		} catch {
			// Cross-origin stylesheet, skip
		}
	}

	return styles.join('\n');
}

/**
 * Build a self-contained HTML document from the preview element
 */
async function buildHtmlDocument(previewElement: HTMLElement): Promise<string> {
	const clone = await cloneAndProcessPreview(previewElement);
	const cssStyles = extractStyles();

	return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
${cssStyles}
/* Print overrides */
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; padding: 20px; background: white; }
</style>
</head>
<body>
${clone.innerHTML}
</body>
</html>`;
}

/**
 * Generate a PDF from the preview element using the server-side API
 * Returns the PDF blob and storage status
 */
export async function generatePdfFromPreview(
	options: PdfGeneratorOptions
): Promise<PdfGeneratorResult> {
	const { invoice, previewElement, pageSettings } = options;

	// Wait for images to load
	await waitForPreviewImages(previewElement);

	// Build self-contained HTML
	const htmlContent = await buildHtmlDocument(previewElement);

	// Try server-side generation
	const response = await fetch('/api/pdf', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			html: htmlContent,
			invoiceId: invoice.id,
			invoiceTo: invoice.invoiceTo,
			pageSize: pageSettings.pageSize,
			margins: pageSettings.margins
		})
	});

	if (!response.ok) {
		throw new Error(`PDF generation failed: ${response.status}`);
	}

	const blob = await response.blob();
	const storageStatus = response.headers.get('X-Storage-Status');

	return {
		blob,
		storageStatus: storageStatus === 'saved' ? 'saved' : 'local-only'
	};
}

/**
 * Generate a PDF using client-side html2pdf.js (fallback for guests or when server fails)
 *
 * Approach: Temporarily modify the preview element's styles to remove scaling,
 * then capture just the .invoice-preview content with proper dimensions.
 */
export async function generatePdfClientSide(
	previewElement: HTMLElement,
	invoice: InvoiceData,
	pageSettings: PageSettings
): Promise<void> {
	const html2pdf = (await import('html2pdf.js')).default;

	// Find the actual invoice content element
	const invoicePreview = previewElement.querySelector('.invoice-preview') as HTMLElement | null;
	const templateWrapper = previewElement.querySelector('.template-wrapper') as HTMLElement | null;
	const scaleWrapper = previewElement.querySelector('.scale-wrapper') as HTMLElement | null;
	const indicator = previewElement.querySelector('.page-size-indicator') as HTMLElement | null;

	if (!invoicePreview) {
		console.error('Could not find .invoice-preview element');
		return;
	}

	// Page dimensions in inches
	const pageSizes: Record<string, { width: number; height: number }> = {
		letter: { width: 8.5, height: 11 },
		a4: { width: 8.27, height: 11.69 },
		legal: { width: 8.5, height: 14 },
		a5: { width: 5.83, height: 8.27 }
	};
	const pageSize = pageSizes[pageSettings.pageSize] || pageSizes.letter;

	// Convert margins from mm to inches
	const mmToInches = (mm: number) => mm / 25.4;
	const margins = {
		top: mmToInches(pageSettings.margins.top),
		right: mmToInches(pageSettings.margins.right),
		bottom: mmToInches(pageSettings.margins.bottom),
		left: mmToInches(pageSettings.margins.left)
	};

	// Store original styles
	const origStyles = {
		indicator: indicator?.style.cssText || '',
		wrapper: templateWrapper?.style.cssText || '',
		scaleWrapper: scaleWrapper?.style.cssText || '',
		preview: invoicePreview.style.cssText || ''
	};

	try {
		// Hide the page size indicator
		if (indicator) {
			indicator.style.display = 'none';
		}

		// Remove transform and reset wrapper - make it flow naturally
		if (templateWrapper) {
			templateWrapper.style.transform = 'none';
			templateWrapper.style.position = 'static';
			templateWrapper.style.width = `${pageSize.width}in`;
			templateWrapper.style.minHeight = 'auto';
			templateWrapper.style.height = 'auto';
			templateWrapper.style.padding = '0';
		}

		// Reset scale wrapper
		if (scaleWrapper) {
			scaleWrapper.style.width = `${pageSize.width}in`;
			scaleWrapper.style.height = 'auto';
		}

		// Reset invoice preview to natural flow
		invoicePreview.style.minHeight = 'auto';
		invoicePreview.style.height = 'auto';

		// Wait for reflow
		await new Promise((r) => requestAnimationFrame(r));

		// Generate PDF targeting just the invoice content
		await html2pdf()
			.from(invoicePreview)
			.set({
				margin: [margins.top, margins.right, margins.bottom, margins.left],
				filename: `invoice-${invoice.invoiceTo?.replace(/[^a-zA-Z0-9]/g, '-') || 'invoice'}.pdf`,
				image: { type: 'jpeg', quality: 0.98 },
				html2canvas: {
					scale: 2,
					useCORS: true,
					logging: false
				},
				jsPDF: {
					unit: 'in',
					format: [pageSize.width, pageSize.height],
					orientation: 'portrait'
				},
				pagebreak: { mode: 'avoid-all' }
			})
			.save();
	} finally {
		// Restore original styles
		if (indicator) indicator.style.cssText = origStyles.indicator;
		if (templateWrapper) templateWrapper.style.cssText = origStyles.wrapper;
		if (scaleWrapper) scaleWrapper.style.cssText = origStyles.scaleWrapper;
		invoicePreview.style.cssText = origStyles.preview;
	}
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = window.URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	window.URL.revokeObjectURL(url);
	document.body.removeChild(a);
}
