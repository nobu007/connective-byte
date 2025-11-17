# ConnectiveByte Website

ConnectiveByteの公式ウェブサイト - AI時代の知的共創圏

## 🎯 プロジェクト概要

ConnectiveByteは、「理解されない孤独を吹き飛ばして、AI活用と思考連携で協創リーダーになる」をビジョンに掲げる、次世代の学びと協創の場を提供するプラットフォームです。

### 核心的価値

- **Connect（接続）**: 知識・人・AI・時代をつなぐ結節点
- **Active（主体性）**: 情報判断力と能動的アウトプット力
- **Collective（協創）**: 個人成長→他者貢献→集合知社会

## 🚀 技術スタック

- **Framework**: Next.js 15.3.3 (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Deployment**: Netlify (Static Export)

## 📦 プロジェクト構造

```
apps/frontend/
├── app/                    # Next.js App Router
│   ├── page.tsx           # ホームページ
│   ├── about/             # Aboutページ
│   ├── contact/           # お問い合わせページ
│   ├── privacy/           # プライバシーポリシー
│   └── api/               # APIルート
├── components/            # Reactコンポーネント
│   ├── layout/           # レイアウトコンポーネント
│   ├── sections/         # セクションコンポーネント
│   ├── ui/               # UIコンポーネント
│   └── forms/            # フォームコンポーネント
├── content/              # コンテンツJSON
├── lib/                  # ユーティリティ
├── hooks/                # カスタムフック
├── types/                # TypeScript型定義
└── public/               # 静的ファイル
```

## 🛠️ 開発環境セットアップ

### 前提条件

- Node.js 18以上
- npm

### インストール

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

開発サーバーは http://localhost:3000 で起動します。

### 利用可能なコマンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # 本番ビルド
npm run start        # 本番サーバー起動
npm run lint         # ESLint実行
npm run type-check   # TypeScript型チェック
npm run format       # Prettierでコード整形
npm run test         # Jestテスト実行
npm run test:e2e     # Playwrightテスト実行
```

## 🌍 環境変数

`.env.example`を`.env.local`にコピーして、必要な環境変数を設定してください。

```bash
# サイト設定
NEXT_PUBLIC_SITE_URL=https://connectivebyte.com
NEXT_PUBLIC_CONTACT_EMAIL=info@connectivebyte.com

# メールサービス（オプション）
RESEND_API_KEY=your_api_key_here
```

## 📝 コンテンツ管理

コンテンツは`content/`ディレクトリのJSONファイルで管理されています：

- `homepage.json` - ホームページのコンテンツ
- `about.json` - Aboutページのコンテンツ
- `site-config.ts` - サイト全体の設定

コンテンツを更新する場合は、これらのファイルを編集してください。

## 🎨 デザインシステム

デザイントークンは`config/design-tokens.ts`で定義されています：

- **カラーパレット**: Deep Blue, Tech Green, Bright Orange, Vivid Purple
- **タイポグラフィ**: Inter + Noto Sans JP
- **スペーシング**: 8px基準のスケール
- **ブレークポイント**: 320px, 768px, 1024px, 1280px

## ♿ アクセシビリティ

- WCAG 2.1 Level AA準拠
- キーボードナビゲーション対応
- スクリーンリーダー対応
- 適切なARIA属性の使用
- 色のコントラスト比確保

## 🚀 デプロイメント

### Netlifyへのデプロイ

1. Netlifyアカウントにログイン
2. リポジトリを接続
3. ビルド設定:
   - Build command: `npm run build`
   - Publish directory: `apps/frontend/out`
4. 環境変数を設定
5. デプロイ

詳細は`netlify.toml`を参照してください。

## 📊 パフォーマンス

- First Load JS: 337KB (ホームページ)
- 静的エクスポート対応
- 画像最適化対応
- コード分割実装済み

## 🧪 テスト

```bash
# ユニットテスト
npm run test

# E2Eテスト
npm run test:e2e

# カバレッジ付きテスト
npm run test -- --coverage
```

## 📄 ライセンス

© 2024 ConnectiveByte. All rights reserved.

## 🤝 コントリビューション

このプロジェクトは現在プライベートです。質問や提案がある場合は、info@connectivebyte.comまでお問い合わせください。

## 📞 サポート

- Email: info@connectivebyte.com
- Twitter: [@connectivebyte](https://twitter.com/connectivebyte)
- Threads: [@connectivebyte](https://threads.net/@connectivebyte)
