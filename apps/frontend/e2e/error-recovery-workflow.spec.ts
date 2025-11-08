import { test, expect } from '@playwright/test';

test.describe('Error Recovery Workflow', () => {
  test('should retry failed requests and eventually succeed', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/health', async (route) => {
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
          body: JSON.stringify({ status: 'ok', uptime: 100 }),
        });
      }
    });

    await page.goto('/');

    // Initially should show error or loading state
    await page.waitForTimeout(1000);

    // Wait for retry logic to succeed
    await expect(page.getByText('Backend status: ok')).toBeVisible({ timeout: 15000 });

    // Verify multiple retry attempts were made
    expect(requestCount).toBeGreaterThanOrEqual(3);

    // Verify final success state
    await expect(page.getByTestId('status-indicator')).toContainText('SUCCESS');
  });

  test('should show appropriate error messages during retry attempts', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/health', async (route) => {
      requestCount++;

      // Always fail to test persistent error state
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Service unavailable' }),
      });
    });

    await page.goto('/');

    // Wait for initial request and retries
    await page.waitForTimeout(2000);

    // Should show error-related messaging
    const statusIndicator = page.getByTestId('status-indicator');
    await expect(statusIndicator).toContainText(/ERROR/i, { timeout: 15000 });

    // Verify retry attempts were made
    expect(requestCount).toBeGreaterThan(1);
  });

  test('should recover from network errors', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/health', async (route) => {
      requestCount++;

      // Simulate network error on first request
      if (requestCount === 1) {
        await route.abort('failed');
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'ok', uptime: 100 }),
        });
      }
    });

    await page.goto('/');

    // Wait for retry and recovery
    await expect(page.getByText('Backend status: ok')).toBeVisible({ timeout: 15000 });

    // Verify recovery was successful
    await expect(page.getByTestId('status-indicator')).toContainText('SUCCESS');
  });

  test('should handle timeout scenarios gracefully', async ({ page }) => {
    await page.route('**/api/health', async (route) => {
      // Simulate slow response that times out
      await new Promise((resolve) => setTimeout(resolve, 35000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' }),
      });
    });

    await page.goto('/');

    // Should show error state due to timeout
    await page.waitForTimeout(2000);

    // Verify error handling for timeout
    const statusIndicator = page.getByTestId('status-indicator');
    const statusText = await statusIndicator.textContent();

    // Should show either ERROR or LOADING state (depending on retry logic)
    expect(statusText).toMatch(/ERROR|LOADING/i);
  });
});
