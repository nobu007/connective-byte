# システム分析レポート (`SYSTEM_ANALYSIS.md`)

## 1. プロジェクト構造分析

### 1-1. リポジトリ構成

- **概要**: このリポジトリは、複数のアプリケーション、ライブラリ、ドキュメントを含むモノレポ構成です。
- **主要ディレクトリ**:
  - `apps/`: フロントエンド、バックエンドなどの個別アプリケーションを格納。
  - `docs/`: アーキテクチャ、コーディング規約などの設計ドキュメント。
  - `libs/`: 共有ライブラリ（現在は空）。
  - `shopify-theme/`: Shopifyテーマ関連のファイルを格納。
- **主要な設定ファイル**:
  - `package.json`: ルートレベルの依存関係とスクリプトを定義。
  - `netlify.toml`: Netlifyへのデプロイ設定。
  - `eslint.config.js`, `.prettierrc.json`, `.stylelintrc.json`: コード品質とフォーマットに関する設定。
- **ドキュメント**:
  - `README.md`: プロジェクト概要。
  - `TEST_PROGRESS.md`: テストの進捗状況。
  - `docs/`: 詳細な設計・仕様ドキュメント群。

### 1-2. プログラム構成（暫定）

- プロジェクトは主にJavaScript/TypeScriptで構成されていると推測されます。
- `apps`ディレクトリには、以下の3つのアプリケーションが存在します:
  - `frontend`: Next.jsベースのフロントエンドアプリケーション。
    - **Tech Stack**: Next.js, React, TypeScript, TailwindCSS.
    - **Testing**: Jest, React Testing Library, Playwright, MSW.
  - `backend`: Express.jsベースのバックエンドAPIサーバー。
    - **Tech Stack**: Express.js, TypeScript, LiquidJS.
    - **Testing**: Jest, Supertest.
  - `bot`: 詳細不明のボットアプリケーション。
- `package.json`の存在から、Node.jsベースのプロジェクトであることが確認できます。

### 1-3. 既存テスト状況（暫定）

- `TEST_PROGRESS.md`の存在から、体系的なテストが計画・実行されていることがわかります。
- これまでの対話から、`apps/frontend`ではJest（単体・統合テスト）とPlaywright（E2Eテスト）が使用されています。
- 前回のテスト実行でAPIリクエストが失敗しており、バックエンドサービスとの連携、またはテスト環境の設定に問題がある可能性が示唆されています。

## 2. 次のステップ

- `apps`ディレクトリの詳細を調査し、具体的なアプリケーション構成を特定します。
- 各アプリケーションの依存関係（`package.json`）とテスト設定を分析します。
- CI/CD設定（例: `.github/workflows/`）の有無を確認します。

### 1-4. ソースコード分析（バックエンド）

- **エントリーポイント**: `apps/backend/src/index.ts`
- **機能**: ポート`3001`で動作するExpressサーバーです。
- **APIエンドポイント**:
  - `GET /api/health`: `{ status: 'healthy' }`というJSONを返すヘルスチェック機能。

### 1-5. 根本原因分析（性能テスト失敗）

- **事象**: Playwrightによる性能テストが`response.ok()`の検証で失敗していました。
- **原因**: フロントエンド（Next.js on port 3000）からバックエンド（Express on port 3001）へのAPIプロキシ設定がありませんでした。そのため、テストが発行した`http://localhost:3000/api/health`リクエストは404 Not Foundとなり、テストが失敗していました。

## 1. プロジェクト概要

- **リポジトリ**: `connective-byte`
- **構成**: モノレポ
- **主要技術**: TypeScript, Next.js, Express.js
- **デプロイ**: Netlify

## 2. リポジトリ構成

プロジェクトルートの主要なディレクトリとファイルは以下の通りです。

```
connective-byte/
├── apps/                  # 各アプリケーション
│   ├── frontend/        # Next.jsによるフロントエンド
│   ├── backend/         # Express.jsによるバックエンドAPI
│   └── bot/             # チャットボット（未実装）
├── docs/                  # ドキュメント
├── libs/                  # 共通ライブラリ（現状は空）
├── netlify.toml           # Netlifyデプロイ設定
└── package.json           # ルートのパッケージ管理
```

- **設定ファイル**: 各アプリケーション（`apps/*`）内に個別に配置されています。
- **スクリプト**: 各アプリケーションの`package.json`に定義されています。
- **CI/CD**: `.github/workflows`は存在せず、`netlify.toml`によってNetlifyでの自動ビルド・デプロイが構成されています。

## 3. エージェント（アプリケーション）構成

### 3.1. `apps/frontend`

- **役割**: ユーザー向けWebアプリケーション
- **フレームワーク**: Next.js
- **言語**: TypeScript
- **テスト**: Jestが導入されており、`npm test`で実行可能です。(`jest.config.mjs`, `jest.setup.ts`が存在)

### 3.2. `apps/backend`

- **役割**: APIサーバー
- **フレームワーク**: Express.js
- **言語**: TypeScript
- **テスト**: `package.json`にテスト関連のスクリプトや依存関係は見当たらず、テストは未構成の状態と推測されます。

### 3.3. `apps/bot`

- **役割**: チャットボット
- **状況**: ディレクトリは存在するものの、中身は空です。アプリケーションは計画段階であり、未実装です。

## 4. 既存テスト状況のまとめ

- **フロントエンド**: Jestによる単体・コンポーネントテストの基盤が存在します。カバレッジ等の具体的な品質指標は現時点では不明です。
- **バックエンド**: テストフレームワークの導入やテストコードは見当たらず、品質保証が今後の課題です。
- **統合テスト**: フロントエンドとバックエンドを連携させたテストの仕組みは存在しません。

## 5. 総括

本システムは、Next.jsとExpress.jsを中核としたモダンなWebアプリケーションですが、特にバックエンドとエージェント間連携におけるテストが不足しています。今後の開発では、品質保証体制の強化が重要な課題となります。
