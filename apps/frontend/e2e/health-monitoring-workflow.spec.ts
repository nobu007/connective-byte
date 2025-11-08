import { test, expect } from '@playwright/test';

test.describe('Health Monitoring Workflow', () => {
  test('should load and display initial health status', async ({ page }) => {
    let requestCount = 0;

    // Mock API to return health response
    await page.route('**/api/health', async (route) => {
      requestCount++;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          uptime: 100 + requestCount,
          timestamp: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/');

    // Verify initial status loads
    await expect(page.getByText('Backend status: ok')).toBeVisible();

    // Verify at least one request was made
    expect(requestCount).toBeGreaterThanOrEqual(1);

    // Verify status is displayed correctly
    await expect(page.getByTestId('status-indicator')).toContainText('SUCCESS');
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

    // Wait for initial request and retries
    await page.waitForTimeout(2000);

    // Verify error state is displayed
    const statusIndicator = page.getByTestId('status-indicator');
    await expect(statusIndicator).toContainText(/ERROR/i, { timeout: 15000 });
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
        body: JSON.stringify(healthData),
      });
    });

    await page.goto('/');

    // Verify main status
    await expect(page.getByText('Backend status: ok')).toBeVisible();

    // Verify status indicator shows success
    await expect(page.getByTestId('status-indicator')).toContainText('SUCCESS');
  });
});
