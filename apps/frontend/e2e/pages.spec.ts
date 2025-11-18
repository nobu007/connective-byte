import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display hero section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /個を超え、知が立ち上がる場所/i })).toBeVisible();
    await expect(page.getByText(/AI時代の知的共創圏/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /無料相談に申し込む/i }).first()).toBeVisible();
  });

  test('should display problem statement section', async ({ page }) => {
    await expect(page.getByText(/AI時代、1人で戦うのは限界/i)).toBeVisible();
    await expect(page.getByText(/個人完結型では疲弊するだけ/i)).toBeVisible();
    await expect(page.getByText(/思考プロセスを言語化できない/i)).toBeVisible();
    await expect(page.getByText(/協働による成果拡大ができない/i)).toBeVisible();
  });

  test('should display value propositions', async ({ page }) => {
    await expect(page.getByText(/接続可能な人材になる、3つの価値/i)).toBeVisible();
    await expect(page.getByText(/Connect/i)).toBeVisible();
    await expect(page.getByText(/Active/i)).toBeVisible();
    await expect(page.getByText(/Collective/i)).toBeVisible();
  });

  test('should display social proof section', async ({ page }) => {
    await expect(page.getByText(/Version 0/i)).toBeVisible();
    await expect(page.getByText(/参加者募集中/i)).toBeVisible();
  });

  test('should display final CTA section', async ({ page }) => {
    await expect(page.getByText(/まずは無料相談から/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /無料相談に申し込む/i }).last()).toBeVisible();
  });

  test('should have working CTA buttons', async ({ page }) => {
    // Click hero CTA
    await page
      .getByRole('link', { name: /無料相談に申し込む/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/contact/);
  });
});

test.describe('About Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about');
  });

  test('should display all sections', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /ConnectiveByteについて/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /私たちのミッション/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /私たちの思想/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /私たちの価値観/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /私たちのビジョン/i })).toBeVisible();
  });

  test('should display philosophy concepts', async ({ page }) => {
    await expect(page.getByText(/APIコスト経営論/i)).toBeVisible();
    await expect(page.getByText(/人間連携教育論/i)).toBeVisible();
  });

  test('should display mission statement', async ({ page }) => {
    await expect(page.getByText(/次世代の学び：情報を鵜呑みにしないためのAI時代リテラシー教育/i)).toBeVisible();
  });

  test('should display vision tagline', async ({ page }) => {
    await expect(page.getByText(/理解されない孤独を吹き飛ばして、AI活用と思考連携で協創リーダーになる/i)).toBeVisible();
  });
});

test.describe('Privacy Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/privacy');
  });

  test('should display privacy policy', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /プライバシーポリシー/i })).toBeVisible();
  });

  test('should have table of contents', async ({ page }) => {
    await expect(page.getByText(/目次/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /個人情報の定義/i })).toBeVisible();
  });

  test('should have all required sections', async ({ page }) => {
    await expect(page.getByText(/個人情報の定義/i)).toBeVisible();
    await expect(page.getByText(/個人情報の収集/i)).toBeVisible();
    await expect(page.getByText(/個人情報の利用目的/i)).toBeVisible();
    await expect(page.getByText(/個人情報の第三者提供/i)).toBeVisible();
    await expect(page.getByText(/個人情報の管理/i)).toBeVisible();
  });

  test('should have contact information', async ({ page }) => {
    await expect(page.getByText(/info@connectivebyte.com/i)).toBeVisible();
  });
});

test.describe('Footer', () => {
  test('should display footer on all pages', async ({ page }) => {
    const pages = ['/', '/about', '/contact', '/privacy'];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await expect(page.getByText(/個を超え、知が立ち上がる場所/i).last()).toBeVisible();
      await expect(page.getByText(/© 2024 ConnectiveByte/i)).toBeVisible();
    }
  });

  test('should have social media links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Twitter/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Threads/i })).toBeVisible();
  });

  test('should have privacy policy link in footer', async ({ page }) => {
    await page.goto('/');
    const privacyLink = page.getByRole('link', { name: /プライバシーポリシー/i }).last();
    await expect(privacyLink).toBeVisible();
    await privacyLink.click();
    await expect(page).toHaveURL(/\/privacy/);
  });
});

test.describe('SEO and Meta Tags', () => {
  test('should have proper meta tags on homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ConnectiveByte/);

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toContain('AI時代の知的共創圏');
  });

  test('should have proper meta tags on about page', async ({ page }) => {
    await page.goto('/about');
    await expect(page).toHaveTitle(/About - ConnectiveByte/);
  });

  test('should have proper meta tags on contact page', async ({ page }) => {
    await page.goto('/contact');
    await expect(page).toHaveTitle(/お問い合わせ - ConnectiveByte/);
  });
});
