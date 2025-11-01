# Playwright E2Eテスト実践ガイド for Next.js

このドキュメントは、`connective-byte`プロジェクトでNext.jsアプリケーションのE2EテストをPlaywrightで構築した際に得られた知見とベストプラクティスをまとめたものです。特に、API通信のモック（模擬）に焦点を当て、成功に至るまでの試行錯誤と最終的な解決策を記録します。

## 1. 最も重要な原則：テスト環境の理解

Playwrightのテストを成功させるための最も重要な原則は、**「テストが実際のブラウザ環境で実行される」**ことを理解することです。

- **やってはいけないこと (The Anti-Pattern)**: Node.js環境で動作するテストツール（例: Jest）と同じ感覚で、Node.jsプロセス内で完結するモックライブラリ（例: MSWの`setupServer`）を使おうとすること。アプリケーションの`fetch`リクエストはブラウザから発行されるため、Node.js側のモックサーバーはこれを捕捉できず、テストは必ず失敗します。我々のプロジェクトで発生した長時間の問題は、すべてこの根本的な誤解が原因でした。

- **やるべきこと (The Best Practice)**: Playwrightが提供する、ブラウザのネットワークリクエストを直接操作するためのネイティブ機能を使うこと。

## 2. APIモックの実践方法

### 何をするか：`page.route()` を使う

Next.jsアプリケーションのE2EテストでAPI通信をモックする場合、**Playwrightの `page.route()` を使うのが唯一の正解です。** これにより、ブラウザが発行するリクエストをテストコード内で直接捕捉し、任意のレスポンスを返すことができます。

#### 注意点

- **対象URLの指定**: `page.route('**/api/health', ...)` のように、globパターンを使って対象のAPIエンドポイントを正確に指定します。`**` はホスト名やポート番号を問わないため、柔軟なマッチングが可能です。
- **レスポンスの作成**: `route.fulfill()` を使って、ステータスコード、コンテントタイプ、ボディを定義した偽のレスポンスを返却します。

#### 実装例 (`e2e/api-interaction.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';

test.describe('API Interaction with page.route()', () => {
  // 成功ケースのテスト
  test('should display success message when API call is successful', async ({ page }) => {
    // API呼び出しをモックし、成功レスポンスを返す
    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' }),
      });
    });

    await page.goto('/');

    // 成功メッセージが表示されることを確認
    await expect(page.getByText('Backend status: ok')).toBeVisible();
  });

  // 失敗ケースのテスト
  test('should display error message when API call fails', async ({ page }) => {
    // API呼び出しをモックし、エラーレスポンスを返す
    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      });
    });

    await page.goto('/');

    // エラーメッセージが表示されることを確認
    await expect(page.getByText('Failed to connect to the backend.')).toBeVisible();
  });
});
```

## 3. デバッグの勘所

テストが失敗する場合、以下の点に注意してデバッグを進めてください。

1.  **問題の切り分け**:
    - `test.only` を使って、失敗するテストケースだけを単独で実行します。これにより、他のテストからの影響（状態のリークなど）がないかを確認できます。
2.  **コンポーネントの動作確認**:
    - `fetch` が実行される直前に `console.log` を仕込みます。テスト実行時にコンソールにログが出力されない場合、問題はAPIモック以前に、コンポーネントがマウントされていないか、イベントが発火していない可能性があります。
3.  **基本的な設定の確認**:
    - `playwright.config.ts` の `webServer` 設定が、正しくNext.jsの開発サーバーを起動するようになっているか確認します。
    - テストで検証しているUIのテキスト（例: ページタイトル）が、実際のコード（例: `layout.tsx`）と完全に一致しているか確認します。

このガイドが、今後のE2Eテスト開発における安定性と効率性の向上に繋がることを期待します。
