# Deployment Guide

ConnectiveByteのデプロイ実態を説明するガイド。

## 構成の概要

| コンポーネント                     | デプロイ方法                                  | 環境     |
| ---------------------------------- | --------------------------------------------- | -------- |
| フロントエンド（`apps/frontend`）  | Netlify Git連携（pushで自動ビルド・デプロイ） | 本番のみ |
| フォームAPI（`netlify/functions`） | 同上（Netlify Functionsとして同時デプロイ）   | 本番のみ |
| バックエンド（`apps/backend`）     | 自動デプロイなし（手動）                      | なし     |

- フロントエンドは `main` ブランチへのpushでNetlifyが自動ビルド・デプロイする（Netlify標準のGitインテグレーション。GitHub Actionsは不使用）
- ステージング環境は存在しない（PRごとのDeploy PreviewがNetlify側で自動生成される）
- フロントエンドはバックエンドを呼び出さない（静的サイトとして完結）
- フォームAPI（`/api/newsletter`・`/api/contact`）は本番ではNetlify Functionsが処理する（静的エクスポートはPOSTルートを配信できないため）。ロジックは `apps/frontend/lib/api/` のハンドラに集約され、開発用ルート（`app/api/`）と本番用Functionが共用する

## 前提

- Node.js 20.x以上
- npm 10.x以上

## Netlify Git連携の設定（一度だけ）

1. Netlifyダッシュボードで **Add new site → Import an existing project → GitHub**
2. `connective-byte` リポジトリを選択
3. ビルド設定は `netlify.toml` から自動読み込みされる（手入力不要）

設定後は `main` へのpushごとに自動デプロイされる。GitHub側のsecrets設定は不要。

Netlifyダッシュボードで設定する環境変数（`RESEND_API_KEY` など）は [NETLIFY_DEPLOY.md](./NETLIFY_DEPLOY.md) を参照。

## フロントエンド デプロイ

### 自動デプロイ（標準）

1. `main` にpushするとNetlifyが変更を検知してビルドを開始
2. `netlify.toml` の設定で `npm run build:netlify`（Node.js 20）を実行し静的エクスポート（`apps/frontend/out/`）を生成
3. 静的ファイルとNetlify Functions（`netlify/functions/`）が本番に公開される

フォームAPIは `public/_redirects` の強制リダイレクトで `/api/newsletter`・`/api/contact` → Netlify Functionsへ振り分けられる。

### 手動デプロイ（Git連携を使わない緊急時）

```bash
npm run build:frontend
cd apps/frontend
npx netlify deploy --prod --dir=out
```

### Netlify側の設定

`netlify.toml` で以下を定義済み：

- ビルドコマンド: `npm run build:netlify`（フロントエンドのみ、Node.js 20）
- 公開ディレクトリ: `apps/frontend/out`
- Functionsディレクトリ: `netlify/functions`
- セキュリティヘッダー・アセットキャッシュ

## バックエンド

現在どこにもホストされていない。必要になった時点で手動デプロイする：

1. `npm run build:backend`（`apps/backend/dist/` に出力）
2. サーバーに `dist/` と `package.json` を配置し `npm ci --omit=dev`
3. 環境変数を設定（`PORT`、`DATABASE_URL`、`JWT_SECRET` など）
4. `node dist/index.js` で起動（pm2等のプロセスマネージャーを推奨）

CI（ci.yml）のbuildジョブがコンパイル検証とビルド成果物（artifact）の生成まで行う。

## CI/CDワークフロー（GitHub Actions）

| ワークフロー | トリガー             | 内容                                               |
| ------------ | -------------------- | -------------------------------------------------- |
| ci.yml       | push / PR to `main`  | lint・型チェック・単体テスト（FE/BE）・E2E・ビルド |
| security.yml | push / PR / 毎週月曜 | npm audit・CodeQL・TruffleHog                      |

デプロイ自体はGitHub Actionsで行わない（Netlify Git連携が担当）。

## ロールバック

1. Netlifyダッシュボードの Deploys タブで以前の正常なデプロイを選択
2. 「Publish deploy」をクリック

## トラブルシューティング

| 症状                                 | 確認方法                                                       |
| ------------------------------------ | -------------------------------------------------------------- |
| デプロイが失敗する                   | NetlifyのDeploysタブでビルドログを確認                         |
| ローカルでビルドを再現               | `npm run build:netlify` を実行してエラーを確認                 |
| デプロイ済みだがページが更新されない | NetlifyのDeploysタブでデプロイ状態とキャッシュを確認           |
| フォームが404/エラーになる           | Functionsログ（Netlify → Functions）と `RESEND_API_KEY` を確認 |
