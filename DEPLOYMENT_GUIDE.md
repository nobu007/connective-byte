# Deployment Guide

ConnectiveByteのデプロイ実態を説明するガイド。

## 構成の概要

| コンポーネント                     | デプロイ方法                                 | 環境     |
| ---------------------------------- | -------------------------------------------- | -------- |
| フロントエンド（`apps/frontend`）  | GitHub Actions → Netlify（静的エクスポート） | 本番のみ |
| フォームAPI（`netlify/functions`） | 同上（Netlify Functionsとして同時デプロイ）  | 本番のみ |
| バックエンド（`apps/backend`）     | 自動デプロイなし（手動）                     | なし     |

- フロントエンドは `main` ブランチへのpushで自動デプロイされる
- ステージング環境は存在しない
- フロントエンドはバックエンドを呼び出さない（静的サイトとして完結）
- フォームAPI（`/api/newsletter`・`/api/contact`）は本番ではNetlify Functionsが処理する（静的エクスポートはPOSTルートを配信できないため）。ロジックは `apps/frontend/lib/api/` のハンドラに集約され、開発用ルート（`app/api/`）と本番用Functionが共用する

## 前提

- Node.js 20.x以上
- npm 10.x以上

## GitHub Secrets

Settings → Secrets and variables → Actions で以下を設定：

### 必須

```
NETLIFY_AUTH_TOKEN=<Netlifyのパーソナルアクセストークン>
NETLIFY_SITE_ID=<NetlifyサイトID>
```

### 任意

```
PRODUCTION_FRONTEND_URL=https://connectivebyte.netlify.app
```

デプロイ後のヘルスチェックとロールバック検証に使用される。未設定の場合は上記デフォルト値が使われる。

## フロントエンド デプロイ

### 自動デプロイ

1. `main` にpushすると `Deploy to Production`（deploy.yml）が実行される
2. `npm run build:frontend` で静的エクスポート（`apps/frontend/out/`）を生成
3. 静的ファイルとNetlify Functions（`netlify/functions/`）をNetlifyへ本番アップロード
4. 30秒後、本番URLのHTTP 200をヘルスチェック

フォームAPIは `public/_redirects` の強制リダイレクトで `/api/newsletter`・`/api/contact` → Netlify Functionsへ振り分けられる。

### 手動デプロイ

```bash
npm run build:frontend
cd apps/frontend
npx netlify deploy --prod --dir=out
```

### Netlify側の設定

`netlify.toml` で以下を定義済み：

- ビルドコマンド: `npm run build:netlify`（フロントエンドのみ、Node.js 20）
- 公開ディレクトリ: `apps/frontend/out`
- セキュリティヘッダー・アセットキャッシュ

Netlifyダッシュボードで設定する環境変数（`RESEND_API_KEY` など）は [NETLIFY_DEPLOY.md](./NETLIFY_DEPLOY.md) を参照。

## バックエンド

現在どこにもホストされていない。必要になった時点で手動デプロイする：

1. `npm run build:backend`（`apps/backend/dist/` に出力）
2. サーバーに `dist/` と `package.json` を配置し `npm ci --omit=dev`
3. 環境変数を設定（`PORT`、`DATABASE_URL`、`JWT_SECRET` など）
4. `node dist/index.js` で起動（pm2等のプロセスマネージャーを推奨）

CI（ci.yml）のbuildジョブがコンパイル検証とビルド成果物（artifact）の生成まで行う。

## CI/CDワークフロー

| ワークフロー | トリガー              | 内容                                                  |
| ------------ | --------------------- | ----------------------------------------------------- |
| ci.yml       | push / PR to `main`   | lint・型チェック・単体テスト（FE/BE）・E2E・ビルド    |
| deploy.yml   | push to `main` / 手動 | フロントエンドをNetlifyへ本番デプロイ＋ヘルスチェック |
| rollback.yml | 手動のみ              | 過去コミットを再ビルドしてNetlifyへ本番デプロイ       |
| security.yml | push / PR / 毎週月曜  | npm audit・CodeQL・TruffleHog                         |

## ロールバック

### Netlifyダッシュボード（最速）

1. Deploysタブで以前の正常なデプロイを選択
2. 「Publish deploy」をクリック

### GitHub Actions

Actions → Rollback Deployment → Run workflow でコミットSHAを指定（空欄なら1つ前のコミットにロールバック）。

## トラブルシューティング

| 症状                                 | 確認方法                                                        |
| ------------------------------------ | --------------------------------------------------------------- |
| デプロイが失敗する                   | GitHub Actionsのログを確認                                      |
| ローカルでビルドを再現               | `npm run build:frontend` を実行してエラーを確認                 |
| デプロイ済みだがページが更新されない | NetlifyのDeploysタブでデプロイ状態とキャッシュを確認            |
| ヘルスチェックが失敗する             | `PRODUCTION_FRONTEND_URL` の設定値、またはNetlify側の状態を確認 |
