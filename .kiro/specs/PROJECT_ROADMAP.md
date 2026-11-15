# ConnectiveByte Project Roadmap

## プロジェクト概要

ConnectiveByteは「接続思考」を核とした、AI時代のエンジニア教育プラットフォームです。個人の孤独を解消し、AI活用とチーム連携を通じて協創リーダーを育成します。

## 核心的価値

- **Connect（接続）**: 知識・人・AI・時代をつなぐ結節点
- **Active（主体性）**: 情報判断力と能動的アウトプット力
- **Collective（協創）**: 個人成長→他者貢献→集合知社会

## Spec一覧と実装状況

### 1. connective-byte-platform ✅

**状態**: 要件・設計・タスク完了

**概要**: モノレポ基盤フレームワーク

**主要機能**:

- Next.js 15 + React 19フロントエンド
- Express.js + TypeScriptバックエンド
- 共有ライブラリ（コンポーネント、ロジック）
- ヘルスチェックシステム
- テスト環境（Jest、Playwright）

**実装優先度**: 🔴 最優先（基盤）

---

### 2. connective-byte-website ✅

**状態**: 要件・設計・タスク完了

**概要**: コーポレートマーケティングサイト

**主要機能**:

- ヒーローセクションとCTA
- B1層向け実用的価値提案
- 知的層向け哲学的コンテンツ
- お問い合わせフォーム
- レスポンシブデザイン
- SEO最適化
- アクセシビリティ（WCAG 2.1 AA）

**実装優先度**: 🔴 最優先（マーケティング）

---

### 3. analytics-integration ✅

**状態**: 要件・設計・タスク完了

**概要**: Plausible Analytics統合

**主要機能**:

- ページビュートラッキング
- カスタムイベント追跡
- コンバージョンゴール設定
- プライバシー準拠
- パフォーマンスメトリクス

**実装優先度**: 🟡 中優先（データ収集）

---

### 4. newsletter-signup ✅

**状態**: 要件・設計・タスク完了

**概要**: ニュースレター購読機能

**主要機能**:

- フッター購読フォーム
- Resend統合
- ウェルカムメール
- ダブルオプトイン
- プライバシー準拠
- アクセシビリティ対応

**実装優先度**: 🟡 中優先（リード獲得）

---

### 5. user-authentication ✅ 実装完了

**状態**: 実装完了（2026年8月。本番稼働: Cloudflare Workers + Neon Postgres）

**概要**: ユーザー認証・プロフィール管理システム

**主要機能**（実装済み）:

- ユーザー登録・メール認証
- JWT（15分・メモリ保持）+ Refresh Cookie（`cb_rt` httpOnly・30日・ローテーション）
- セッション管理（一覧・個別失効・他セッション失効・再利用検知で全失効）
- パスワードリセット・変更
- OAuthログイン（Google。設計はprovider汎用）
- プロフィール管理（bio / timezone / GitHubユーザー名）
- アカウント削除（30日猶予→Cronで匿名化）
- セキュリティ監視（auth_logs・ログインロックアウト10回/1h・レートリミット）
- フロント: `/login/` `/register/` `/mypage/`（プロフィール|セキュリティ|セッション|アカウントのタブ）

**後回し**: 二要素認証（TOTP）、GitHub OAuth（接口はprovider汎用のため追加のみ）、メールアドレス変更、管理者ロール管理UI

**実装優先度**: 🔴 最優先（学習システムの前提条件）

**実装記録**: Stage 1（メール検証・PWリセット）→ Stage 2（ローテーション・セッション・ロックアウト・Google OAuth・マイページ）で完了。E2E `npm run e2e:auth` 25項目

---

### 6. learning-content-system ✅ NEW

**状態**: 要件・設計・タスク完了

**概要**: 12週間βカリキュラム配信プラットフォーム

**主要機能**:

- 構造化カリキュラム配信（3フェーズ、12週間）
- 学習進捗トラッキング
- 実践プロジェクト提出・フィードバック
- APIコスト監視ダッシュボード
- チーム協働スペース
- 評価・アセスメントシステム
- コンテンツ管理インターフェース
- 通知システム
- 分析・レポート機能
- モバイル対応

**実装優先度**: 🔴 最優先（核心機能）

**実装期間**: 10週間

- Phase 1: 基盤セットアップ（2週間）
- Phase 2: コア学習機能（3週間）
- Phase 3: 高度な機能（3週間）
- Phase 4: 仕上げとローンチ（2週間）

**依存関係**: user-authentication（必須）

---

## 実装推奨順序

### Stage 1: 基盤構築（4-6週間）

1. **connective-byte-platform** - モノレポ基盤
2. **connective-byte-website** - マーケティングサイト
3. **newsletter-signup** - リード獲得
4. **analytics-integration** - データ収集

**目標**: マーケティングサイトの公開とリード獲得開始

---

### Stage 2: 認証システム ✅ 完了（2026年8月）

5. **user-authentication** - 認証・認可システム

**目標**: セキュアなユーザー管理基盤の確立 — 達成。Google OAuthの本番公開と2FAを後続ステージに繰り越し

---

### Stage 3: 教育プラットフォーム（10週間）

6. **learning-content-system** - 学習コンテンツシステム

**目標**: 12週間βプログラムの配信開始

---

## 技術スタック

### フロントエンド

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- Framer Motion
- React Hook Form + Zod
- TanStack Query
- Plausible Analytics

### バックエンド（実績）

- Express.js（auth + healthルートをCloudflare Workers化して配信）
- TypeScript
- Neon Postgres（`@neondatabase/serverless` HTTP接続。ORMなし・手書きSQL）
- JWT (jsonwebtoken) — アクセストークン15分 + httpOnly Cookie ローテーション
- PBKDF2-SHA256（WorkersのCPU制限10msに bcrypt 純JSが収まらないため）
- OAuth 2.0は依存なしの自前実装（provider汎用・現在はGoogleのみ）
- ロックアウト・レートリミットは express-rate-limit + auth_logs（Redis不使用）

### インフラ（実績）

- Cloudflare Pages（フロントエンド静的エクスポート + Pages Functions。2026年8月にNetlifyから移行）
- Cloudflare Workers（auth API: `api.connectivebyte.com`。Cron Triggerでメンテナンス実行）
- Neon Postgres（データベース。フリーティア）
- Resend (メール配信)
- Plausible Analytics（アクセス解析）
- ファイルストレージ（R2等）は未導入 — 必要になったStageで検討

### テスト

- Jest (ユニット・統合テスト)
- Playwright (E2Eテスト)
- React Testing Library
- Supertest

---

## 開発ガイドライン

### コーディング規約

- TypeScript strict mode
- ESLint + Prettier
- Conventional Commits
- WCAG 2.1 Level AA準拠

### セキュリティ

- OWASP Top 10対策
- bcrypt (12 salt rounds)
- JWT + Refresh Token
- レート制限
- CORS設定
- CSP、HSTS

### パフォーマンス

- Lighthouse 90+ (desktop), 80+ (mobile)
- API応答時間 <500ms (p95)
- 同時接続100+ユーザー対応

---

## 次のステップ

### 即座に開始可能

1. connective-byte-platform の実装開始
2. connective-byte-website の実装開始

### 準備が必要

- PostgreSQLデータベースのセットアップ
- Redisのセットアップ
- Resend APIキーの取得
- OAuth認証情報の取得（Google、GitHub）
- Netlifyアカウントのセットアップ
- Railway/Renderアカウントのセットアップ

---

## プロジェクト成功指標

### Stage 1完了時

- ✅ マーケティングサイト公開
- ✅ ニュースレター購読者10名以上
- ✅ Lighthouse スコア 90+
- ✅ アクセシビリティ WCAG 2.1 AA準拠

### Stage 2完了時

- ✅ ユーザー登録・ログイン機能
- ✅ OAuth連携（Google、GitHub）
- ✅ セキュリティ監査完了
- ✅ 認証システムのテストカバレッジ 90%+

### Stage 3完了時

- ✅ 12週間カリキュラム配信
- ✅ βプログラム受講生10名
- ✅ 学習進捗トラッキング機能
- ✅ APIコスト最適化実証
- ✅ チーム協働機能

---

## リスクと対策

### 技術的リスク

- **リスク**: PostgreSQL/Redisのスケーラビリティ
- **対策**: 初期段階でマネージドサービス採用

### スケジュールリスク

- **リスク**: 実装期間の見積もり超過
- **対策**: MVPに集中、段階的リリース

### セキュリティリスク

- **リスク**: 認証システムの脆弱性
- **対策**: セキュリティ監査、ペネトレーションテスト

---

## まとめ

ConnectiveByteプロジェクトは、6つの主要specで構成される包括的な教育プラットフォームです。

**完了したspec**:

1. ✅ connective-byte-platform
2. ✅ connective-byte-website
3. ✅ analytics-integration
4. ✅ newsletter-signup
5. ✅ user-authentication (NEW)
6. ✅ learning-content-system (NEW)

**推奨実装順序**:
Stage 1 → Stage 2 → Stage 3

**総実装期間**: 18-20週間

プロジェクトの成功により、「理解されない孤独を吹き飛ばして、AI活用と思考連携で協創リーダーになる」というビジョンを実現します。
