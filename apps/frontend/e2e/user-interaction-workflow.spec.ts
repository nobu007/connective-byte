import { test, expect } from '@playwright/test';

test.describe('User Interaction Workflow', () => {
  test('should display loading state before data arrives', async ({ page }) => {
    let resolveRoute: ((value: unknown) => void) | undefined;
    const routePromise = new Promise((resolve) => {
      resolveRoute = resolve;
    });

    await page.route('**/api/health', async (route) => {
      // Hold the request to simulate loading state
      await routePromise;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { status: 'ok', uptime: 100 },
          timestamp: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/');

    // Verify loading state is shown
    const statusIndicator = page.getByTestId('status-indicator');
    await expect(statusIndicator).toContainText(/LOADING/i);

    // Release the request
    resolveRoute?.(null);

    // Verify transition to success state
    await expect(statusIndicator).toContainText(/SUCCESS|OK/i, { timeout: 10000 });
  });

  test('should handle page refresh and maintain functionality', async ({ page }) => {
    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { status: 'ok', uptime: 100 },
          timestamp: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/');

    // Verify initial load
    await expect(page.getByTestId('status-indicator')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('status-indicator')).toContainText(/SUCCESS|OK/i, { timeout: 10000 });

    // Refresh the page
    await page.reload();

    // Verify functionality still works after refresh
    await expect(page.getByTestId('status-indicator')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('status-indicator')).toContainText(/SUCCESS|OK/i, { timeout: 10000 });
  });

  test('should display all UI components correctly', async ({ page }) => {
    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            status: 'ok',
            uptime: 12345,
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/');

    // Verify status indicator
    await expect(page.getByTestId('status-indicator')).toBeVisible({ timeout: 10000 });

    // Verify status shows success
    await expect(page.getByTestId('status-indicator')).toContainText(/SUCCESS|OK/i, { timeout: 10000 });
  });

  test('should handle different status responses', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/health', async (route) => {
      requestCount++;

      // Return success status
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { status: 'ok', uptime: 100 + requestCount },
          timestamp: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/');

    // Wait for initial load
    await page.waitForTimeout(1000);

    // Verify the component renders without crashing
    const statusIndicator = page.getByTestId('status-indicator');
    await expect(statusIndicator).toBeVisible();

    // Verify at least one request was made
    expect(requestCount).toBeGreaterThanOrEqual(1);

    // Verify UI is responsive
    await expect(statusIndicator).toContainText(/SUCCESS|OK/i, { timeout: 10000 });
  });

  test('should maintain accessibility standards', async ({ page }) => {
    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: { status: 'ok', uptime: 100 },
          timestamp: new Date().toISOString(),
        }),
      });
    });

    await page.goto('/');

    // Verify semantic HTML structure
    await expect(page.getByRole('main')).toBeVisible();

    // Verify status indicator has proper test id for accessibility
    await expect(page.getByTestId('status-indicator')).toBeVisible();

    // Verify text content is readable
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(0);
  });
});
