# API Cost Optimization Lab

ConnectiveByteのAPIコスト最適化ラボモジュール - AI時代のエンジニアがAPIコストを経営KPIとして管理するための実践的学習環境

## 🎯 概要

このモジュールは、AIエンジニアがAPIコストを測定・分析・最適化するための包括的なラボ環境を提供します。実験的なサンドボックス環境で安全にコスト最適化戦略をテストし、本番環境への適用前に効果を検証できます。

## 🏗️ アーキテクチャ

### コアモジュール

#### 1. Sandbox Environment (`sandbox/`)

- **SandboxManager**: ユーザー分離された実験セッション管理
- **ExperimentSession**: リソース制限とタイムアウト管理
- セッションごとの独立した実行環境

#### 2. Security (`security/`)

- **APIKeyManager**: AES-256-GCM暗号化によるAPIキー管理
- ユーザー提供キーと共有教育用キーのサポート
- キーローテーション機能

#### 3. API Gateway (`gateway/`)

- **APIGateway**: 統一されたAPI呼び出しインターフェース
- **OpenAIAdapter**: OpenAI API専用アダプター
- リクエスト/レスポンスロギングとメトリクス収集

#### 4. Cost Tracking (`cost/`)

- **CostTracker**: API呼び出しの記録とコスト計算
- **BaselineManager**: ベースライン作成と比較
- **TokenAnalyzer**: トークン使用量の詳細分析
- **OptimizationSuggester**: 最適化提案の自動生成
- **pricing**: プロバイダー別料金計算

### 最適化エンジン (`optimization/`)

#### 戦略パターン

- **BaseStrategy**: 最適化戦略の基底クラス
- **PromptCompressor**: プロンプト圧縮戦略
- **CachingStrategy**: レスポンスキャッシング戦略
- **BatchProcessor**: バッチ処理戦略
- **StrategyRegistry**: 戦略の登録と優先度付け

### シミュレーションエンジン (`simulation/`)

- **UsageSimulator**: 使用パターンのシミュレーション
  - Steady, Peak, Seasonal, Burst パターン
  - 日次/週次/月次/年次のコスト予測
- **ScaleCalculator**: スケール分析
  - 10x, 100x, 1000x成長シナリオ
  - ブレークイーブン分析

### デジタルツインシステム (`digital-twin/`)

- **DigitalTwinManager**: 本番環境のデジタルツイン管理
- **UsagePatternReplicator**: 使用パターンの再現
  - Uniform, Poisson, Burst分布
  - リクエストタイプ別の分布設定

### KPIデザイナー (`kpi/`)

- **KPIDefinitionManager**: カスタムKPI定義管理
- **KPICalculator**: KPI値の計算とステータス判定
- **KPIAlertSystem**: 閾値監視とアラート生成

デフォルトKPI:

- API Cost per Request
- Token Efficiency
- Response Latency
- Cost Savings Rate

### チャレンジシステム (`challenges/`)

- **ChallengeManager**: チャレンジとセッション管理
- **LeaderboardManager**: ランキングとスコア管理
- 難易度別チャレンジ (Beginner → Expert)
- バッジとポイントシステム
- ヒントシステム（ペナルティ付き）

### 進捗追跡 (`progress/`)

- **ProgressTracker**: ユーザー進捗の追跡
- 実験完了数、コスト削減額の記録
- バッジとチャレンジ完了の管理
- パーソナライズされた推奨事項

### プロバイダー比較 (`providers/`)

- **ProviderComparison**: 複数プロバイダーの比較
- TCO (Total Cost of Ownership) 計算
- コスト/レイテンシ/バリューの最適推奨

### レポート生成 (`reports/`)

- **ReportBuilder**: 包括的な実験レポート生成
- **ExportManager**: JSON/HTML/PDF形式でのエクスポート
- 可視化データの生成
- 統計的有意性の判定

## 🚀 使用方法

### 基本的な実験フロー

```typescript
import {
  SandboxManager,
  CostTracker,
  BaselineManager,
  TokenAnalyzer,
  OptimizationSuggester,
  StrategyRegistry,
  PromptCompressor,
} from './modules/lab';

// 1. サンドボックスセッション作成
const sandboxManager = new SandboxManager();
const session = sandboxManager.createSession({
  userId: 'user-123',
  experimentId: 'exp-456',
  config: {
    provider: 'openai',
    apiKeyId: 'key-789',
    isolationLevel: 'experiment',
  },
});

// 2. ベースライン作成
const baselineManager = new BaselineManager();
const baseline = await baselineManager.createBaseline({
  experimentId: 'exp-456',
  calls: initialCalls,
});

// 3. トークン分析と最適化提案
const tokenAnalyzer = new TokenAnalyzer();
const analysis = tokenAnalyzer.analyze(calls);

const suggester = new OptimizationSuggester();
const suggestions = suggester.suggest(analysis);

// 4. 最適化戦略の適用
const registry = new StrategyRegistry();
registry.register(new PromptCompressor());

const strategy = registry.get('prompt-compression');
const result = await strategy.apply({
  experimentId: 'exp-456',
  sessionId: session.id,
  provider: 'openai',
  model: 'gpt-4o-mini',
  prompt: originalPrompt,
});

// 5. レポート生成
const reportBuilder = new ReportBuilder();
const report = reportBuilder.build({
  experiment,
  baseline,
  calls,
  optimizations: [result],
});
```

### API エンドポイント

#### セッション管理

- `POST /api/lab/sessions` - セッション作成
- `GET /api/lab/sessions/:sessionId` - セッションメトリクス取得
- `DELETE /api/lab/sessions/:sessionId` - セッション終了

#### 実験とコスト追跡

- `GET /api/lab/experiments/:experimentId/summary` - 実験サマリー
- `POST /api/lab/experiments/:experimentId/baseline` - ベースライン作成
- `POST /api/lab/analyze/tokens` - トークン分析

#### 最適化戦略

- `GET /api/lab/strategies` - 利用可能な戦略一覧
- `POST /api/lab/strategies/:strategyName/apply` - 戦略適用

#### シミュレーション

- `POST /api/lab/simulations` - 使用シミュレーション実行
- `POST /api/lab/scale-analysis` - スケール分析

#### チャレンジ

- `GET /api/lab/challenges` - チャレンジ一覧
- `POST /api/lab/challenges/:challengeId/start` - チャレンジ開始
- `POST /api/lab/challenges/sessions/:sessionId/submit` - 解答提出
- `GET /api/lab/leaderboard` - リーダーボード取得

#### 進捗とレポート

- `GET /api/lab/progress/:userId` - ユーザー進捗取得
- `POST /api/lab/reports` - レポート生成
- `POST /api/lab/reports/:reportId/export` - レポートエクスポート

## 🗄️ データベーススキーマ

### テーブル

#### `lab_experiments`

実験の基本情報を管理

#### `lab_api_calls`

API呼び出しの詳細記録（トークン数、コスト、レイテンシ）

#### `lab_baselines`

実験のベースラインメトリクス

#### `lab_user_progress`

ユーザーの進捗、バッジ、チャレンジ完了状況

## 🔐 セキュリティ

- API キーはAES-256-GCM暗号化で保存
- ユーザー分離されたサンドボックス環境
- リソース制限とタイムアウト管理
- セッションごとの独立した実行環境

## 📊 メトリクスとKPI

### 自動収集メトリクス

- トークン使用量（入力/出力/システム）
- APIコスト
- レスポンスレイテンシ
- キャッシュヒット率
- バッチ処理効率

### カスタムKPI

- ユーザー定義の計算式
- 閾値ベースのアラート
- トレンド分析
- ダッシュボード可視化

## 🎓 学習パス

1. **基礎**: サンドボックスでの実験、ベースライン作成
2. **分析**: トークン分析、コスト内訳の理解
3. **最適化**: 戦略の適用、効果測定
4. **シミュレーション**: スケール予測、TCO計算
5. **実践**: チャレンジ完了、バッジ獲得
6. **マスター**: デジタルツイン、カスタムKPI設計

## 🔧 環境変数

```bash
# 必須
LAB_DATABASE_URL=postgresql://...
LAB_ENCRYPTION_KEY=64文字の16進数文字列

# オプション
LAB_SHARED_OPENAI_KEY=sk-...
LAB_REDIS_URL=redis://...
```

## 📈 今後の拡張

- [ ] Anthropic, Google AI アダプター実装
- [ ] Redis キャッシング統合
- [ ] リアルタイムダッシュボードUI
- [ ] A/Bテスト機能
- [ ] MLベースの最適化推奨
- [ ] チーム協働機能

## 🤝 貢献

このモジュールはConnectiveByteの核心的な教育コンテンツです。改善提案やバグ報告は歓迎します。

## 📝 ライセンス

ConnectiveByte プロジェクトのライセンスに従います。
