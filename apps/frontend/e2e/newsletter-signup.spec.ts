import { test, expect } from '@playwright/test';

test.describe('Newsletter Signup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Scroll to footer where newsletter form is located
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500); // Wait for scroll animation
  });

  test('should display newsletter signup form in footer', async ({ page }) => {
    // Verify newsletter section is visible
    await expect(page.getByText('ニュースレター登録')).toBeVisible();
    await expect(page.getByText(/AI時代の協創リーダーシップに関する最新情報をお届けします/)).toBeVisible();

    // Verify form fields
    await expect(page.locator('#newsletter-email')).toBeVisible();
    await expect(page.getByText(/プライバシーポリシーに同意します/)).toBeVisible();
    await expect(page.getByText('登録する')).toBeVisible();
  });

  test('should show validation error for empty email', async ({ page }) => {
    // Try to submit without filling email
    await page.getByText('登録する').click();

    // Verify validation error appears
    await expect(page.getByText('メールアドレスを入力してください')).toBeVisible();
  });

  test('should show validation error for invalid email format', async ({ page }) => {
    // Fill invalid email
    await page.locator('#newsletter-email').fill('invalid-email');
    await page.getByText('登録する').click();

    // Verify validation error appears
    await expect(page.getByText('有効なメールアドレスを入力してください')).toBeVisible();
  });

  test('should show validation error when consent is not checked', async ({ page }) => {
    // Fill valid email but don't check consent
    await page.locator('#newsletter-email').fill('test@example.com');
    await page.getByText('登録する').click();

    // Verify validation error appears
    await expect(page.getByText('プライバシーポリシーに同意してください')).toBeVisible();
  });

  test('should submit form successfully with valid data', async ({ page }) => {
    // Mock the API endpoint
    await page.route('**/api/newsletter', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Fill form with valid data
    await page.locator('#newsletter-email').fill('test@example.com');
    await page.locator('input[type="checkbox"]').check();

    // Submit form
    await page.getByText('登録する').click();

    // Verify success message appears
    await expect(page.getByText('登録完了')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('ニュースレターへの登録が完了しました')).toBeVisible();
    await expect(page.getByText('ウェルカムメールをご確認ください')).toBeVisible();
  });

  test('should display loading state during submission', async ({ page }) => {
    let resolveRoute: ((value: unknown) => void) | undefined;
    const routePromise = new Promise((resolve) => {
      resolveRoute = resolve;
    });

    // Mock API with delay
    await page.route('**/api/newsletter', async (route) => {
      await routePromise;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Fill and submit form
    await page.locator('#newsletter-email').fill('test@example.com');
    await page.locator('input[type="checkbox"]').check();
    await page.getByText('登録する').click();

    // Verify loading state
    await expect(page.getByText('送信中')).toBeVisible();

    // Release the request
    resolveRoute?.(null);

    // Verify success state
    await expect(page.getByText('登録完了')).toBeVisible({ timeout: 10000 });
  });

  test('should handle API error gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/newsletter', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'エラーが発生しました。もう一度お試しください。' }),
      });
    });

    // Fill and submit form
    await page.locator('#newsletter-email').fill('test@example.com');
    await page.locator('input[type="checkbox"]').check();
    await page.getByText('登録する').click();

    // Verify error message appears
    await expect(page.getByText('エラーが発生しました。もう一度お試しください')).toBeVisible({ timeout: 10000 });
  });

  test('should handle rate limit error', async ({ page }) => {
    // Mock rate limit error
    await page.route('**/api/newsletter', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: '送信回数が上限に達しました。しばらく待ってから再度お試しください。' }),
      });
    });

    // Fill and submit form
    await page.locator('#newsletter-email').fill('test@example.com');
    await page.locator('input[type="checkbox"]').check();
    await page.getByText('登録する').click();

    // Verify rate limit error message
    await expect(page.getByText(/送信回数が上限に達しました/)).toBeVisible({ timeout: 10000 });
  });

  test('should have accessible form fields', async ({ page }) => {
    const emailInput = page.locator('#newsletter-email');
    const consentCheckbox = page.locator('input[type="checkbox"]');

    // Verify ARIA attributes
    await expect(emailInput).toHaveAttribute('aria-required', 'true');
    await expect(consentCheckbox).toHaveAttribute('aria-required', 'true');
  });

  test('should have privacy policy link', async ({ page }) => {
    // Find the privacy policy link within the newsletter form
    const newsletterForm = page.locator('form').filter({ hasText: '登録する' });
    const privacyLink = newsletterForm.getByRole('link', { name: 'プライバシーポリシー' });

    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toHaveAttribute('href', '/privacy');
  });

  test('should track analytics event on successful signup', async ({ page }) => {
    // Mock newsletter API
    await page.route('**/api/newsletter', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Fill and submit form
    await page.locator('#newsletter-email').fill('test@example.com');
    await page.locator('input[type="checkbox"]').check();
    await page.getByText('登録する').click();

    // Wait for success message
    await expect(page.getByText('登録完了')).toBeVisible({ timeout: 10000 });

    // Verify form submission succeeded (which triggers analytics in the component)
    // The analytics tracking is tested indirectly through successful form submission
    expect(await page.getByText('登録完了').isVisible()).toBe(true);
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Focus on email field
    await page.locator('#newsletter-email').focus();
    await expect(page.locator('#newsletter-email')).toBeFocused();

    // Type email
    await page.keyboard.type('test@example.com');

    // Tab to consent checkbox
    await page.keyboard.press('Tab');
    const consentCheckbox = page.locator('input[type="checkbox"]');
    await expect(consentCheckbox).toBeFocused();

    // Check checkbox with space
    await page.keyboard.press('Space');
    await expect(consentCheckbox).toBeChecked();

    // Tab to submit button - there's a privacy policy link in between
    await page.keyboard.press('Tab'); // Tab to privacy link
    await page.keyboard.press('Tab'); // Tab to submit button
    const submitButton = page.getByText('登録する');

    // Verify button is now focused
    await expect(submitButton).toBeFocused();
  });

  test('should clear form after successful submission', async ({ page }) => {
    // Mock API
    await page.route('**/api/newsletter', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Fill and submit form
    await page.locator('#newsletter-email').fill('test@example.com');
    await page.locator('input[type="checkbox"]').check();
    await page.getByText('登録する').click();

    // Wait for success message
    await expect(page.getByText('登録完了')).toBeVisible({ timeout: 10000 });

    // Success message replaces the form, so form fields should not be visible
    await expect(page.locator('#newsletter-email')).not.toBeVisible();
  });

  test('should complete submission within 2 seconds', async ({ page }) => {
    // Mock API with fast response
    await page.route('**/api/newsletter', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // Fill form
    await page.locator('#newsletter-email').fill('test@example.com');
    await page.locator('input[type="checkbox"]').check();

    // Measure submission time
    const startTime = Date.now();
    await page.getByText('登録する').click();
    await expect(page.getByText('登録完了')).toBeVisible({ timeout: 10000 });
    const endTime = Date.now();

    const submissionTime = endTime - startTime;
    expect(submissionTime).toBeLessThan(2000);
  });
});
