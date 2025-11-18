import { test, expect } from '@playwright/test';

test.describe('Contact Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
  });

  test('should display contact form with all fields', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /無料相談のお申し込み/i })).toBeVisible();
    await expect(page.getByLabel(/お名前/i)).toBeVisible();
    await expect(page.getByLabel(/メールアドレス/i)).toBeVisible();
    await expect(page.getByLabel(/お問い合わせ内容/i)).toBeVisible();
    await expect(page.getByRole('checkbox')).toBeVisible();
    await expect(page.getByText(/送信する/i)).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.getByText(/送信する/i).click();

    // Wait for validation errors to appear
    await expect(page.getByText(/お名前は2文字以上で入力してください/i)).toBeVisible();
    await expect(page.getByText(/有効なメールアドレスを入力してください/i)).toBeVisible();
    await expect(page.getByText(/メッセージは10文字以上で入力してください/i)).toBeVisible();
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await page.getByLabel(/お名前/i).fill('テストユーザー');
    await page.getByLabel(/メールアドレス/i).fill('invalid-email');
    await page.getByLabel(/お問い合わせ内容/i).fill('これはテストメッセージです。十分な長さがあります。');
    await page.getByRole('checkbox').check();

    await page.getByText(/送信する/i).click();

    await expect(page.getByText(/有効なメールアドレスを入力してください/i)).toBeVisible();
  });

  test('should show validation error when consent is not checked', async ({ page }) => {
    await page.getByLabel(/お名前/i).fill('テストユーザー');
    await page.getByLabel(/メールアドレス/i).fill('test@example.com');
    await page.getByLabel(/お問い合わせ内容/i).fill('これはテストメッセージです。十分な長さがあります。');

    await page.getByText(/送信する/i).click();

    await expect(page.getByText(/プライバシーポリシーに同意してください/i)).toBeVisible();
  });

  test('should submit form successfully with valid data', async ({ page }) => {
    await page.getByLabel(/お名前/i).fill('テストユーザー');
    await page.getByLabel(/メールアドレス/i).fill('test@example.com');
    await page.getByLabel(/お問い合わせ内容/i).fill('これはテストメッセージです。十分な長さがあります。');
    await page.getByRole('checkbox').check();

    await page.getByText(/送信する/i).click();

    // Wait for success message
    await expect(page.getByText(/送信完了/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/お問い合わせありがとうございます/i)).toBeVisible();
  });

  test('should have accessible form fields', async ({ page }) => {
    const nameInput = page.getByLabel(/お名前/i);
    const emailInput = page.getByLabel(/メールアドレス/i);
    const messageInput = page.getByLabel(/お問い合わせ内容/i);

    await expect(nameInput).toHaveAttribute('aria-required', 'true');
    await expect(emailInput).toHaveAttribute('aria-required', 'true');
    await expect(messageInput).toHaveAttribute('aria-required', 'true');
  });

  test('should have privacy policy link', async ({ page }) => {
    const privacyLink = page.getByRole('link', { name: /プライバシーポリシー/i });
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
