# システム分析レポート (SYSTEM_ANALYSIS.md)

## 1. プロジェクト構造の自動分析

### 1-1. リポジトリ構成の分析

- **リポジトリルート:** `ls -F` の結果、プロジェクトはモノレポ構成であり、主要なディレクトリとして `apps`, `libs`, `docs`, `shopify-theme` が存在することを確認。
- **仕様・指示書:** `README.md` および `docs/` ディレクトリ内の `architecture.md`, `coding_standards.md` などを特定。
- **設定ファイル:** ルートに `netlify.toml`, `package.json`, `eslint.config.js` を特定。各アプリケーション (`apps/frontend`, `apps/backend`) にも個別の `package.json` が存在する。
- **自動化・実行スクリプト:** 各アプリケーションの `package.json` 内に `scripts` が定義されている。

### 1-2. プログラム構成の把握

- **主要コンポーネント:**
    - **`apps/frontend`**: Next.js (v15) と React (v19) で構築されたフロントエンドアプリケーション。TypeScript を使用。
    - **`apps/backend`**: Express.js と TypeScript で構築されたバックエンドAPIサーバー。LiquidJS をテンプレートエンジンとして利用する機能も持つ。
    - **`apps/bot`**: ボットアプリケーション用のディレクトリ。ただし `package.json` がなく、詳細は不明。
    - **`libs/`**: 共通ライブラリ用のディレクトリ。`README.md` によると `components`, `logic`, `design` を格納する想定。
- **依存関係:**
    - **Frontend:** `next`, `react`, `tailwindcss`。開発依存として `jest`, `@testing-library/react`, `playwright`, `msw` など。
    - **Backend:** `express`, `liquidjs`。開発依存として `jest`, `supertest`, `ts-node` など。
- **外部連携:**
    - フロントエンドはバックエンドAPIと通信する。
    - `netlify.toml` の存在から、Netlify へのデプロイが想定されている。

### 1-3. 既存テスト状況の確認

- **テストディレクトリ:**
    - **Frontend:** `apps/frontend/app/__tests__/` および `apps/frontend/app/components/__tests__/` に単体・コンポーネントテストが存在する。
    - **Backend:** `apps/backend/tests/` および `apps/backend/src/__tests__/` にテストファイルが存在する。
- **テストコマンド:**
    - **Frontend:** `package.json` に `test` (jest) および `test:e2e` (playwright) スクリプトが定義されている。
    - **Backend:** `package.json` に `test` (jest) スクリプトが定義されている。
- **CI/CD設定:**
    - `.github/workflows/` ディレクトリは存在しないため、GitHub Actions 等によるCI/CDパイプラインは設定されていない。

## 2. 総括

本プロジェクトは、Next.js (Frontend) と Express.js (Backend) を中心とした、テスト基盤が一定レベルで整備されているモノリポ構成のWebアプリケーションである。フロントエンドでは単体・E2Eテスト、バックエンドでは単体テストの仕組みが導入されている。一方で、CI/CDは導入されておらず、テストの自動実行やデプロイの自動化は今後の課題と推測される。
