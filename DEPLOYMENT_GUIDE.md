# Deployment Guide

ConnectiveByteのデプロイ実態を説明するガイド。

## 構成の概要

| コンポーネント                    | デプロイ方法                                                             | 環境     |
| --------------------------------- | ------------------------------------------------------------------------ | -------- |
| フロントエンド（`apps/frontend`） | 手動デプロイ（`npm run deploy:cf` → Cloudflare Pages、直接アップロード） | 本番のみ |
| フォームAPI（`functions/api/`）   | 同上（Cloudflare Pages Functionsとして同時デプロイ）                     | 本番のみ |
| バックエンド（`apps/backend`）    | 自動デプロイなし（手動）                                                 | なし     |

- ホスティングは **Cloudflare Pages**（Netlifyから移行。Netlifyは月枠クレジットでデプロイがブロックされたため）。直接アップロード（`wrangler pages deploy`）はビルド数を消費しない
- ステージング環境は存在しない
- フロントエンドはバックエンドを呼び出さない（静的サイトとして完結）
- フォームAPI（`/api/newsletter`・`/api/contact`）は本番ではPages Functions（`functions/api/`）が処理する（静的エクスポートはPOSTルートを配信できないため）。ロジックは `apps/frontend/lib/api/` のハンドラに集約され、開発用ルート（`app/api/`）と本番用Functionが共用する

## 前提

- Node.js 20.x以上
- npm 10.x以上

## 手動デプロイ（標準フロー）

pushごとの自動ビルドは行わない。開発が一段落したタイミングで手動デプロイする。

### 初回セットアップ（一度だけ）

1. Cloudflareアカウントを作成（無料枠で商用利用可。直接アップロードはビルド数ノーカウント）
2. `.env` に以下を設定:
   - `CLOUDFLARE_API_TOKEN` — Cloudflare → My Profile → API Tokens → Create Token（テンプレート「Edit Cloudflare Pages」で作成）
   - （`RESEND_API_KEY` / `RESEND_AUDIENCE_ID` — フォーム・ニュースレター用）
3. 本番環境変数の設定（Functionが `RESEND_API_KEY` 等を読めるようにする）:
   ```bash
   npx wrangler pages secret put RESEND_API_KEY --project-name connective-byte
   npx wrangler pages secret put RESEND_AUDIENCE_ID --project-name connective-byte
   ```
   または dashboard → Workers & Pages → connective-byte → Settings → Variables
4. `npm run env:check` — 設定の検証（RESEND_API_KEYは読み取り専用API呼び出しで有効性確認）
5. カスタムドメイン: dashboard → connective-byte → Custom domains → connectivebyte.com を追加し、DNS側に `CNAME → connective-byte.pages.dev` を設定

### デプロイ（開発完了時に）

```bash
npm run deploy:cf
```

`next build`（`.env` の `NEXT_PUBLIC_*` を埋め込む）→ `_redirects` のNetlify用リライト除去（`scripts/prepare-cloudflare.mjs`）→ `out/` と `functions/` をCloudflare本番へ直接アップロード、まで一括実行。

`.env` の環境変数を変更したときは手順3の `wrangler pages secret put` を再実行する。

## フロントエンド デプロイ

手動デプロイ（上記の標準フロー）のみを使う。フォームAPIは `functions/api/newsletter.ts`・`functions/api/contact.ts` が `/api/newsletter`・`/api/contact` として直接配信される（Pages Functionsのパス規約。リダイレクト不要）。

### wrangler.tomlの設定

`wrangler.toml` で以下を定義済み:

- プロジェクト名: `connective-byte`
- 公開ディレクトリ: `apps/frontend/out`
- 互換性フラグ: `nodejs_compat`（共有handlerが `process.env` を使用するため）
- セキュリティヘッダー・アセットキャッシュ: `apps/frontend/public/_headers`（`out/` に焼き込まれ、Cloudflareも同じ形式を解釈する）

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

1. Cloudflareダッシュボード → connective-byte → Deployment history で以前の正常なデプロイを選択
2. 「Rollback to this deployment」をクリック

## トラブルシューティング

| 症状                                 | 確認方法                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| デプロイが失敗する                   | `npm run deploy:cf` の出力とCloudflareのDeployment historyを確認                            |
| ローカルでビルドを再現               | `npm run build:cf` を実行してエラーを確認                                                   |
| ローカルでFunction含め動作確認       | リポジトリルートから `npx wrangler pages dev`（`.env` を自動読込。 Functions検出はcwd依存） |
| デプロイ済みだがページが更新されない | Cloudflareのキャッシュ設定とDeployment historyを確認                                        |
| フォームが404/エラーになる           | `wrangler tail`（Functionのライブログ）と `RESEND_API_KEY` のVariables設定を確認            |

## 旧ホスティング（Netlify）

2026年8月にCloudflare Pagesへ移行した。移行の経緯: Netlifyの月枠クレジット枯渇でデプロイがアカウントレベルでブロックされたため。旧構成（`netlify.toml`・`netlify/functions/`・`npm run deploy`）は参照用に残しているが、`netlify/functions` はメンテナンスされていない場合があり、フォームロジックの変更は `apps/frontend/lib/api/` の共有handlerと `functions/api/` の両方に反映すること。
