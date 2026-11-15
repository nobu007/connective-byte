import { test, expect } from '@playwright/test';

// The footer newsletter form renders the same メールアドレス label, a consent
// checkbox and a privacy link on /contact, so every locator below is scoped
// to the contact form inside <main>.
test.describe('Contact Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
  });

  test('should display contact form with all fields', async ({ page }) => {
    const form = page.locator('main form');
    await expect(page.getByRole('heading', { name: /無料相談のお申し込み/i })).toBeVisible();
    await expect(form.getByLabel(/お名前/i)).toBeVisible();
    await expect(form.getByLabel(/メールアドレス/i)).toBeVisible();
    await expect(form.getByLabel(/お問い合わせ内容/i)).toBeVisible();
    await expect(form.getByRole('checkbox')).toBeVisible();
    await expect(form.getByRole('button', { name: /フォームを送信/i })).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    const form = page.locator('main form');
    await form.getByRole('button', { name: /フォームを送信/i }).click();

    // Wait for validation errors to appear
    await expect(page.getByText(/お名前は2文字以上で入力してください/i)).toBeVisible();
    await expect(page.getByText(/有効なメールアドレスを入力してください/i)).toBeVisible();
    await expect(page.getByText(/メッセージは10文字以上で入力してください/i)).toBeVisible();
  });

  test('should show validation error for invalid email', async ({ page }) => {
    const form = page.locator('main form');
    await form.getByLabel(/お名前/i).fill('テストユーザー');
    await form.getByLabel(/メールアドレス/i).fill('invalid-email');
    await form.getByLabel(/お問い合わせ内容/i).fill('これはテストメッセージです。十分な長さがあります。');
    await form.getByRole('checkbox').check();

    await form.getByRole('button', { name: /フォームを送信/i }).click();

    await expect(page.getByText(/有効なメールアドレスを入力してください/i)).toBeVisible();
  });

  test('should show validation error when consent is not checked', async ({ page }) => {
    const form = page.locator('main form');
    await form.getByLabel(/お名前/i).fill('テストユーザー');
    await form.getByLabel(/メールアドレス/i).fill('test@example.com');
    await form.getByLabel(/お問い合わせ内容/i).fill('これはテストメッセージです。十分な長さがあります。');

    await form.getByRole('button', { name: /フォームを送信/i }).click();

    await expect(page.getByText(/プライバシーポリシーに同意してください/i)).toBeVisible();
  });

  test('should submit form successfully with valid data', async ({ page }) => {
    const form = page.locator('main form');
    await form.getByLabel(/お名前/i).fill('テストユーザー');
    await form.getByLabel(/メールアドレス/i).fill('test@example.com');
    await form.getByLabel(/お問い合わせ内容/i).fill('これはテストメッセージです。十分な長さがあります。');
    await form.getByRole('checkbox').check();

    await form.getByRole('button', { name: /フォームを送信/i }).click();

    // Wait for success message
    await expect(page.getByText(/送信完了/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/お問い合わせありがとうございます/i)).toBeVisible();
  });

  test('should have accessible form fields', async ({ page }) => {
    const form = page.locator('main form');
    const nameInput = form.getByLabel(/お名前/i);
    const emailInput = form.getByLabel(/メールアドレス/i);
    const messageInput = form.getByLabel(/お問い合わせ内容/i);

    await expect(nameInput).toHaveAttribute('aria-required', 'true');
    await expect(emailInput).toHaveAttribute('aria-required', 'true');
    await expect(messageInput).toHaveAttribute('aria-required', 'true');
  });

  test('should have privacy policy link', async ({ page }) => {
    // Consent link inside the contact form (opens /privacy)
    const privacyLink = page.locator('main form').getByRole('link', { name: 'プライバシーポリシー', exact: true });
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toHaveAttribute('href', '/privacy');
  });

  test('should display contact information sidebar', async ({ page }) => {
    await expect(page.getByText(/相談について/i)).toBeVisible();
    await expect(page.getByText(/何をお話しできますか/i)).toBeVisible();
    await expect(page.getByText(/相談の流れ/i)).toBeVisible();
    await expect(page.getByText(/返信について/i)).toBeVisible();
  });
});
