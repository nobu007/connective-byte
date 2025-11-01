import { test, expect } from '@playwright/test';

test('has a valid title', async ({ page }) => {
  await page.goto('/');

  // Expect a title to match the one defined in the project.
  await expect(page).toHaveTitle(/Create Next App/);
});
