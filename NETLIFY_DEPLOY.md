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

### 4. 環境変数の設定（必要に応じて）

Netlifyダッシュボードの「Site settings」→「Environment variables」で設定：

```bash
# 例：バックエンドAPIのURL
NEXT_PUBLIC_API_URL=https://your-api-endpoint.com
```

### 5. デプロイの実行

1. 「Deploy site」ボタンをクリック
2. ビルドログを確認してエラーがないことを確認
3. デプロイ完了後、生成されたURLでサイトにアクセス

## 📝 重要な設定内容

### Next.js 静的エクスポート設定

`apps/frontend/next.config.ts`で以下を設定済み：

```typescript
const nextConfig: NextConfig = {
  output: 'export',        // 静的HTMLとしてエクスポート
  images: {
    unoptimized: true,     // 画像最適化を無効化
  },
  trailingSlash: true,     // URLの末尾にスラッシュを追加
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
- [ ] 環境変数の設定（必要な場合）
- [ ] カスタムドメインの設定（必要な場合）
- [ ] デプロイ後の動作確認
- [ ] セキュリティヘッダーの確認

## 🎉 デプロイ完了後

デプロイが完了したら、以下を確認してください：

1. ✅ サイトが正常に表示されるか
2. ✅ ページ遷移が正常に動作するか
3. ✅ 画像やアセットが正しく読み込まれるか
4. ✅ レスポンシブデザインが機能しているか
5. ✅ SEO設定（メタタグなど）が正しいか

Happy Deploying! 🚀
