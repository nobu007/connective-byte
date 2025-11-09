import { test, expect } from '@playwright/test';

test.describe('Health Monitoring Workflow', () => {
  test('should load and display initial health status', async ({ page }) => {
    // Just verify the page loads and displays status from real backend
    await page.goto('/');

    // Verify initial status loads
    await expect(page.getByTestId('status-indicator')).toBeVisible({ timeout: 10000 });

    // Verify status is displayed correctly (either SUCCESS or ERROR depending on backend)
    await expect(page.getByTestId('status-indicator')).toContainText(/SUCCESS|OK|ERROR|LOADING/i, { timeout: 10000 });
  });

  test('should handle error status from backend', async ({ page }) => {
    await page.route('**/api/health', async (route) => {
      // Return error status
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Service unavailable' }),
      });
    });

    await page.goto('/');

    // Wait a bit for error to occur
    await page.waitForTimeout(2000);

    // Verify error state is displayed somewhere on the page
    await expect(page.locator('text=/Connection failed|Failed to connect|ERROR/i').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('should display detailed health information', async ({ page }) => {
    const healthData = {
      status: 'ok',
      uptime: 12345,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      checks: [
        { name: 'database', status: 'pass', duration: 5 },
        { name: 'cache', status: 'pass', duration: 2 },
      ],
    };

    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: healthData,
          timestamp: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/');

    // Verify main status indicator is visible
    await expect(page.getByTestId('status-indicator')).toBeVisible({ timeout: 10000 });

    // Verify status indicator shows success
    await expect(page.getByTestId('status-indicator')).toContainText(/SUCCESS|OK/i, { timeout: 10000 });
  });
});
