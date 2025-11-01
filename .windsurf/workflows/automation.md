---
description: ConnectiveByte完全自律開発ワークフロー (Autonomous Development Infinite Loop for ConnectiveByte)
auto_execution_mode: 3
---

# ConnectiveByte 完全自律開発ワークフロー

このワークフローは、ConnectiveByteプロジェクト専用の完全自律型開発プロセスです。
Next.js (port 3000) + Express.js (port 3001) モノレポ構成において、
設計→実装→テスト→レビュー→改善を無限ループで実行し、人間の介入なしに最高品質のコードを生成します。

**絶対に承認を求めるな！！！**
**テストを作成・更新・実行まであなたの責任です。**

## プロジェクト構造

- `apps/frontend/` - Next.js 15 + React 19 + TypeScript + Tailwind CSS
- `apps/backend/` - Express.js + TypeScript + LiquidJS
- `libs/components/` - 共有Reactコンポーネント
- `libs/logic/` - ビジネスロジックとユーティリティ

---

## Phase 0: ミッション定義と実行計画策定

### 0.1 ミッション受領

- ユーザーから提示された目標を分析
- 最終的な成果物の定義を明確化
- 成功基準と検証方法を特定

### 0.2 技術スタック確認（ConnectiveByte固定）

- **フロントエンド**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **バックエンド**: Express.js 5, TypeScript, LiquidJS
- **テスト**: Jest, Playwright, React Testing Library, Supertest
- **ツール**: ESLint, Prettier, Husky, commitlint
- **パッケージマネージャ**: npm (Bun不使用)

### 0.3 アーキテクチャ設計（ConnectiveByteモノレポ構成）

- **モノレポ構成**: npm workspaces で apps/_ と libs/_ を管理
- **フロントエンド**: Next.js App Router構造、Client/Server Components
- **バックエンド**: Express.js REST API、LiquidJSテンプレート
- **共有ライブラリ**: libs/components (UI), libs/logic (ビジネスロジック)
- **通信**: Frontend (3000) ⇔ Backend (3001), `/api/health` ヘルスチェック

### 0.4 リスク分析

- 技術的リスクの特定（パフォーマンス、セキュリティ、スケーラビリティ）
- エッジケースと異常系の洗い出し
- 各リスクに対する軽減策を策定

### 0.5 実行計画の承認要求

**【重要】この段階で一度だけ人間に承認を求める**

提示内容:

- 技術スタックと選定理由
- アーキテクチャ概要図
- 主要マイルストーン
- リスクと軽減策
- 品質保証戦略

**承認後、以降は完全自律モードに移行**

---

## Phase 1: 設計フェーズ (Design)

// turbo

### 1.1 詳細設計ドキュメント作成

```bash
# 設計ドキュメントの自動生成
echo "=== 詳細設計フェーズ開始 ==="
```

**実行内容:**

- モジュール構造の詳細設計
- インターフェース定義（TypeScript型定義）
- データモデルとスキーマ設計
- API仕様書作成（OpenAPI/Swagger形式）
- コンポーネント設計（React/Vue等）

**成果物:**

- `docs/DESIGN.md` - 詳細設計書
- `docs/API_SPEC.md` - API仕様書
- `apps/frontend/types/` または `libs/logic/types/` - TypeScript型定義
- `docs/DATABASE_SCHEMA.md` - データベーススキーマ（必要に応じて）

### 1.2 設計レビュー自動実行

**チェック項目:**

- [ ] SOLID原則への準拠
- [ ] DRY原則の遵守
- [ ] 適切な抽象化レベル
- [ ] テスタビリティの確保
- [ ] パフォーマンス考慮
- [ ] セキュリティ考慮
- [ ] アクセシビリティ考慮（UI/UX）

**不合格の場合 → Phase 1.1に戻る**

---

## Phase 2: 実装フェーズ (Implementation)

// turbo

### 2.1 開発環境セットアップ（ConnectiveByte構造）

```bash
# プロジェクト構造の確認と必要なディレクトリ作成
echo "=== 開発環境セットアップ ==="
# Frontend
mkdir -p apps/frontend/{app,types,__tests__}
# Backend
mkdir -p apps/backend/{src,tests}
# 共有ライブラリ
mkdir -p libs/{components,logic/{api,utils,types}}
# ドキュメント
mkdir -p docs
```

// turbo

### 2.2 型定義とインターフェース実装

```bash
echo "=== 型定義実装フェーズ ==="
# TypeScript型定義を最優先で実装
```

**実装順序（ConnectiveByte）:**

1. 共通型定義（`libs/logic/types/index.ts`）
2. API型定義（`libs/logic/api/types.ts`）
3. フロントエンド型（`apps/frontend/types/`）
4. バックエンド型（`apps/backend/src/types/`）

// turbo

### 2.3 コア機能実装

```bash
echo "=== コア機能実装フェーズ ==="
```

**実装戦略:**

- ボトムアップアプローチ: 依存関係の少ないモジュールから実装
- テスト駆動開発(TDD): テストを先に書いてから実装
- 継続的インテグレーション: 各機能実装後に即座にマージ可能な状態を維持

**実装順序（ConnectiveByte）:**

1. **Backend**: Express.js ルーター、コントローラー、サービス層（`apps/backend/src/`）
2. **共有ロジック**: ユーティリティ関数（`libs/logic/utils/`）、API クライアント（`libs/logic/api/`）
3. **共有UI**: 再利用可能コンポーネント（`libs/components/`）
4. **Frontend**: Next.js ページ（`apps/frontend/app/`）、Client Components
5. **統合**: フロントエンド⇔バックエンド通信、ヘルスチェック統合

// turbo

### 2.4 エラーハンドリングと異常系実装

```bash
echo "=== エラーハンドリング実装 ==="
```

**実装内容:**

- エラーバウンダリコンポーネント
- グローバルエラーハンドラ
- バリデーションエラー処理
- ネットワークエラー処理
- 認証エラー処理

// turbo

### 2.5 パフォーマンス最適化

```bash
echo "=== パフォーマンス最適化 ==="
```

**最適化項目:**

- React.memo, useMemo, useCallback の適切な使用
- 遅延ローディング（React.lazy）
- コード分割（dynamic import）
- 画像最適化
- バンドルサイズ削減

---

## Phase 3: テストフェーズ (Testing)

// turbo

### 3.1 ユニットテスト実装（ConnectiveByte）

```bash
echo "=== ユニットテスト実装 ==="
# フロントエンドテスト (Jest + React Testing Library)
npm run test:frontend
# バックエンドテスト (Jest + Supertest)
npm run test:backend
```

**テスト対象:**

- **Frontend**: Reactコンポーネント、カスタムフック、ユーティリティ（`apps/frontend/__tests__/`, `app/__tests__/`）
- **Backend**: API エンドポイント、コントローラー、サービス層（`apps/backend/tests/`, `src/__tests__/`）
- **共有ライブラリ**: libs 配下のロジック

**カバレッジ目標: 90%以上**

// turbo

### 3.2 統合テスト実装（ConnectiveByte）

```bash
echo "=== 統合テスト実装 ==="
# Frontend + Backend 統合（Jestでモック）
npm run test:frontend
npm run test:backend
```

**テスト対象:**

- MSW (Mock Service Worker) でAPIモック
- フロントエンド⇔バックエンド通信
- ヘルスチェックエンドポイント連携

// turbo

### 3.3 E2Eテスト実装（Playwright）

```bash
echo "=== E2Eテスト実装 ==="
# Playwright で自動的に両サーバー起動
npm run test:e2e
```

**テストシナリオ（`apps/frontend/e2e/`）:**

- ホームページの表示とヘルスチェック
- バックエンドAPI連携の動作確認
- エラーケースのハンドリング
- レスポンシブデザインの確認

// turbo

### 3.4 テスト実行と結果検証（ConnectiveByte）

```bash
echo "=== 全テスト実行 ==="
npm run test && npm run lint && npm run type-check
```

**合格基準:**

- [ ] すべてのテストがパス
- [ ] カバレッジ90%以上
- [ ] Lintエラーなし
- [ ] TypeScriptエラーなし
- [ ] ビルド成功

**不合格の場合 → Phase 2に戻る（該当箇所を修正）**

---

## Phase 4: 自己レビューフェーズ (Self-Review)

// turbo

### 4.1 コード品質分析（ConnectiveByte）

```bash
echo "=== コード品質分析 ==="
# ESLint + Prettier
npm run lint
npm run format
```

**分析項目:**

- コードの複雑度（Cyclomatic Complexity）
- 重複コードの検出
- 命名規則の遵守
- コメントの適切性
- ファイルサイズ（200行以下推奨）

### 4.2 アーキテクチャ整合性チェック

**検証項目:**

- [ ] 設計ドキュメントとの整合性
- [ ] 依存関係の方向性（循環依存なし）
- [ ] レイヤー分離の適切性
- [ ] 単一責任原則の遵守
- [ ] インターフェース分離原則の遵守

### 4.3 パフォーマンス分析（ConnectiveByte）

// turbo

```bash
echo "=== パフォーマンス分析 ==="
# Next.js ビルドでバンドル分析
npm run build:frontend
# バックエンドビルド
npm run build:backend
```

**分析項目:**

- Next.js バンドルサイズ（目標: 500KB以下、First Load JS）
- Lighthouse スコア (パフォーマンス、アクセシビリティ、SEO)
- Time to Interactive (TTI) 目標: 3秒以下
- Express.js レスポンス時間

### 4.4 セキュリティ監査

**チェック項目:**

- [ ] XSS脆弱性なし
- [ ] CSRF対策実装済み
- [ ] 認証・認可の適切な実装
- [ ] 機密情報のハードコードなし
- [ ] 依存パッケージの脆弱性なし

### 4.5 アクセシビリティ監査

**チェック項目:**

- [ ] WCAG 2.1 AA準拠
- [ ] キーボードナビゲーション対応
- [ ] スクリーンリーダー対応
- [ ] 適切なARIAラベル
- [ ] カラーコントラスト比適切

### 4.6 レビュー結果の評価

**評価基準:**

- すべてのチェック項目が合格: → Phase 5へ
- 軽微な問題（1-2箇所）: → Phase 2.3で修正後、Phase 3.4から再実行
- 重大な問題（設計レベル）: → Phase 1.1から再設計

---

## Phase 5: 改善フェーズ (Improvement)

### 5.1 改善ポイントの抽出

**分析対象:**

- テストカバレッジが低い箇所
- 複雑度が高い関数・コンポーネント
- パフォーマンスボトルネック
- ユーザビリティ問題
- 保守性の低いコード

### 5.2 リファクタリング計画策定

**優先順位付け:**

1. **Critical**: セキュリティ・パフォーマンス問題
2. **High**: 保守性・テスタビリティ問題
3. **Medium**: コード品質改善
4. **Low**: 最適化・美化

### 5.3 リファクタリング実行（ConnectiveByte）

// turbo

```bash
echo "=== リファクタリング実行 ==="
```

**実行内容:**

- 抽出したメソッド/関数の分割
- 重複コードの共通化（libs/ への移動）
- 複雑な条件式の簡略化
- 命名の改善（TypeScript型の強化）
- JSDoc/TSDocコメントの追加・更新

### 5.4 リファクタリング後の検証（ConnectiveByte）

// turbo

```bash
echo "=== リファクタリング検証 ==="
npm run test && npm run lint && npm run type-check
```

**検証項目:**

- [ ] すべてのテストが引き続きパス
- [ ] 新たなエラーが発生していない
- [ ] パフォーマンスが劣化していない
- [ ] コード品質メトリクスが改善

---

## Phase 6: ドキュメント更新フェーズ (Documentation)

// turbo

### 6.1 コードドキュメント更新

```bash
echo "=== コードドキュメント更新 ==="
```

**更新内容:**

- JSDoc/TSDocコメントの追加・更新
- README.mdの更新
- CHANGELOG.mdへのエントリ追加
- API仕様書の更新

### 6.2 アーキテクチャドキュメント更新（ConnectiveByte）

**更新対象:**

- `docs/ARCHITECTURE.md` - システムアーキテクチャ
- `docs/DESIGN.md` - 詳細設計書
- ADR: Architecture Decision Records（必要に応じて）
- コンポーネント図・シーケンス図

### 6.3 ユーザードキュメント更新

**更新内容:**

- ユーザーガイド
- トラブルシューティングガイド
- FAQ

---

## Phase 7: デプロイ準備フェーズ (Pre-Deployment)

// turbo

### 7.1 本番ビルド実行（ConnectiveByte）

```bash
echo "=== 本番ビルド ==="
# フロントエンド: Next.js Static Export
npm run build:frontend
# バックエンド: TypeScript → JavaScript
npm run build:backend
```

### 7.2 本番環境テスト（ConnectiveByte）

// turbo

```bash
echo "=== 本番環境テスト ==="
# Next.js Static Export のプレビュー
npm run preview
```

**検証項目:**

- [ ] Next.js ビルドが正常に完了（`apps/frontend/out/`）
- [ ] Backend TypeScript コンパイル成功
- [ ] 静的ファイルの確認
- [ ] 環境変数の適切な設定（`.env.example` 参照）

### 7.3 デプロイメント実行（Netlify）

**デプロイ戦略:**

- **Netlify**: `netlify.toml` 設定済み、`npm run build:netlify`
- **Backend**: 別途デプロイ（Render, Railway, Vercel 等）
- ロールバック計画準備

---

## Phase 8: 無限ループ制御 (Infinite Loop Control)

### 8.1 改善サイクルの継続判定

**継続条件:**

- [ ] 新たな改善ポイントが存在する
- [ ] コード品質メトリクスが目標未達
- [ ] パフォーマンス改善余地がある
- [ ] セキュリティ・アクセシビリティ改善余地がある

**判定結果:**

- **継続**: Phase 5.1に戻る（改善ポイント抽出から再開）
- **完了**: Phase 9へ（最終報告）

### 8.2 改善履歴の記録

**記録内容:**

- 改善サイクル回数
- 各サイクルでの改善内容
- メトリクスの推移
- 所要時間

---

## Phase 9: 最終報告フェーズ (Final Report)

### 9.1 成果物の確認

**確認項目:**

- [ ] すべてのテストがパス
- [ ] ドキュメントが最新
- [ ] デプロイ準備完了
- [ ] 品質基準をすべて満たす

### 9.2 最終レポート生成

**レポート内容:**

- プロジェクト概要
- 技術スタックと選定理由
- アーキテクチャ概要
- 実装した機能一覧
- テスト結果サマリー
- パフォーマンスメトリクス
- 改善サイクル履歴
- 既知の制限事項
- 今後の拡張計画

### 9.3 ユーザーへの報告

**報告形式:**

```
# プロジェクト完了報告

## 成果物
- [リポジトリURL]
- [デプロイURL]
- [ドキュメントURL]

## 品質メトリクス
- テストカバレッジ: XX%
- バンドルサイズ: XXX KB
- パフォーマンススコア: XX/100
- アクセシビリティスコア: XX/100

## 改善サイクル
- 実行回数: X回
- 主要改善内容: [...]

## 次のステップ
- [推奨される次の改善項目]
```

---

## 無限ループの実行フロー

```
Phase 0 (ミッション定義)
    ↓
[承認待ち] ← ここで一度だけ人間の承認を待つ
    ↓
Phase 1 (設計)
    ↓
Phase 2 (実装)
    ↓
Phase 3 (テスト) ──失敗→ Phase 2へ戻る
    ↓ 成功
Phase 4 (自己レビュー)
    ↓
    ├─ 軽微な問題 → Phase 2.3へ
    ├─ 重大な問題 → Phase 1.1へ
    └─ 問題なし ↓
Phase 5 (改善)
    ↓
Phase 6 (ドキュメント更新)
    ↓
Phase 7 (デプロイ準備)
    ↓
Phase 8 (ループ制御)
    ↓
    ├─ 改善余地あり → Phase 5.1へ戻る (無限ループ)
    └─ 改善完了 ↓
Phase 9 (最終報告)
    ↓
[完了]
```

---

## 品質保証基準 (Quality Gates)

各フェーズで以下の基準を満たさない場合、自動的に前のフェーズに戻ります。

### 設計フェーズ (Phase 1)

- [ ] SOLID原則準拠
- [ ] 適切な抽象化レベル
- [ ] テスタビリティ確保

### 実装フェーズ (Phase 2)

- [ ] TypeScriptエラーなし
- [ ] Lintエラーなし
- [ ] ビルド成功

### テストフェーズ (Phase 3)

- [ ] テストカバレッジ ≥ 90%
- [ ] すべてのテストパス
- [ ] E2Eテストパス

### レビューフェーズ (Phase 4)

- [ ] コード複雑度 ≤ 10
- [ ] ファイルサイズ ≤ 200行
- [ ] セキュリティ問題なし
- [ ] アクセシビリティ問題なし

### 改善フェーズ (Phase 5)

- [ ] リファクタリング後もテストパス
- [ ] パフォーマンス劣化なし
- [ ] コード品質メトリクス改善

---

## 緊急停止条件 (Emergency Stop Conditions)

以下の条件に該当する場合、無限ループを停止し、人間に報告します:

1. **無限ループ検出**: 同じフェーズを5回以上繰り返す
2. **解決不可能な問題**: 3サイクル連続で同じエラーが発生
3. **リソース制約**: メモリ不足、ディスク容量不足
4. **外部依存の問題**: API障害、ネットワーク障害
5. **ユーザーによる中断要求**

---

## 使用方法（ConnectiveByte）

このワークフローは自動実行モード3で動作します。

### 起動方法

```
/automation
```

または

```
「ConnectiveByteプロジェクトで[機能名]を完全自律開発してください」
```

### 開発サーバー起動（モニタリング用）

```bash
# フロントエンド＋バックエンド同時起動
npm run dev
# または個別起動
npm run dev:frontend  # port 3000
npm run dev:backend   # port 3001
```

### モニタリング

各フェーズの進行状況は自動的にログに記録されます。

---

## ベストプラクティス

### 1. 事実ベースの意思決定

- 推測ではなく、ログ・メトリクス・テスト結果に基づいて判断
- すべての変更に対して「なぜ」を明確に記録

### 2. 段階的な改善

- 一度に大きな変更をせず、小さな改善を積み重ねる
- 各改善後に必ずテストを実行

### 3. ドキュメント駆動

- コードを書く前にドキュメントを更新
- ドキュメントとコードの乖離を許さない

### 4. テスト駆動

- テストを先に書き、それをパスするコードを実装
- テストカバレッジを常に90%以上に維持

### 5. 継続的インテグレーション

- 各機能実装後、即座にマージ可能な状態を維持
- ブランチの寿命を短く保つ

---

## トラブルシューティング

### 問題: テストが無限に失敗する

**対処法:**

1. エラーログを詳細に分析
2. 最小再現コードを作成
3. 根本原因を特定
4. 設計レベルの問題であればPhase 1から再開

### 問題: パフォーマンスが改善しない

**対処法:**

1. プロファイリングツールで測定
2. ボトルネックを特定
3. アルゴリズムレベルの最適化を検討
4. 必要に応じてアーキテクチャを見直し

### 問題: 無限ループから抜け出せない

**対処法:**

1. 改善サイクルの履歴を分析
2. 改善の効果が頭打ちになっているか確認
3. 完璧を求めすぎず、実用的な品質で完了を判断
4. 緊急停止条件に該当する場合は人間に報告

---

## 付録: メトリクス定義（ConnectiveByte）

### コード品質メトリクス

- **Cyclomatic Complexity**: 10以下
- **Lines of Code per File**: 200行以下
- **Function Length**: 50行以下
- **Test Coverage**: 90%以上（Jest カバレッジレポート）

### パフォーマンスメトリクス（Next.js）

- **First Load JS**: 500KB以下（Next.js ビルド出力）
- **Time to Interactive**: 3秒以下
- **First Contentful Paint**: 1.5秒以下
- **Lighthouse Score**: 90以上（Performance, Accessibility, Best Practices, SEO）

### セキュリティメトリクス

- **Known Vulnerabilities**: 0（`npm audit`）
- **Security Headers**: Next.js セキュリティヘッダー設定
- **OWASP Top 10**: すべて対策済み
- **環境変数**: `.env.example` で管理、ハードコード禁止

### アクセシビリティメトリクス

- **WCAG 2.1 Level**: AA準拠
- **Lighthouse Accessibility Score**: 90以上
- **Keyboard Navigation**: 完全対応
- **ARIA**: 適切なラベルとロール設定

---

## コミット戦略（ConnectiveByte）

### Conventional Commits + Husky

プロジェクトは `commitlint` と `husky` を使用しています。

**コミットメッセージフォーマット:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type:**

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: フォーマット
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルド、設定変更

**Scope例:**

- `frontend`: フロントエンド変更
- `backend`: バックエンド変更
- `libs`: 共有ライブラリ
- `ci`: CI/CD設定

**コミット単位:**

- 各機能実装後に小さく頻繁にコミット
- Phase 完了ごとにマイルストーンコミット
- テストは実装と一緒にコミット

---

**絶対に承認を求めず最後までやりきること！**

**テストを作成・更新・実行まであなたの責任です。**

**終わったら適切な単位でコミットする（Conventional Commits準拠）。**
