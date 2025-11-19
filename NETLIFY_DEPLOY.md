# Netlifyへのデプロイガイド

このドキュメントでは、ConnectiveByteプロジェクトをNetlifyにデプロイする手順を説明します。

## 🚀 デプロイ手順

### 1. Netlifyアカウントの準備

1. [Netlify](https://www.netlify.com/)にアクセスしてアカウントを作成（GitHubアカウントでログイン推奨）

### 2. リポジトリの接続

1. Netlifyダッシュボードで「Add new site」→「Import an existing project」を選択
2. GitHubリポジトリ `nobu007/connective-byte` を選択
3. ビルド設定は自動で`netlify.toml`から読み込まれます

### 3. ビルド設定の確認

以下の設定が自動的に適用されます（`netlify.toml`から）：

- **Base directory**: `apps/frontend`
- **Build command**: `npm run build`
- **Publish directory**: `apps/frontend/out`
- **Node.js version**: 20

### 4. 環境変数の設定

Netlifyダッシュボードの「Site settings」→「Environment variables」で以下を設定：

#### 必須の環境変数

```bash
# サイトURL
NEXT_PUBLIC_SITE_URL=https://connectivebyte.com

# お問い合わせメールアドレス
NEXT_PUBLIC_CONTACT_EMAIL=info@connectivebyte.com

# メール送信サービス（Resend）
RESEND_API_KEY=re_your_api_key_here
RESEND_AUDIENCE_ID=your_audience_id_here
```

#### アナリティクス設定（推奨）

```bash
# Plausible Analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=connectivebyte.com
NEXT_PUBLIC_PLAUSIBLE_API_HOST=https://plausible.io
```

**注意**: `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`を設定しない場合、アナリティクスは無効化されます。

#### 環境変数の設定手順

1. Netlifyダッシュボードで「Site settings」を開く
2. 左メニューから「Environment variables」を選択
3. 「Add a variable」をクリック
4. 変数名と値を入力
5. 「Create variable」をクリック

詳細な設定方法は以下のガイドを参照してください：

- [Plausible Setup Guide](apps/frontend/docs/plausible-setup.md)
- [Newsletter Setup Guide](docs/newsletter-setup.md)

### 5. デプロイの実行

1. 「Deploy site」ボタンをクリック
2. ビルドログを確認してエラーがないことを確認
3. デプロイ完了後、生成されたURLでサイトにアクセス

## 📝 重要な設定内容

### Next.js 静的エクスポート設定

`apps/frontend/next.config.ts`で以下を設定済み：

```typescript
const nextConfig: NextConfig = {
  output: 'export', // 静的HTMLとしてエクスポート
  images: {
    unoptimized: true, // 画像最適化を無効化
  },
  trailingSlash: true, // URLの末尾にスラッシュを追加
};
```

### セキュリティヘッダー

`netlify.toml`でセキュリティヘッダーを設定済み：

- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

## 🔄 自動デプロイ

mainブランチへのpushで自動的にデプロイされます：

```bash
git add .
git commit -m "Update: feature implementation"
git push origin main
```

## 🐛 トラブルシューティング

### ビルドエラーが発生する場合

1. **依存関係のインストールエラー**

   ```bash
   # ローカルで確認
   cd apps/frontend
   npm install
   npm run build
   ```

2. **TypeScriptエラー**

   ```bash
   npm run type-check
   ```

3. **Lintエラー**
   ```bash
   npm run lint
   ```

### デプロイ後にページが表示されない

1. Netlifyのビルドログを確認
2. `out`ディレクトリが正しく生成されているか確認
3. リダイレクト設定が正しいか確認

### 画像が表示されない

静的エクスポート時はNext.jsの画像最適化が使えません。
`next/image`を使用している場合は`unoptimized: true`が設定されているか確認してください。

## 📊 パフォーマンス最適化

### ビルド時間の短縮

```toml
[build]
  # 依存関係のキャッシュを有効化
  [build.processing]
    skip_processing = false
```

### カスタムドメインの設定

1. Netlifyダッシュボードで「Domain settings」を開く
2. 「Add custom domain」でドメインを追加
3. DNS設定を更新

## 🔒 プライベートリポジトリの場合

GitHubの private リポジトリの場合：

1. Netlifyのプランを確認（Proプラン以上が必要）
2. リポジトリのアクセス権限を確認

## 📚 参考リンク

- [Netlify Documentation](https://docs.netlify.com/)
- [Next.js Static Exports](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Netlify + Next.js](https://docs.netlify.com/frameworks/next-js/overview/)

## ✅ デプロイチェックリスト

- [ ] `netlify.toml`の設定確認
- [ ] `next.config.ts`の静的エクスポート設定確認
- [ ] ローカルで`npm run build`が成功することを確認
- [ ] 環境変数の設定
  - [ ] `NEXT_PUBLIC_SITE_URL`
  - [ ] `NEXT_PUBLIC_CONTACT_EMAIL`
  - [ ] `RESEND_API_KEY`（メール送信用）
  - [ ] `RESEND_AUDIENCE_ID`（ニュースレター用）
  - [ ] `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`（アナリティクス用）
- [ ] Resendアカウントの設定（ニュースレターを使用する場合）
  - [ ] オーディエンスの作成
  - [ ] 送信ドメインの認証
- [ ] Plausible Analyticsアカウントの設定（アナリティクスを使用する場合）
- [ ] カスタムドメインの設定（必要な場合）
- [ ] デプロイ後の動作確認
- [ ] セキュリティヘッダーの確認
- [ ] アナリティクスの動作確認（Plausibleダッシュボードでイベント確認）

## 🎉 デプロイ完了後

デプロイが完了したら、以下を確認してください：

1. ✅ サイトが正常に表示されるか
2. ✅ ページ遷移が正常に動作するか
3. ✅ 画像やアセットが正しく読み込まれるか
4. ✅ レスポンシブデザインが機能しているか
5. ✅ SEO設定（メタタグなど）が正しいか
6. ✅ お問い合わせフォームが動作するか
7. ✅ ニュースレター登録フォームが動作するか
8. ✅ アナリティクスが正しく動作しているか（Plausibleダッシュボードで確認）

Happy Deploying! 🚀
