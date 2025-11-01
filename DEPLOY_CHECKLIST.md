# Netlify デプロイ設定完了チェックリスト

## ✅ 設定完了項目

### 1. ビルド設定

- [x] `netlify.toml` - Netlify設定ファイル作成済み
  - Base directory: `apps/frontend`
  - Publish directory: `out`
  - Build command: `npm run build`
  - Node.js version: 20

### 2. Next.js設定

- [x] `next.config.js` - 静的エクスポート設定追加済み
  - `output: 'export'` - 静的HTMLとしてエクスポート
  - `images.unoptimized: true` - 画像最適化を無効化
  - `trailingSlash: true` - URLの末尾にスラッシュを追加

### 3. セキュリティ設定

- [x] セキュリティヘッダーを`netlify.toml`に設定済み
  - X-Frame-Options
  - X-XSS-Protection
  - X-Content-Type-Options
  - Referrer-Policy

### 4. ビルドテスト

- [x] ローカルでビルドテスト実行済み
  - `npm run build` が正常に完了
  - `out` ディレクトリが正しく生成されることを確認

## 📝 次のステップ

### Netlifyへのデプロイ

1. **Netlifyにログイン**
   - https://app.netlify.com/ にアクセス

2. **新しいサイトを作成**
   - 「Add new site」→「Import an existing project」をクリック

3. **GitHubリポジトリを接続**
   - 「GitHub」を選択
   - `nobu007/connective-byte` リポジトリを選択

4. **ビルド設定を確認**
   - `netlify.toml` から自動的に設定が読み込まれます
   - 特に変更は不要です

5. **デプロイを実行**
   - 「Deploy site」ボタンをクリック
   - ビルドログを確認してエラーがないことを確認

6. **デプロイ完了後の確認**
   - 生成されたURLでサイトにアクセス
   - すべてのページが正常に表示されることを確認

## 🔧 トラブルシューティング

### ビルドが失敗する場合

```bash
# ローカルでビルドテスト
cd /home/jinno/connective-byte/apps/frontend
npm run build

# 成功する場合: Netlifyの環境変数やNode.jsバージョンを確認
# 失敗する場合: エラーメッセージを確認して修正
```

### 環境変数が必要な場合

Netlifyダッシュボードで設定：
- Site settings → Environment variables
- 必要な環境変数を追加（例: `NEXT_PUBLIC_API_URL`）

## 📚 参考ドキュメント

- [NETLIFY_DEPLOY.md](./NETLIFY_DEPLOY.md) - 詳細なデプロイガイド
- [README.md](./README.md) - プロジェクト概要

## 🎉 デプロイ準備完了！

すべての設定が完了しました。上記の手順に従ってNetlifyにデプロイしてください。

---

**最終更新**: 2025年1月1日
**ビルドテスト**: ✅ 成功
**静的エクスポート**: ✅ 正常動作確認
