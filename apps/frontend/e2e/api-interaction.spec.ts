import { test, expect } from '@playwright/test';

test.describe('API Interaction with page.route()', () => {
  test('should display success message when API call is successful', async ({ page }) => {
    // Mock the API call to return a success response.
    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' }),
      });
    });

    await page.goto('/');

    // Check for success message.
    await expect(page.getByText('Backend status: ok')).toBeVisible();
    await expect(page.getByTestId('status-indicator')).toHaveText('Current Status: SUCCESS');
  });

  test('should display error message when API call fails', async ({ page }) => {
    // Mock the API call to return an error response.
    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      });
    });

    await page.goto('/');

    // Check for error message.
    await expect(page.getByText('Failed to connect to the backend.')).toBeVisible();
    await expect(page.getByTestId('status-indicator')).toHaveText('Current Status: ERROR');
  });
});
