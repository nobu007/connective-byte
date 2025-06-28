# システム分析レポート (SYSTEM_ANALYSIS.md)

## 1. プロジェクト構造

- **リポジトリルート:** モノレポ構成となっており、複数のアプリケーションが `apps` ディレクトリに格納されている。
- **主要ディレクトリ:**
    - `apps/`: フロントエンド、バックエンド、ボットの各アプリケーションを格納。
    - `docs/`: プロジェクト関連ドキュメント。
    - `libs/`: 共有ライブラリ（現在は空の可能性が高い）。
    - `shopify-theme/`: Shopifyテーマ関連のファイル。
- **設定ファイル:**
    - `package.json`: ルートレベルでの依存関係管理。
    - `netlify.toml`: Netlifyへのデプロイ設定。
    - `.prettierrc.json`, `eslint.config.js` など: コード品質・フォーマット設定。

## 2. プログラム構成

### 2-1. フロントエンド (`apps/frontend`)

- **フレームワーク:** Next.js (React)
- **言語:** TypeScript
- **スタイリング:** Tailwind CSS
- **役割:** ユーザーインターフェースを提供。
- **依存関係:** `react`, `next`

### 2-2. バックエンド (`apps/backend`)

- **フレームワーク:** Express.js
- **言語:** TypeScript
- **テンプレートエンジン:** LiquidJS
- **役割:** APIの提供、および `liquid` ファイルのHTMLへの変換処理。
- **依存関係:** `express`, `liquidjs`

### 2-3. ボット (`apps/bot`)

- 詳細不明。`package.json` が存在しないため、具体的な技術スタックは特定できず。

## 3. 既存テスト状況

- **フロントエンド:**
    - **単体/統合テスト:** Jestが導入済み (`jest.config.js`)。
    - **E2Eテスト:** Playwrightが導入済み (`playwright.config.ts`, `e2e/` ディレクトリ)。
    - **APIモック:** MSWが導入済み (`mocks/` ディレクトリ)。
    - テスト実行結果の出力先として `test-results`, `playwright-report` が存在する。
- **バックエンド:**
    - Jestが `devDependencies` に含まれているが、テストファイルや `tests` ディレクトリは存在しない。
- **CI/CD:**
    - `.github/workflows` ディレクトリが存在しないため、GitHub ActionsなどのCI/CDパイプラインは未設定。

## 4. 総括

- 本プロジェクトは、Next.jsによるフロントエンドとExpress.jsによるバックエンドで構成されるWebアプリケーションである。
- フロントエンドはテスト環境が整備されているが、バックエンドはテストが実装されていない。
- CI/CDは導入されておらず、手動でのデプロイ・テストが行われていると推測される。
- `liquid-to-html.js` というスクリプトの存在から、静的サイト生成のような機能を持つ可能性がある。
