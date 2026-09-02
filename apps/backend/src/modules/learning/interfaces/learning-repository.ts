/**
 * Learning Repository Interface
 *
 * カリキュラム（phases / modules / sessions）と学習進捗の永続化。
 * Postgres（Neon HTTP）/ Json の2実装がこの契約を実装する。
 *
 * ドメイン設計上の注意:
 * - module_progress テーブルは持たない（集計は都度 SQL count で計算）
 * - 進捗の書込先はセッションの UUID（slug 変更で壊れない）
 */

/** カリキュラムの Phase（W1-3 / W4-8 / W9-12 の3つ。init script で固定シード） */
export interface Phase {
  id: string;
  number: number;
  title: string;
  description: string | null;
  startWeek: number;
  endWeek: number;
}

export interface ModuleSummary {
  id: string;
  phaseId: string;
  slug: string;
  title: string;
  description: string | null;
  weekNumber: number;
  orderIndex: number;
  isPublished: boolean;
  /**
   * 購入（エンタイトルメント）が必要な週かどうか。service 層で
   * weekNumber > FREE_WEEKS として後付けする（リポジトリは関知しない）。
   * 未設定＝無料扱い（旧テスト互換）
   */
  requiresPurchase?: boolean;
}

export interface SessionSummary {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  objectives: string[];
  orderIndex: number;
  isPublished: boolean;
}

/** 本文付きセッション（親モジュールの表示用情報を含む） */
export interface SessionDetail extends SessionSummary {
  content: string;
  moduleSlug: string;
  moduleTitle: string;
  /** 親モジュールの週番号（購入ゲーティング判定に使用） */
  moduleWeekNumber: number;
}

export interface ModuleWithSessions extends ModuleSummary {
  sessions: SessionSummary[];
}

export type PhaseWithModules = Phase & { modules: ModuleWithSessions[] };

export type SessionProgressStatus = 'in_progress' | 'completed';

export interface SessionProgressRecord {
  sessionId: string;
  status: SessionProgressStatus;
  startedAt: string;
  completedAt: string | null;
}

export interface ModuleProgressSummary {
  moduleId: string;
  moduleSlug: string;
  moduleTitle: string;
  completedSessions: number;
  /** 公開セッションのみを分母にする（未公開コンテンツで学習者が不利にならない） */
  totalSessions: number;
}

export interface ProgressOverview {
  /** 学習者の進捗記録（未公開セッション分も含む。表示側で公開ツリーと突き合わせる） */
  sessions: SessionProgressRecord[];
  modules: ModuleProgressSummary[];
  overall: { completedSessions: number; totalSessions: number };
}

// --- admin 入力型 ---

export interface CreateModuleInput {
  phaseId: string;
  slug: string;
  title: string;
  description?: string | null;
  weekNumber: number;
  orderIndex?: number;
  isPublished?: boolean;
}

export interface UpdateModuleInput {
  slug?: string;
  title?: string;
  description?: string | null;
  weekNumber?: number;
  phaseId?: string;
  orderIndex?: number;
  isPublished?: boolean;
}

export interface CreateSessionInput {
  moduleId: string;
  slug: string;
  title: string;
  description?: string | null;
  content: string;
  durationMinutes: number;
  objectives: string[];
  orderIndex?: number;
  isPublished?: boolean;
}

export interface UpdateSessionInput {
  slug?: string;
  title?: string;
  description?: string | null;
  content?: string;
  durationMinutes?: number;
  objectives?: string[];
  orderIndex?: number;
  isPublished?: boolean;
}

export interface LearningRepository {
  // --- 読み取り（公開） ---

  /** phases → modules → sessions のツリー。includeUnpublished=false では公開品のみ */
  getCurriculumTree(includeUnpublished: boolean): Promise<PhaseWithModules[]>;

  findModuleBySlug(slug: string, includeUnpublished: boolean): Promise<ModuleWithSessions | null>;

  /**
   * slug で本文付きセッションを検索。
   * includeUnpublished=false ではセッションまたは親モジュールが未公開なら null
   */
  findSessionBySlug(slug: string, includeUnpublished: boolean): Promise<SessionDetail | null>;

  findSessionById(id: string): Promise<SessionDetail | null>;

  getPhases(): Promise<Phase[]>;

  // --- 管理（content_administrator） ---

  createModule(input: CreateModuleInput): Promise<ModuleSummary>;

  /** 更新対象が存在しない場合は null */
  updateModule(id: string, patch: UpdateModuleInput): Promise<ModuleSummary | null>;

  /** CASCADE でセッション・進捗も削除される。存在しない場合は false */
  deleteModule(id: string): Promise<boolean>;

  /** 同一 phase 内で隣と order_index を交換。端（移動先なし）は false */
  reorderModule(id: string, direction: 'up' | 'down'): Promise<boolean>;

  createSession(input: CreateSessionInput): Promise<SessionSummary>;

  updateSession(id: string, patch: UpdateSessionInput): Promise<SessionSummary | null>;

  deleteSession(id: string): Promise<boolean>;

  reorderSession(id: string, direction: 'up' | 'down'): Promise<boolean>;

  // --- 進捗 ---

  upsertProgress(
    learnerId: string,
    sessionId: string,
    status: SessionProgressStatus
  ): Promise<SessionProgressRecord>;

  getProgressOverview(learnerId: string): Promise<ProgressOverview>;
}
