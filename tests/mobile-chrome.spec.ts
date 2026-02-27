import { expect, test } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.describe('Mobile Editor Chrome', () => {
	test.use({ viewport: MOBILE_VIEWPORT });

	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector('[data-testid="invoice-from"]');
	});

	test('renders app-style mobile bar and hides desktop chrome', async ({ page }) => {
		await expect(page.locator('.mobile-editor-bar')).toBeVisible();
		await expect(page.locator('.desktop-docs-chrome')).toBeHidden();
	});

	test('quick actions open draft modal and preview', async ({ page }) => {
		await page.click('[data-testid="mobile-save-button"]');
		await expect(page.locator('.modal[role="dialog"]')).toBeVisible();
		await page.locator('.modal-button.cancel-button').click();

		await page.click('[data-testid="mobile-preview-button"]');
		await expect(page.locator('.invoice-preview')).toBeVisible();
	});

	test('actions sheet supports save draft flow', async ({ page }) => {
		await expect(page.locator('[data-testid="mobile-actions-button"]')).toHaveAttribute(
			'aria-label',
			'More actions'
		);
		await page.click('[data-testid="mobile-actions-button"]');
		await expect(page.locator('[data-testid="mobile-actions-sheet"]')).toBeVisible();

		await page.click('[data-testid="mobile-actions-save-draft"]');
		await expect(page.locator('[data-testid="mobile-actions-sheet"]')).toBeHidden();
		await expect(page.locator('.modal[role="dialog"]')).toBeVisible();
	});

	test('settings sheet renders template and page controls', async ({ page }) => {
		await page.click('[data-testid="mobile-settings-button"]');
		await expect(page.locator('[data-testid="mobile-settings-sheet"]')).toBeVisible();

		const viewModeToggle = page.locator(
			'[data-testid="mobile-settings-sheet"] [data-testid="mobile-view-mode-toggle"]'
		);
		await expect(viewModeToggle).toBeVisible();
		await expect(viewModeToggle).toContainText('Fit');
		await expect(viewModeToggle).toHaveAttribute(
			'aria-label',
			'Current view Fit. Switch to A4 view'
		);

		await viewModeToggle.click();
		await expect(viewModeToggle).toContainText('A4');
		await expect(viewModeToggle).toHaveAttribute(
			'aria-label',
			'Current view A4. Switch to Fit view'
		);
		await expect(page.locator('[data-testid="mobile-preview-button"]')).toContainText('Edit');

		await viewModeToggle.click();
		await expect(viewModeToggle).toContainText('Fit');
		await expect(viewModeToggle).toHaveAttribute(
			'aria-label',
			'Current view Fit. Switch to A4 view'
		);

		await page.locator('[data-testid="mobile-settings-sheet"] .margin-toggle-btn').first().click();
		await expect(page.locator('[data-testid="mobile-settings-sheet"]')).toBeVisible();
		await expect(page.locator('[data-testid="mobile-margin-dialog"]')).toBeVisible();
		await page.click('[data-testid="mobile-margin-close"]');
		await expect(page.locator('[data-testid="mobile-margin-dialog"]')).toBeHidden();
		await expect(page.locator('[data-testid="mobile-settings-sheet"]')).toBeVisible();
		await expect(page.locator('[data-testid="mobile-settings-sheet"] #template-select')).toBeVisible();
		await expect(page.locator('[data-testid="mobile-settings-sheet"] #page-size-select')).toBeVisible();

		await page.locator('[data-testid="mobile-settings-sheet"] .margin-toggle-btn').first().click();
		await expect(page.locator('[data-testid="mobile-margin-dialog"]')).toBeVisible();
		await page.click('[data-testid="mobile-margin-overlay"]', { position: { x: 8, y: 8 } });
		await expect(page.locator('[data-testid="mobile-margin-dialog"]')).toBeHidden();
		await expect(page.locator('[data-testid="mobile-settings-sheet"]')).toBeVisible();

		await page.locator('[data-testid="mobile-settings-sheet"] .margin-toggle-btn').first().click();
		await expect(page.locator('[data-testid="mobile-margin-dialog"]')).toBeVisible();
		await page.locator('[data-testid="mobile-margin-close"]').focus();
		await page.keyboard.press('Escape');
		await expect(page.locator('[data-testid="mobile-margin-dialog"]')).toBeHidden();
		await expect(page.locator('[data-testid="mobile-settings-sheet"]')).toBeVisible();
	});
});

test.describe('Mobile Shared Header', () => {
	test.use({ viewport: MOBILE_VIEWPORT });

	test('opens actions and settings sheets on history route', async ({ page }) => {
		await page.goto('/history');
		await page.waitForSelector('header.app-header');

		await expect(page.locator('.mobile-menu-button')).toBeVisible();

		const hasSignIn = await page.getByRole('button', { name: 'Sign In' }).isVisible();
		const hasAvatar = await page.locator('.avatar-button').isVisible();
		expect(hasSignIn || hasAvatar).toBeTruthy();

		await page.locator('.mobile-menu-button').click();
		await expect(page.locator('[data-testid="mobile-actions-sheet"]')).toBeVisible();

		await page.getByRole('button', { name: 'Settings' }).click();
		await expect(page.locator('[data-testid="mobile-actions-sheet"]')).toBeHidden();
		await expect(page.locator('[data-testid="mobile-settings-sheet"]')).toBeVisible();
	});
});
