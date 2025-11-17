# ConnectiveByte デプロイメントガイド

このドキュメントでは、ConnectiveByteウェブサイトをNetlifyにデプロイする手順を説明します。

## 📋 前提条件

- Netlifyアカウント（無料プランで可）
- GitHubリポジトリへのアクセス
- 環境変数の設定値

## 🚀 Netlifyへのデプロイ手順

### 1. Netlifyアカウントの準備

1. [Netlify](https://www.netlify.com/)にアクセス
2. GitHubアカウントでサインアップ/ログイン

### 2. 新しいサイトの作成

1. Netlifyダッシュボードで「Add new site」→「Import an existing project」をクリック
2. GitHubを選択し、リポジトリを接続
3. `connective-byte`リポジトリを選択

### 3. ビルド設定

`netlify.toml`ファイルが既に設定されているため、以下の設定が自動的に適用されます：

```toml
[build]
  command = "npm run build"
  publish = "apps/frontend/out"
  base = "/"

[build.environment]
  NODE_VERSION = "18"
```

**手動で設定する場合：**

- Base directory: `/`
- Build command: `npm run build`
- Publish directory: `apps/frontend/out`
- Node.js version: `18`

### 4. 環境変数の設定

Netlifyダッシュボードで「Site settings」→「Environment variables」に移動し、以下の環境変数を追加：

#### 必須の環境変数

```bash
NEXT_PUBLIC_SITE_URL=https://your-site.netlify.app
NEXT_PUBLIC_CONTACT_EMAIL=info@connectivebyte.com
```

#### オプションの環境変数（お問い合わせフォーム用）

メールサービスを使用する場合は、以下のいずれかを追加：

**Resendを使用する場合：**

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

**SendGridを使用する場合：**

```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
```

### 5. デプロイの実行

1. 「Deploy site」ボタンをクリック
2. ビルドログを確認
3. デプロイが完了したら、サイトURLにアクセスして動作確認

## 🔧 カスタムドメインの設定

### 1. ドメインの追加

1. Netlifyダッシュボードで「Domain settings」に移動
2. 「Add custom domain」をクリック
3. `connectivebyte.com`を入力

### 2. DNSの設定

#### Netlify DNSを使用する場合（推奨）

1. Netlifyが提供するネームサーバーをコピー
2. ドメインレジストラでネームサーバーを変更
3. DNS伝播を待つ（最大48時間）

#### 外部DNSを使用する場合

以下のレコードを追加：

```
Type: A
Name: @
Value: 75.2.60.5

Type: CNAME
Name: www
Value: your-site.netlify.app
```

### 3. HTTPSの有効化

1. DNS設定が完了したら、Netlifyが自動的にLet's Encrypt証明書を発行
2. 「HTTPS」セクションで「Force HTTPS」を有効化

## 📧 メールサービスの設定

### Resendの設定（推奨）

1. [Resend](https://resend.com/)でアカウント作成
2. APIキーを生成
3. ドメインを検証（オプション）
4. NetlifyにAPIキーを追加

### SendGridの設定

1. [SendGrid](https://sendgrid.com/)でアカウント作成
2. APIキーを生成
3. 送信者認証を設定
4. NetlifyにAPIキーを追加

## 🔍 デプロイ後の確認事項

### 必須チェック項目

- [ ] すべてのページが正しく表示される
- [ ] ナビゲーションが正常に動作する
- [ ] お問い合わせフォームが送信できる
- [ ] レスポンシブデザインが機能している
- [ ] HTTPSが有効になっている
- [ ] sitemap.xmlにアクセスできる
- [ ] robots.txtにアクセスできる

### パフォーマンスチェック

1. [PageSpeed Insights](https://pagespeed.web.dev/)でテスト
2. 目標スコア：
   - Desktop: 90以上
   - Mobile: 80以上

### SEOチェック

1. Google Search Consoleにサイトを追加
2. sitemap.xmlを送信
3. インデックス状況を確認

## 🔄 継続的デプロイメント

Netlifyは自動的に継続的デプロイメントを設定します：

- `main`ブランチへのプッシュで自動デプロイ
- プルリクエストごとにプレビューデプロイ作成
- ビルドエラー時は自動的にロールバック

### ブランチデプロイの設定

1. 「Site settings」→「Build & deploy」→「Deploy contexts」
2. プロダクションブランチを`main`に設定
3. プレビューデプロイを有効化

## 🐛 トラブルシューティング

### ビルドエラー

**エラー: `npm run build` failed**

1. ローカルで`npm run build`を実行して確認
2. Node.jsバージョンを確認（18以上）
3. 依存関係を再インストール

**エラー: Environment variable not found**

1. Netlifyの環境変数設定を確認
2. 変数名のスペルミスをチェック
3. デプロイを再実行

### フォームが送信できない

1. APIキーが正しく設定されているか確認
2. ブラウザのコンソールでエラーを確認
3. Netlify Functionsのログを確認

### 404エラー

1. `netlify.toml`のリダイレクト設定を確認
2. ビルド出力ディレクトリが正しいか確認
3. キャッシュをクリアして再デプロイ

## 📊 モニタリング

### Netlify Analytics

1. 「Analytics」タブで基本的なトラフィック情報を確認
2. ページビュー、ユニークビジター、トップページを追跡

### 外部ツール（オプション）

- **Google Analytics**: トラフィック分析
- **Sentry**: エラートラッキング
- **Hotjar**: ユーザー行動分析

## 🔐 セキュリティ

### セキュリティヘッダー

`netlify.toml`で以下のヘッダーが自動設定されます：

- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

### 定期的なセキュリティチェック

1. 依存関係の脆弱性スキャン: `npm audit`
2. セキュリティヘッダーの確認: [Security Headers](https://securityheaders.com/)
3. SSL証明書の有効期限確認（Netlifyが自動更新）

## 📞 サポート

問題が解決しない場合：

1. [Netlify Documentation](https://docs.netlify.com/)を確認
2. [Netlify Community](https://answers.netlify.com/)で質問
3. info@connectivebyte.comまでお問い合わせ

## 🎉 デプロイ完了！

おめでとうございます！ConnectiveByteウェブサイトが正常にデプロイされました。

次のステップ：

- Google Search Consoleにサイトを登録
- ソーシャルメディアでサイトを共有
- ユーザーフィードバックを収集
- Phase 2の機能開発を計画
