import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate between all pages', async ({ page }) => {
    // Start at homepage
    await page.goto('/');
    await expect(page).toHaveTitle(/ConnectiveByte/);

    // Navigate to About
    await page.getByRole('link', { name: /About/i }).first().click();
    await expect(page).toHaveURL(/\/about/);
    await expect(page.getByRole('heading', { name: /ConnectiveByteについて/i })).toBeVisible();

    // Navigate to Contact
    await page
      .getByRole('link', { name: /お問い合わせ/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/contact/);
    await expect(page.getByRole('heading', { name: /無料相談のお申し込み/i })).toBeVisible();

    // Navigate back to Home
    await page
      .getByRole('link', { name: /ホーム/i })
      .first()
      .click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: /個を超え、知が立ち上がる場所/i })).toBeVisible();
  });

  test('should have working logo link', async ({ page }) => {
    await page.goto('/about');
    await page
      .getByRole('link', { name: /ConnectiveByte/i })
      .first()
      .click();
    await expect(page).toHaveURL('/');
  });

  test('should highlight current page in navigation', async ({ page }) => {
    await page.goto('/');
    const homeLink = page.getByRole('link', { name: /ホーム/i }).first();
    await expect(homeLink).toHaveAttribute('aria-current', 'page');

    await page.goto('/about');
    const aboutLink = page.getByRole('link', { name: /About/i }).first();
    await expect(aboutLink).toHaveAttribute('aria-current', 'page');
  });

  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: /main navigation/i });
    await expect(nav).toBeVisible();
  });

  test.describe('Mobile Navigation', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should open and close mobile menu', async ({ page }) => {
      await page.goto('/');

      // Open menu
      const menuButton = page.getByRole('button', { name: /open menu/i });
      await expect(menuButton).toBeVisible();
      await menuButton.click();

      // Menu should be open
      await expect(page.getByRole('button', { name: /close menu/i })).toBeVisible();

      // Close menu
      await page.getByRole('button', { name: /close menu/i }).click();
      await expect(page.getByRole('button', { name: /open menu/i })).toBeVisible();
    });

    test('should navigate using mobile menu', async ({ page }) => {
      await page.goto('/');

      // Open menu
      await page.getByRole('button', { name: /open menu/i }).click();

      // Click About link in mobile menu
      await page.getByRole('link', { name: /About/i }).last().click();

      // Should navigate to About page
      await expect(page).toHaveURL(/\/about/);
      await expect(page.getByRole('heading', { name: /ConnectiveByteについて/i })).toBeVisible();
    });
  });
});
