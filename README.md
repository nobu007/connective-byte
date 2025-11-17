# ConnectiveByte

**個を超え、知が立ち上がる場所 - AI時代の知的共創圏**

ConnectiveByteは、「理解されない孤独を吹き飛ばして、AI活用と思考連携で協創リーダーになる」をビジョンに掲げる、次世代の学びと協創の場を提供するプラットフォームです。

## 🎯 核心的価値

- **Connect（接続）**: 知識・人・AI・時代をつなぐ結節点
- **Active（主体性）**: 情報判断力と能動的アウトプット力
- **Collective（協創）**: 個人成長→他者貢献→集合知社会

## ✨ 特徴

- **接続性**: あらゆるコンポーネントが緊密に連携し、シームレスな統合を実現
- **拡張性**: モジュラー設計による容易な機能拡張
- **保守性**: クリーンアーキテクチャと明確な責務分離による高い保守性
- **アクセシビリティ**: WCAG 2.1 Level AA準拠の包括的なアクセシビリティ

## 🛠️ 技術スタック

### フロントエンド (apps/frontend)

- **Framework**: [Next.js 15](https://nextjs.org/) (with React 19)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Testing**: [Jest](https://jestjs.io/), [Playwright](https://playwright.dev/)
- **Lint/Format**: [ESLint](https://eslint.org/), [Prettier](https://prettier.io/)

### バックエンド (apps/backend)

- **Framework**: [Express.js](https://expressjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Runtime**: [Node.js](https://nodejs.org/)
- **Template Engine**: [LiquidJS](https://liquidjs.com/)

## 🎯 プロジェクトの哲学

- **接続性**: あらゆるコンポーネントが緊密に連携し、シームレスな統合を実現
- **拡張性**: モジュラー設計による容易な機能拡張
- **保守性**: クリーンアーキテクチャと明確な責務分離による高い保守性

## 🏗️ プロジェクト構造

```
ConnectiveByte/
├── apps/
│   ├── frontend/    # Next.jsによるフロントエンドアプリケーション
│   ├── backend/     # APIサーバー（FastAPI/Express）
│   └── bot/         # Discord/Slack Bot
├── libs/
│   ├── components/  # 再利用可能なUIコンポーネント
│   ├── logic/       # ビジネスロジックと共通機能
│   └── design/      # デザインシステム
└── starter-kit/     # 開発者向けテンプレート
```

## 🚀 クイックスタート

1. リポジトリのクローン:

```bash
git clone https://github.com/nobu007/connective-byte.git
cd connective-byte
```

2. フロントエンドの起動:

```bash
cd apps/frontend
npm install
npm run dev
```

3. バックエンドの起動:

```bash
cd apps/backend
npm install
npm run dev
```

## 🚀 デプロイ

### Netlifyへのデプロイ

このプロジェクトはNetlifyで簡単にデプロイできます。

#### クイックデプロイ

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/nobu007/connective-byte)

#### 手動デプロイ

1. [Netlify](https://www.netlify.com/)にログイン
2. 「Add new site」→「Import an existing project」を選択
3. GitHubリポジトリを接続
4. ビルド設定は`netlify.toml`から自動で読み込まれます

詳細な手順は[NETLIFY_DEPLOY.md](./NETLIFY_DEPLOY.md)を参照してください。

#### デプロイ設定（自動適用）

- **Base directory**: `apps/frontend`
- **Build command**: `npm run build`
- **Publish directory**: `apps/frontend/out`
- **Node.js version**: 20

## 📚 ドキュメント

各コンポーネントの詳細なドキュメントは以下を参照してください：

- [フロントエンド](./apps/frontend/README.md)
- [バックエンド](./apps/backend/README.md)
- [コンポーネントライブラリ](./libs/components/README.md)

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

MITライセンスの下で公開されています。詳細は[LICENSE](./LICENSE)を参照してください。
