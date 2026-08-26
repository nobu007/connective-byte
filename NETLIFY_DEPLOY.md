# Netlifyへのデプロイガイド（旧ホスティング）

> **2026年8月にCloudflare Pagesへ移行済み**。現行の手順は [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)（`npm run deploy:cf`）。本書はNetlify固有の参照用メモ。

クレジット枯渇でNetlifyの新規デプロイがブロックされたため移行した。参考として当時のNetlify固有の補足を残す。

手順・初回セットアップ・トラブルシューティングは [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) に集約している。この文書ではNetlify固有の補足のみ記載する。

## 環境変数

Netlify UIで手動設定せず `npm run deploy:env`（`.env` → サイトの環境変数へ一括取り込み）を使う。設定する変数の一覧はルートの `.env.example` を参照。

## ビルド設定（netlify.toml）

`netlify.toml` で以下を定義済み:

- **Build command**: `npm run build:netlify`
- **Publish directory**: `apps/frontend/out`
- **Functions directory**: `netlify/functions`
- **Node.js version**: 20

手動デプロイ（`npm run deploy`）では `out/` と `netlify/functions/` を直接アップロードするため、このビルド設定は使われない。Git連携を再有効化した場合にのみ適用される。

## カスタムドメインの設定

1. Netlifyダッシュボードの「Domain settings」を開く
2. 「Add custom domain」でドメインを追加
3. DNS設定を更新

## Resend（フォーム・ニュースレター）

- `RESEND_API_KEY` — APIキー（`npm run env:check` で有効性を検証できる）
- `RESEND_AUDIENCE_ID` — ニュースレター用オーディエンスID（Resend → Audiences で作成）
- 送信元ドメインはResendで検証済みである必要がある（Resend → Domains）。未検証ドメインからの送信は拒否される

## デプロイチェックリスト

- [ ] `npm run env:check` がすべて ✅
- [ ] `.env` 変更済みなら `npm run deploy:env` を実行
- [ ] `npm run deploy` が成功
- [ ] フォーム・ニュースレターの動作確認（本番URLで送信テスト）

## 参考リンク

- [Netlify Documentation](https://docs.netlify.com/)
- [Next.js Static Exports](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
