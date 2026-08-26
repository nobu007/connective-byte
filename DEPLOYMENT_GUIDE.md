# Deployment Guide

ConnectiveByteのデプロイ実態を説明するガイド。

## 構成の概要

| コンポーネント                     | デプロイ方法                                                         | 環境     |
| ---------------------------------- | -------------------------------------------------------------------- | -------- |
| フロントエンド（`apps/frontend`）  | 手動デプロイ（`npm run deploy`、クレジット節約のため自動ビルドなし） | 本番のみ |
| フォームAPI（`netlify/functions`） | 同上（Netlify Functionsとして同時デプロイ）                          | 本番のみ |
| バックエンド（`apps/backend`）     | 自動デプロイなし（手動）                                             | なし     |

- フロントエンドは `npm run deploy` で手動デプロイする（Netlifyの月枠クレジット節約のため自動ビルドは使わない）
- ステージング環境は存在しない
- フロントエンドはバックエンドを呼び出さない（静的サイトとして完結）
- フォームAPI（`/api/newsletter`・`/api/contact`）は本番ではNetlify Functionsが処理する（静的エクスポートはPOSTルートを配信できないため）。ロジックは `apps/frontend/lib/api/` のハンドラに集約され、開発用ルート（`app/api/`）と本番用Functionが共用する

## 前提

- Node.js 20.x以上
- npm 10.x以上

## 手動デプロイ（標準フロー）

Netlifyの月枠クレジット節約のため、pushごとの自動ビルドは行わない。開発が一段落したタイミングで手動デプロイする。

### 初回セットアップ（一度だけ）

1. `.env` に以下を設定:
   - `NETLIFY_AUTH_TOKEN` — Netlify → User settings → Applications → New token
   - `NETLIFY_SITE_ID` — Netlify → Project configuration → General → Project details → Project information → Project ID（UUID形式。Project ID = API の site_id = 環境変数 NETLIFY_SITE_ID はすべて同じ識別子）
   - （`RESEND_API_KEY` / `RESEND_AUDIENCE_ID` — フォーム・ニュースレター用）
2. `npm run deploy:env` — `.env` の内容をNetlifyサイトの環境変数へ取り込み（本番Functionが `RESEND_API_KEY` 等を読めるようになる）
3. `npm run env:check` — 設定の検証（RESEND_API_KEYは読み取り専用API呼び出しで有効性確認）

### デプロイ（開発完了時に）

```bash
npm run deploy
```

`next build`（`.env` の `NEXT_PUBLIC_*` を埋め込む）→ `out/` と `netlify/functions/` をNetlify本番へアップロード、まで一括実行。

`.env` の環境変数を変更したときは `npm run deploy:env` を再実行する。

### Git連携を使わない

pushごとの自動ビルドはビルドクレジットを消費するため使わない。もし過去にNetlify側でGitHub連携を設定済みなら、Site settings → Build & deploy で連携を解除（または builds を stop）すること。

## フロントエンド デプロイ

手動デプロイ（上記の標準フロー）のみを使う。フォームAPIは `public/_redirects` の強制リダイレクトで `/api/newsletter`・`/api/contact` → Netlify Functionsへ振り分けられる。

### netlify.tomlの設定

`netlify.toml` で以下を定義済み（Git連携のビルドを再有効化した場合に適用される。手動デプロイでは `npm run deploy` が同等の内容を直接アップロードする）：

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

デプロイ自体はGitHub Actionsで行わない（`npm run deploy` の手動実行）。

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
