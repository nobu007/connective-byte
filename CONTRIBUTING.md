# コントリビューションガイド

ConnectiveByteプロジェクトへのコントリビューションに興味を持っていただき、ありがとうございます！

## 🤝 コントリビューション方法

### 1. イシューの作成

バグ報告や機能提案は、GitHubのIssuesで受け付けています。

**バグ報告の場合：**

- 問題の詳細な説明
- 再現手順
- 期待される動作
- 実際の動作
- 環境情報（OS、ブラウザ、Node.jsバージョン等）

**機能提案の場合：**

- 機能の詳細な説明
- ユースケース
- 期待される効果

### 2. プルリクエストの作成

1. リポジトリをフォーク
2. 新しいブランチを作成
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. 変更を実装
4. テストを追加/更新
5. コミット
   ```bash
   git commit -m "feat: add amazing feature"
   ```
6. プッシュ
   ```bash
   git push origin feature/amazing-feature
   ```
7. プルリクエストを作成

## 📝 コミットメッセージ規約

Conventional Commitsに従ってください：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメントのみの変更
- `style`: コードの意味に影響しない変更（空白、フォーマット等）
- `refactor`: バグ修正や機能追加を伴わないコード変更
- `perf`: パフォーマンス改善
- `test`: テストの追加や修正
- `chore`: ビルドプロセスやツールの変更

### 例

```bash
feat: add newsletter signup component
fix: resolve mobile navigation menu issue
docs: update deployment guide
style: format code with prettier
refactor: simplify form validation logic
perf: optimize image loading
test: add unit tests for button component
chore: update dependencies
```

## 🎨 コーディング規約

### TypeScript

- 型を明示的に定義
- `any`の使用を避ける
- インターフェースを優先（typeよりも）

### React

- 関数コンポーネントを使用
- カスタムフックで状態ロジックを分離
- propsの型を明示的に定義

### CSS/Tailwind

- Tailwindユーティリティクラスを優先
- カスタムCSSは最小限に
- レスポンシブデザインを考慮

### ファイル構造

```
components/
├── layout/      # レイアウトコンポーネント
├── sections/    # ページセクション
├── ui/          # 再利用可能なUIコンポーネント
└── forms/       # フォーム関連コンポーネント
```

## ✅ プルリクエストチェックリスト

- [ ] コードがビルドエラーなく動作する
- [ ] 型チェックが通る（`npm run type-check`）
- [ ] リントエラーがない（`npm run lint`）
- [ ] テストが通る（`npm run test`）
- [ ] 新機能にテストを追加した
- [ ] ドキュメントを更新した
- [ ] コミットメッセージが規約に従っている
- [ ] レスポンシブデザインを確認した
- [ ] アクセシビリティを考慮した

## 🧪 テスト

### ユニットテスト

```bash
npm run test
```

### E2Eテスト

```bash
npm run test:e2e
```

### カバレッジ

```bash
npm run test -- --coverage
```

## 🔍 コードレビュー

プルリクエストは以下の観点でレビューされます：

- **機能性**: 意図した通りに動作するか
- **コード品質**: 読みやすく保守しやすいか
- **パフォーマンス**: 不要な処理がないか
- **セキュリティ**: 脆弱性がないか
- **アクセシビリティ**: WCAG 2.1 Level AAに準拠しているか
- **テスト**: 適切なテストが含まれているか

## 📚 開発環境のセットアップ

### 前提条件

- Node.js 18以上
- npm

### セットアップ手順

```bash
# リポジトリのクローン
git clone https://github.com/your-username/connective-byte.git
cd connective-byte

# 依存関係のインストール
npm install

# 開発サーバーの起動
cd apps/frontend
npm run dev
```

## 🐛 バグ報告

バグを見つけた場合は、以下の情報を含めてIssueを作成してください：

1. **タイトル**: 簡潔な問題の説明
2. **説明**: 詳細な問題の説明
3. **再現手順**: 問題を再現する手順
4. **期待される動作**: 本来どう動作すべきか
5. **実際の動作**: 実際にどう動作したか
6. **環境情報**:
   - OS
   - ブラウザとバージョン
   - Node.jsバージョン
   - その他関連する情報

## 💡 機能提案

新機能の提案は大歓迎です！以下の情報を含めてIssueを作成してください：

1. **タイトル**: 機能の簡潔な説明
2. **動機**: なぜこの機能が必要か
3. **詳細**: 機能の詳細な説明
4. **ユースケース**: 具体的な使用例
5. **代替案**: 他に考えられる実装方法

## 📞 質問・サポート

質問がある場合は：

1. まず[ドキュメント](./README.md)を確認
2. [既存のIssues](https://github.com/nobu007/connective-byte/issues)を検索
3. 見つからない場合は新しいIssueを作成
4. または info@connectivebyte.com までお問い合わせ

## 🎉 コントリビューターへの感謝

すべてのコントリビューターに感謝します！あなたの貢献がConnectiveByteをより良いものにします。

## 📄 ライセンス

コントリビューションすることで、あなたの貢献がプロジェクトと同じライセンス（MIT）の下で公開されることに同意したものとみなされます。
