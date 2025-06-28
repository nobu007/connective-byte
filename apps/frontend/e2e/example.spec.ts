import { test, expect } from '@playwright/test';

test('has title and visible text', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Create Next App/);

  // Expect an element with the text "Get started by editing" to be visible.
  await expect(page.getByText('Get started by editing')).toBeVisible();
});
