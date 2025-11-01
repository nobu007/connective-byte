# ConnectiveByte

ConnectiveByteは、モダンなWeb開発の基盤となる包括的なフレームワークです。

## ✨ 特徴

- **接続性**: あらゆるコンポーネントが緊密に連携し、シームレスな統合を実現
- **拡張性**: モジュラー設計による容易な機能拡張
- **保守性**: クリーンアーキテクチャと明確な責務分離による高い保守性

## 🛠️ 技術スタック

### フロントエンド (apps/frontend)

- **Framework**: [Next.js](https://nextjs.org/) (with React 19)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Testing**: [Jest](https://jestjs.io/), [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- **Lint/Format**: [ESLint](https://eslint.org/), [Prettier](https://prettier.io/)

### バックエンド (apps/backend)

- **Framework**: [Express.js](https://expressjs.com/) (推定)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Runtime**: [Node.js](https://nodejs.org/)

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
