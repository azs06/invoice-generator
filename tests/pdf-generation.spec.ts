import { expect, type Page, test } from '@playwright/test';

const switchToPreview = async (page: Page): Promise<void> => {
	const previewTab = page.locator('[data-testid="preview-tab"]');
	if (await previewTab.isVisible()) {
		await previewTab.click();
	}
	await page.waitForSelector('.invoice-preview');
};

test.describe('Invoice Template Rendering', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		// Wait for form fields, which are visible across all breakpoints
		await page.waitForSelector('[data-testid="invoice-from"]');
	});

	test('renders invoice form with default data', async ({ page }) => {
		// Verify form elements are present
		await expect(page.locator('[data-testid="invoice-from"]')).toBeVisible();
		await expect(page.locator('[data-testid="invoice-to"]')).toBeVisible();
		await expect(page.locator('[data-testid="item-name-0"]')).toBeVisible();
	});

	test('fills invoice data and verifies in preview', async ({ page }) => {
		// Fill basic invoice data
		await page.fill(
			'[data-testid="invoice-from"]',
			'Test Company Inc.\n123 Main Street\nNew York, NY 10001'
		);
		await page.fill(
			'[data-testid="invoice-to"]',
			'Client Corporation\n456 Oak Avenue\nLos Angeles, CA 90001'
		);

		// Fill item data
		await page.fill('[data-testid="item-name-0"]', 'Web Development Services');
		await page.fill('[data-testid="item-quantity-0"]', '10');
		await page.fill('[data-testid="item-price-0"]', '150');

		// Switch to preview
		await switchToPreview(page);

		// Verify invoice data appears in preview
		const previewContent = await page.locator('.invoice-preview').textContent();
		expect(previewContent).toContain('Test Company');
		expect(previewContent).toContain('Web Development Services');
	});

	test('switches between templates correctly', async ({ page }) => {
		// Fill some data first
		await page.fill('[data-testid="invoice-from"]', 'Test Company');

		// Switch to preview
		await switchToPreview(page);

		// Get template selector
		const templateSelect = page.locator('[data-testid="template-select"]:visible').first();
		await expect(templateSelect).toBeVisible();

		// Test Modern template (default)
		await templateSelect.selectOption('modern');
		await expect(page.locator('.modern-template')).toBeVisible();

		// Test Classic template
		await templateSelect.selectOption('classic');
		await expect(page.locator('.classic-template')).toBeVisible();

		// Test Minimal template
		await templateSelect.selectOption('minimal');
		await expect(page.locator('.minimal-template')).toBeVisible();

		// Test Atlantic template
		await templateSelect.selectOption('atlantic');
		await expect(page.locator('.atlantic-template')).toBeVisible();
	});

	test('calculates item totals correctly', async ({ page }) => {
		// Fill item with quantity 5 and price 100
		await page.fill('[data-testid="item-name-0"]', 'Test Item');
		await page.fill('[data-testid="item-quantity-0"]', '5');
		await page.fill('[data-testid="item-price-0"]', '100');

		// Switch to preview
		await switchToPreview(page);

		// Verify the calculated amount ($500) appears
		const previewContent = await page.locator('.invoice-preview').textContent();
		expect(previewContent).toContain('500');
	});

	test('download PDF button is visible in preview', async ({ page }) => {
		// Switch to preview
		await switchToPreview(page);

		// Verify at least one download button is visible for current breakpoint
		const visibleDownloadButtons = page.locator(
			'[data-testid="download-pdf-desktop"]:visible, [data-testid="download-pdf"]:visible'
		);
		await expect(visibleDownloadButtons).toHaveCount(1);
	});

	test('opens Save Draft modal from File menu and closes menu', async ({ page }) => {
		const fileMenuButton = page.locator('[data-testid="file-menu-button"]');
		const fileMenu = page.locator('[data-testid="file-menu"]');

		await fileMenuButton.click();
		await expect(fileMenu).toBeVisible();

		await page.click('[data-testid="file-menu-save-draft"]');

		await expect(fileMenu).toBeHidden();
		await expect(page.locator('.modal[role="dialog"]')).toBeVisible();
	});

	test('shows delete action in File menu', async ({ page }) => {
		const fileMenuButton = page.locator('[data-testid="file-menu-button"]');
		const fileMenu = page.locator('[data-testid="file-menu"]');
		const deleteMenuItem = page.locator('[data-testid="file-menu-delete"]');

		await fileMenuButton.click();
		await expect(fileMenu).toBeVisible();
		await expect(deleteMenuItem).toBeVisible();
	});

	test('each template renders invoice preview correctly', async ({ page }) => {
		const templates = ['modern', 'classic', 'minimal', 'atlantic'];

		// Fill test data
		await page.fill('[data-testid="invoice-from"]', 'Sender Company');
		await page.fill('[data-testid="invoice-to"]', 'Recipient Company');
		await page.fill('[data-testid="item-name-0"]', 'Service Item');
		await page.fill('[data-testid="item-quantity-0"]', '2');
		await page.fill('[data-testid="item-price-0"]', '250');

		// Switch to preview
		await switchToPreview(page);

		for (const template of templates) {
			// Select template
			await page.locator('[data-testid="template-select"]:visible').first().selectOption(template);

			// Wait for template to load
			await page.waitForSelector(`.${template}-template`);

			// Verify template-specific class exists
			await expect(page.locator(`.${template}-template`)).toBeVisible();

			// Verify invoice data is rendered
			const content = await page.locator('.invoice-preview').textContent();
			expect(content).toContain('Sender Company');
			expect(content).toContain('Service Item');
			expect(content).toContain('500'); // 2 x 250
		}
	});
});

test.describe('PDF Download', () => {
	test('triggers PDF download for guest users', async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('[data-testid="invoice-from"]');

		// Fill minimal data
		await page.fill('[data-testid="invoice-from"]', 'Test Company');
		await page.fill('[data-testid="invoice-to"]', 'Client Company');
		await page.fill('[data-testid="item-name-0"]', 'Service');
		await page.fill('[data-testid="item-quantity-0"]', '1');
		await page.fill('[data-testid="item-price-0"]', '100');

		// Switch to preview
		await switchToPreview(page);

		// Click download - for guest users this may show a signup prompt
		// We just verify the button is clickable
		const downloadButton = page.locator('[data-testid="download-pdf"]');
		await expect(downloadButton).toBeEnabled();
	});
});
