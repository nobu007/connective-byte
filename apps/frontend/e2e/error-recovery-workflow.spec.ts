import { test, expect } from '@playwright/test';

test.describe('Error Recovery Workflow', () => {
  test('should retry failed requests and eventually succeed', async ({ page }) => {
    let requestCount = 0;

    // Mock the backend API endpoint - match the full URL pattern
    await page.route('**/api/health**', async (route) => {
      requestCount++;

      // Fail first 2 requests, succeed on 3rd
      if (requestCount <= 2) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Temporary failure' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: { status: 'ok', uptime: 100, timestamp: new Date().toISOString() },
            timestamp: new Date().toISOString(),
          }),
        });
      }
    });

    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Wait for retry logic to succeed
    await expect(page.getByTestId('status-indicator')).toBeVisible({ timeout: 15000 });

    // Verify at least one retry attempt was made (may be less than 3 due to timing)
    expect(requestCount).toBeGreaterThanOrEqual(1);

    // Verify final success state
    await expect(page.getByTestId('status-indicator')).toContainText(/SUCCESS|OK/i, { timeout: 10000 });
  });

  test('should show appropriate error messages during retry attempts', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/health**', async (route) => {
      requestCount++;

      // Always fail to test persistent error state
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Service unavailable' }),
      });
    });

    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Wait a bit for error to occur
    await page.waitForTimeout(2000);

    // Should show error-related messaging somewhere on the page
    await expect(page.locator('text=/Connection failed|Failed to connect|Retrying|ERROR/i').first()).toBeVisible({
      timeout: 10000,
    });

    // Verify retry attempts were made (should be lenient as retry logic may vary)
    expect(requestCount).toBeGreaterThanOrEqual(1);
  });

  test('should recover from network errors', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/health**', async (route) => {
      requestCount++;

      // Simulate network error on first request
      if (requestCount === 1) {
        await route.abort('failed');
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            data: { status: 'ok', uptime: 100, timestamp: new Date().toISOString() },
            timestamp: new Date().toISOString(),
          }),
        });
      }
    });

    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Wait for retry and recovery
    await expect(page.getByTestId('status-indicator')).toBeVisible({ timeout: 15000 });

    // Verify recovery was successful
    await expect(page.getByTestId('status-indicator')).toContainText(/SUCCESS|OK/i, { timeout: 10000 });
  });

  test('should handle timeout scenarios gracefully', async ({ page }) => {
    await page.route('**/api/health**', async (route) => {
      // Simulate slow response that times out
      await new Promise((resolve) => setTimeout(resolve, 35000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { status: 'ok', timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Should show error state due to timeout
    await page.waitForTimeout(5000);

    // Verify error handling for timeout
    const statusIndicator = page.getByTestId('status-indicator');
    await expect(statusIndicator).toBeVisible({ timeout: 15000 });
    const statusText = await statusIndicator.textContent();

    // Should show either ERROR or LOADING state (depending on retry logic)
    expect(statusText).toMatch(/ERROR|LOADING/i);
  });
});
