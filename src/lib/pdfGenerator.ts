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
 * Includes targeted fixes for common html2pdf.js rendering issues:
 * 1. Hide A4 badge (html2pdf doesn't apply @media print rules)
 * 2. Remove transform: scale() which breaks layout calculations
 * 3. Reduce html2canvas scale from 3 to 2 to minimize rounding errors
 */
export async function generatePdfClientSide(
	previewElement: HTMLElement,
	invoice: InvoiceData,
	pageSettings: PageSettings
): Promise<void> {
	const html2pdf = (await import('html2pdf.js')).default;

	// Store original styles for restoration
	const indicator = previewElement.querySelector('.page-size-indicator') as HTMLElement | null;
	const templateWrapper = previewElement.querySelector('.template-wrapper.page') as HTMLElement | null;
	const scaleWrapper = previewElement.querySelector('.scale-wrapper') as HTMLElement | null;

	const originalStyles = {
		indicatorDisplay: indicator?.style.display || '',
		wrapperTransform: templateWrapper?.style.transform || '',
		wrapperPosition: templateWrapper?.style.position || '',
		scaleWrapperWidth: scaleWrapper?.style.width || '',
		scaleWrapperHeight: scaleWrapper?.style.height || ''
	};

	try {
		// Fix 1: Hide A4 badge (html2pdf ignores @media print)
		if (indicator) {
			indicator.style.display = 'none';
		}

		// Fix 2: Remove transform scale which causes layout issues
		if (templateWrapper) {
			templateWrapper.style.transform = 'none';
			templateWrapper.style.position = 'static';
		}

		// Fix 2b: Reset scale wrapper dimensions
		if (scaleWrapper) {
			scaleWrapper.style.width = 'auto';
			scaleWrapper.style.height = 'auto';
		}

		// Convert page size to jsPDF format
		const formatMap: Record<string, [number, number]> = {
			letter: [8.5, 11],
			a4: [8.27, 11.69],
			legal: [8.5, 14],
			a5: [5.83, 8.27]
		};
		const pdfFormat = formatMap[pageSettings.pageSize] || formatMap.letter;

		// Convert margins from mm to inches
		const mmToInches = (mm: number) => mm / 25.4;
		const margins = {
			top: mmToInches(pageSettings.margins.top),
			right: mmToInches(pageSettings.margins.right),
			bottom: mmToInches(pageSettings.margins.bottom),
			left: mmToInches(pageSettings.margins.left)
		};

		// Fix 3: Reduce scale from 3 to 2 to minimize layout shift
		await html2pdf()
			.from(previewElement)
			.set({
				margin: [margins.top, margins.right, margins.bottom, margins.left],
				filename: `invoice-${invoice.invoiceTo || 'unknown'}.pdf`,
				html2canvas: {
					scale: 2, // Reduced from 3 to minimize rounding errors
					useCORS: true,
					logging: false
				},
				jsPDF: {
					unit: 'in',
					format: pdfFormat,
					orientation: 'portrait'
				}
			})
			.save();
	} finally {
		// Restore original styles
		if (indicator) {
			indicator.style.display = originalStyles.indicatorDisplay;
		}
		if (templateWrapper) {
			templateWrapper.style.transform = originalStyles.wrapperTransform;
			templateWrapper.style.position = originalStyles.wrapperPosition;
		}
		if (scaleWrapper) {
			scaleWrapper.style.width = originalStyles.scaleWrapperWidth;
			scaleWrapper.style.height = originalStyles.scaleWrapperHeight;
		}
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
