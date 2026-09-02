# Deployment Guide

ConnectiveByteのデプロイ実態を説明するガイド。

## 構成の概要

| コンポーネント                    | デプロイ方法                                                             | 環境     |
| --------------------------------- | ------------------------------------------------------------------------ | -------- |
| フロントエンド（`apps/frontend`） | 手動デプロイ（`npm run deploy:cf` → Cloudflare Pages、直接アップロード） | 本番のみ |
| フォームAPI（`functions/api/`）   | 同上（Cloudflare Pages Functionsとして同時デプロイ）                     | 本番のみ |
| auth API（`apps/backend`）        | 手動デプロイ（`npm run deploy:api` → Cloudflare Workers）                | 本番のみ |

- ホスティングは **Cloudflare**（Pages + Workers。Netlifyから移行。Netlifyは月枠クレジットでデプロイがブロックされたため）。Pagesの直接アップロード（`wrangler pages deploy`）はビルド数を消費しない
- ステージング環境は存在しない
- フロントエンドは静的サイト。フォームはPages Functions、auth（登録・ログイン・Google OAuth・セッション管理・マイページ）はWorkers API（`api.connectivebyte.com`）が処理する
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

## バックエンド（auth API: Cloudflare Workers）

Expressアプリ（`apps/backend`）のうち **auth + health ルートのみ**を、Cloudflare Workers（`connective-byte-api`）として `https://api.connectivebyte.com` で配信する。labモジュールとswaggerはホスト対象外。

- エントリポイント: `apps/backend/src/worker.ts`（`cloudflare:node` の `httpServerHandler` で Express を Workers 化。公式チュートリアル方式）
- 設定: `apps/backend/wrangler.toml`（`nodejs_compat` + `nodejs_compat_populate_process_env` — 既存コードの `process.env` 参照がそのまま動く）
- DB: **Neon Postgres**（フリーティア。`@neondatabase/serverless` のHTTP接続。テーブルは `npm run init:auth-db` で作成）
- メール: Resend（`ResendEmailService`。送信元 `noreply@connectivebyte.com`、ドメイン検証済み）
- パスワードハッシュ: PBKDF2-SHA256（WorkersフリープランのCPU制限10msに対しbcryptの純JS実装は超過するため。詳細は `apps/backend/src/common/utils/password.ts` のコメント）
- `DATABASE_URL` 未設定（ローカル/テスト）は JSONファイル保存 + コンソール出力メールの開発モードで動作

### 初回セットアップ（一度だけ）

1. [Neon](https://neon.tech) でアカウント＋プロジェクトを作成（無料・カード不要）し、接続文字列を `.env` の `DATABASE_URL` に設定
2. `CLOUDFLARE_API_TOKEN` に Workers 権限を追加: Account「Workers Scripts:Edit」+ Zone「Workers Routes:Edit」（+ カスタムドメイン自動作成のため Zone「DNS:Edit」）
3. テーブル作成: `npm run init:auth-db`（冪等。Stage 2 の sessions / auth_logs / oauth_accounts テーブルと users の追加カラムを含む）
4. シークレット設定:
   ```bash
   npx wrangler secret put DATABASE_URL -c apps/backend/wrangler.toml
   npx wrangler secret put JWT_SECRET -c apps/backend/wrangler.toml
   npx wrangler secret put RESEND_API_KEY -c apps/backend/wrangler.toml
   npx wrangler secret put GOOGLE_CLIENT_ID -c apps/backend/wrangler.toml
   npx wrangler secret put GOOGLE_CLIENT_SECRET -c apps/backend/wrangler.toml
   ```
   - `JWT_SECRET` は32文字未満だと起動時エラーで fail-fast
   - `GOOGLE_*` 未設定でもデプロイは可能（`/api/auth/google` は `/login/?error=oauth_unavailable` へ302）
5. `npm run deploy:api` — 初回デプロイで `api.connectivebyte.com` のカスタムドメインとDNSレコードが自動作成される（トークンにDNS:Editがない場合は `apps/backend/wrangler.toml` の `routes` をコメントアウトし、dashboard → Workers → connective-byte-api → Settings → Domains & Routes で手動追加）

### デプロイ（開発完了時に）

```bash
npm run deploy:api
```

`build:backend`（tsc で型検証）→ `wrangler deploy` まで一括実行。

CI（ci.yml）のbuildジョブがコンパイル検証とビルド成果物（artifact）の生成まで行う。

## auth Stage 2（セッション管理・Googleログイン・マイページ）

Workers API + フロント（`/login/` `/register/` `/mypage/`）で構成されるメンバー機能一式。

### トークンとCookie

- **アクセストークン**: JWT 15分。フロントはメモリのみに保持（localStorage 不使用。SSRも無し）
- **リフレッシュトークン**: 30日。httpOnly Cookie `cb_rt`（`Path=/api/auth`, `SameSite=Lax`, 本番は `Secure` + `Domain=.connectivebyte.com`）。connectivebyte.com ↔ api.connectivebyte.com は同一サイトのためLaxで送られる
- **ローテーション**: リフレッシュのたびにトークンを更新（原子UPDATE）。旧トークンの再利用を検知した時点で当該ユーザーの全セッションを失効させる
- **pages.dev プレビューは認証なし**: CORS 許可オリジンは本番ドメインと localhost のみ。pages.dev は未認証の静的プレビューとして割り切る

### Google OAuth設定（ユーザー作業）

[Google Cloud Console](https://console.cloud.google.com/) で:

1. **OAuth同意画面**: User Type「External」、アプリ名 ConnectiveByte、スコープ `openid email profile`。開発中はTestingで自身のメールをテストユーザーに追加、公開時は本番に切り替え
2. **認証情報 → OAuth client ID（Webアプリ）** にリダイレクトURIを2件登録:
   - `https://api.connectivebyte.com/api/auth/google/callback`
   - `http://localhost:3001/api/auth/google/callback`（ローカル開発用）
3. 発行された Client ID / Client Secret を `wrangler secret put`（上記手順4）

ローカル開発では `.env` に `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `OAUTH_REDIRECT_BASE=http://localhost:3001` を設定し、フロントは `NEXT_PUBLIC_API_URL=http://localhost:3001` でAPIを直指定する。

### メンテナンスCron

`apps/backend/wrangler.toml` の `[triggers] crons = ["17 19 * * *"]`（毎日04:17 JST）で期限切れセッション削除・90日超の監視ログ削除・30日猶予を過ぎたアカウント削除の匿名化処理が走る（`worker.ts` の `scheduled` ハンドラ）。Cronは初回 `deploy:api` 時に有効化される。

### デプロイ後の検証

```bash
npm run deploy:api   # backend を先に
npm run deploy:cf    # フロント（NEXT_PUBLIC_API_URL を焼き込む）
npm run smoke        # 主要ページ + API 生存・無認証401・google 302
npm run e2e:auth     # 認証フロー全体（register → ローテーション → 削除予約 → cancel → logout）
```

`e2e:auth` は実APIにテストユーザーを1件作成する（検証メールが1通飛ぶ。宛先は `@resend.dev`）。Googleログインの本番フローは実ブラウザで1往復確認する。

## Payments（Stripe受講登録・Weeks 2-12 購入ゲーティング）

SKUは **12週一括買い切り 29,800円（税込・免税事業者）** の1つのみ。決済は **Stripe Payment Link**（ダッシュボードで作成・サーバー側Checkout Session生成なし・stripe SDK依存なし）で、サーバーは Webhook で付与/取り消しを行うのみ。

- 付与: `checkout.session.completed`（`amount_total===29800 && currency==='jpy'`・`payment_status==='paid'` ガード）→ `purchases` 行 upsert（`stripe_checkout_session_id` で冪等）+ `users.purchased_at` 更新
- 取り消し: `charge.refunded` → `purchases.status='refunded'` + active購入が無ければ `users.purchased_at=NULL`
- ユーザー解決: `client_reference_id`（フロントが Payment Link に付与）→ fallback `prefilled_email`。解決不可・金額不一致は **log+200**（5xxを返すとStripeが無限リトライするため）
- ゲーティング: Week 1 無料 / Week 2+ は `GET /api/learning/sessions/:slug` と `PUT progress` が 403 `PAYMENT_001`。目次・タイトルは全員公開（セールスコピー）

### Stripe ダッシュボード設定（ユーザー作業・一度だけ）

1. **商品**: 「ConnectiveByte 12週間カリキュラム」+ Price **one-time 29,800 JPY（税込）**
2. **Payment Link 作成** → URL をフロント環境変数へ:
   - ローカル `.env`: `NEXT_PUBLIC_STRIPE_PAYMENT_LINK`（未設定だと CTA が「準備中」になり壊れた導線が出ない）
   - 本番: Cloudflare Pages の Environment variables に同じキー（`deploy:cf` のビルド時埋め込み）
3. **Webhook エンドポイント**: `https://api.connectivebyte.com/api/payments/webhook`、イベントは `checkout.session.completed` + `charge.refunded` の2つのみ
4. 発行された `whsec_…` を本番Workersへ: `npx wrangler secret put -c apps/backend/wrangler.toml STRIPE_WEBHOOK_SECRET`
   - テストモードの `whsec_` は `.env` の `STRIPE_WEBHOOK_SECRET` のみに置く（エンドポイント・モード毎に別値。本番値を `.env` に書かない）

### テストモード検証（ローカル）

```bash
npm run init:payments-db                                   # purchases テーブル + users.purchased_at
npx stripe listen --forward-to localhost:3001/api/payments/webhook   # .env のテスト用 whsec_ を標示
npm run dev                                                # フロントの CTA → 4242 4242 4242 4242 で決済
# → Stripe CLI に配送ログ / マイページ ?purchase=success でポーリング反映（3秒×最大20回）
```

### 本番リリース順序（Weeks 2-12 公開フリップが最後）

```bash
npm run init:payments-db          # 1. DB スキーマ
npx wrangler secret put -c apps/backend/wrangler.toml STRIPE_WEBHOOK_SECRET   # 2. 本番 whsec_
npm run deploy:api                # 3. backend（webhook 受付開始）
# 4. Stripe 本番 webhook エンドポイント作成（上記）
# 5. Pages に NEXT_PUBLIC_STRIPE_PAYMENT_LINK を設定
npm run deploy:cf                 # 6. フロント
npm run e2e:payments              # 7. ゲーティング・status・署名拒否・grant/revoke の通し検証
# 8. 最後に Weeks 2-12 を管理UI（/learning/admin/）で is_published=true に
#    （公開前の本番ブラウザ全文レビューはプロダクト方針で必須・content-curriculum/README.md 参照）
```

### 運用ランブック

| 状況                             | 対処                                                                                                            |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Webhook がユーザー解決に失敗した | `npx wrangler tail -c apps/backend/wrangler.toml` で `unmatched` ログ確認 → `npm run grant-purchase -- <email>` |
| 返金・振込不能で取り消したい     | `npm run grant-purchase -- <email> --revoke`（Stripe側返金とセットで。部分返金も全取り消しが仕様）              |
| 手動付与の監査                   | `purchases.stripe_checkout_session_id` が `manual_<userId>` の行が手動付与                                      |
| Stripe配送失敗が続く             | ダッシュボードの webhook delivery を確認。Workers の `!req.rawBody` ガード（400）が出ていないか tail で確認     |

`e2e:payments` は有料週の公開モジュール/セッションを一時作成して 403→grant→200→revoke→403 を検証し、最後に全削除する（実ユーザー・実購入への影響なし。Webhook署名の正常系は単体テストとローカル `stripe listen` で検証済みのため、本番e2eは署名なし400の拒否のみ確認）。

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

| 症状                                 | 確認方法                                                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| デプロイが失敗する                   | `npm run deploy:cf` の出力とCloudflareのDeployment historyを確認                                                                 |
| ローカルでビルドを再現               | `npm run build:cf` を実行してエラーを確認                                                                                        |
| ローカルでFunction含め動作確認       | リポジトリルートから `npx wrangler pages dev`（`.env` を自動読込。 Functions検出はcwd依存）                                      |
| デプロイ済みだがページが更新されない | Cloudflareのキャッシュ設定とDeployment historyを確認                                                                             |
| フォームが404/エラーになる           | `wrangler tail`（Functionのライブログ）と `RESEND_API_KEY` のVariables設定を確認                                                 |
| auth APIがエラーを返す               | `npx wrangler tail -c apps/backend/wrangler.toml`（Workersのライブログ）と `DATABASE_URL`・`JWT_SECRET` のシークレット設定を確認 |

## 旧ホスティング（Netlify）

2026年8月にCloudflare Pagesへ移行した。移行の経緯: Netlifyの月枠クレジット枯渇でデプロイがアカウントレベルでブロックされたため。旧構成（`netlify.toml`・`netlify/functions/`・`npm run deploy`）は撤去済み（git履歴で参照可能）。フォームロジックの変更は `apps/frontend/lib/api/` の共有handlerのみでよく、`functions/api/`（本番）と `app/api/`（開発）が自動的にそれを共用する。
