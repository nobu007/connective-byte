import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('should match homepage screenshot in success state', async ({ page }) => {
    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          uptime: 12345,
          timestamp: new Date('2024-01-01T00:00:00Z').toISOString(),
        }),
      });
    });

    await page.goto('/');

    // Wait for content to load
    await expect(page.getByText('Backend status: ok')).toBeVisible();

    // Take screenshot and compare
    await expect(page).toHaveScreenshot('homepage-success.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match homepage screenshot in error state', async ({ page }) => {
    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Service unavailable' }),
      });
    });

    await page.goto('/');

    // Wait for error state
    await page.waitForTimeout(2000);
    const statusIndicator = page.getByTestId('status-indicator');
    await expect(statusIndicator).toContainText(/ERROR/i, { timeout: 15000 });

    // Take screenshot and compare
    await expect(page).toHaveScreenshot('homepage-error.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match homepage screenshot in loading state', async ({ page }) => {
    let resolveRoute: ((value: unknown) => void) | undefined;
    const routePromise = new Promise((resolve) => {
      resolveRoute = resolve;
    });

    await page.route('**/api/health', async (route) => {
      await routePromise;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', uptime: 100 }),
      });
    });

    await page.goto('/');

    // Capture loading state
    const statusIndicator = page.getByTestId('status-indicator');
    await expect(statusIndicator).toContainText(/LOADING/i);

    // Take screenshot of loading state
    await expect(page).toHaveScreenshot('homepage-loading.png', {
      fullPage: true,
      animations: 'disabled',
    });

    // Release the request
    resolveRoute?.(null);
  });

  test('should match status indicator component in different states', async ({ page }) => {
    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', uptime: 100 }),
      });
    });

    await page.goto('/');

    // Wait for success state
    await expect(page.getByText('Backend status: ok')).toBeVisible();

    // Take screenshot of just the status indicator
    const statusIndicator = page.getByTestId('status-indicator');
    await expect(statusIndicator).toHaveScreenshot('status-indicator-success.png', {
      animations: 'disabled',
    });
  });

  test('should match mobile viewport screenshot', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', uptime: 100 }),
      });
    });

    await page.goto('/');

    // Wait for content to load
    await expect(page.getByText('Backend status: ok')).toBeVisible();

    // Take screenshot for mobile
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match tablet viewport screenshot', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', uptime: 100 }),
      });
    });

    await page.goto('/');

    // Wait for content to load
    await expect(page.getByText('Backend status: ok')).toBeVisible();

    // Take screenshot for tablet
    await expect(page).toHaveScreenshot('homepage-tablet.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('should match dark mode screenshot', async ({ page }) => {
    // Emulate dark color scheme
    await page.emulateMedia({ colorScheme: 'dark' });

    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', uptime: 100 }),
      });
    });

    await page.goto('/');

    // Wait for content to load
    await expect(page.getByText('Backend status: ok')).toBeVisible();

    // Take screenshot in dark mode
    await expect(page).toHaveScreenshot('homepage-dark-mode.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});
