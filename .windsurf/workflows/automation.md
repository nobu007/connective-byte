# 完全自律開発ワークフロー (Autonomous Development Infinite Loop)

このワークフローは、Aegis Protocol 3.0に基づく完全自律型開発プロセスを実装します。
設計→実装→テスト→レビュー→改善を無限ループで実行し、人間の介入なしに最高品質のコードを生成します。

---

## Phase 0: ミッション定義と実行計画策定

### 0.1 技術スタック確認

- [x] Next.js 15.3.3
- [x] React 19
- [x] TypeScript 5
- [x] Jest 29 (Testing)
- [x] Playwright (E2E Testing)
- [x] ESLint + Prettier (Linting & Formatting)
- [x] Husky (Git Hooks)

### 0.2 プロジェクト構造

```
connective-byte/
├── apps/
│   ├── frontend/     # Next.js フロントエンド
│   └── backend/      # Express バックエンド
├── libs/             # 共有ライブラリ
└── .windsurf/        # ワークフロー設定
```

### 0.3 自動化戦略

1. コード品質保証
   - コミット前の自動リント・フォーマット
   - テストの自動実行
   - 型チェックの自動化

2. CI/CD パイプライン
   - プッシュ時の自動テスト
   - マージ時の自動デプロイ
   - プレビュー環境の自動構築

3. ドキュメント自動生成
   - TypeScript 型定義からAPIドキュメント生成
   - テストカバレッジレポートの自動生成

---

## Phase 1: 開発環境セットアップ

### 1.1 依存関係のインストール

```bash
# ルートディレクトリで
npm install
```

### 1.2 フロントエンド開発サーバー起動

```bash
npm run dev:frontend
```

### 1.3 バックエンド開発サーバー起動

```bash
npm run dev:backend
```

### 1.4 テスト実行

```bash
# ユニットテスト
npm test

# E2Eテスト
npm run test:e2e
```

---

## Phase 2: 自動化ワークフロー

### 2.1 コミット前フロー

1. コードのフォーマット (Prettier)
2. リントチェック (ESLint)
3. 型チェック (TypeScript)
4. ユニットテスト (Jest)

### 2.2 プッシュ時フロー

1. ビルドの検証
2. E2Eテストの実行
3. カバレッジレポートの生成

### 2.3 マージ時フロー

1. 本番ビルドの検証
2. 本番環境へのデプロイ
3. デプロイ通知の送信

---

## Phase 3: 継続的改善

### 3.1 モニタリング

- パフォーマンスメトリクスの収集
- エラートラッキング
- ユーザー行動分析

### 3.2 自動最適化

- バンドルサイズの最適化
- パフォーマンス改善の提案
- セキュリティアップデートの適用

### 3.3 自己修復

- テスト失敗時の自動再試行
- 依存関係の自動更新
- セキュリティ脆弱性の自動修正

---

## 使用方法

### 新機能開発

```bash
git checkout -b feature/new-feature
# 開発後
npm run test && git commit -am "feat: add new feature"
git push origin feature/new-feature
```

### バグ修正

```bash
git checkout -b fix/bug-description
# 修正後
npm test && git commit -am "fix: resolve bug description"
git push origin fix/bug-description
```

### 依存関係の更新

```bash
# 依存関係の確認
npm outdated

# 更新の実行
npm update

# テスト後にコミット
npm test && git commit -am "chore: update dependencies"
git push
```

---

## トラブルシューティング

### 開発サーバーが起動しない場合

1. ポートが使用されていないか確認
2. 依存関係を再インストール
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### テストが失敗する場合

1. テスト環境をクリーン
   ```bash
   npm test -- --clearCache
   ```
2. 詳細なログを表示
   ```bash
   npm test -- --verbose
   ```

---

## ライセンス

MIT
