import { test, expect } from '@playwright/test';

test.describe('API Interaction with page.route()', () => {
  test('should display success message when API call is successful', async ({ page }) => {
    // Mock the API call to return a success response - match the full URL pattern
    await page.route('**/api/health**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: 100,
          },
          timestamp: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/');

    // Check for success status
    await expect(page.getByTestId('status-indicator')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('status-indicator')).toContainText(/SUCCESS|OK/i, { timeout: 10000 });
  });

  test('should display error message when API call fails', async ({ page }) => {
    // Mock the API call to return an error response - match the full URL pattern
    await page.route('**/api/health**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      });
    });

    await page.goto('/');

    // Wait a bit for the first error to occur
    await page.waitForTimeout(2000);

    // Check for error-related messaging in the page (either in status or message)
    await expect(page.locator('text=/Connection failed|Failed to connect|ERROR/i').first()).toBeVisible({
      timeout: 10000,
    });
  });
});
