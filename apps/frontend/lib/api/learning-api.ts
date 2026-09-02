/**
 * learning API クライアント
 *
 * カリキュラム読み取りは全公開（Bearer 無しでも可。apiFetch は token が
 * あれば付与するだけで無害）。進捗は要認証。
 * 型は apps/backend/src/modules/learning/interfaces/learning-repository.ts と同期。
 */

import { apiFetch } from './auth-api';

export type SessionProgressStatus = 'in_progress' | 'completed';

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
  /** Week 2 以降（有料週）で true。未設定＝無料扱い */
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

export interface PhaseWithModules extends Phase {
  modules: Array<ModuleSummary & { sessions: SessionSummary[] }>;
}

export interface ModuleWithSessions extends ModuleSummary {
  sessions: SessionSummary[];
}

export interface SessionDetail extends SessionSummary {
  content: string;
  moduleSlug: string;
  moduleTitle: string;
  /** 親モジュールの週番号（未設定時は無料扱い） */
  moduleWeekNumber?: number;
}

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
  totalSessions: number;
}

export interface ProgressOverview {
  sessions: SessionProgressRecord[];
  modules: ModuleProgressSummary[];
  overall: { completedSessions: number; totalSessions: number };
}

export const learningApi = {
  /** カリキュラム全体（phases → modules → sessions の要約ツリー） */
  getCurriculum(): Promise<PhaseWithModules[]> {
    return apiFetch<{ phases: PhaseWithModules[] }>('/api/learning/curriculum').then((d) => d.phases);
  },

  getModule(slug: string): Promise<ModuleWithSessions> {
    return apiFetch<{ module: ModuleWithSessions }>(`/api/learning/modules/${encodeURIComponent(slug)}`).then(
      (d) => d.module,
    );
  },

  getSession(slug: string): Promise<SessionDetail> {
    return apiFetch<{ session: SessionDetail }>(`/api/learning/sessions/${encodeURIComponent(slug)}`).then(
      (d) => d.session,
    );
  },

  getProgress(): Promise<ProgressOverview> {
    return apiFetch<ProgressOverview>('/api/learning/progress');
  },

  setProgress(sessionId: string, status: SessionProgressStatus): Promise<SessionProgressRecord> {
    return apiFetch<{ progress: SessionProgressRecord }>(
      `/api/learning/progress/sessions/${encodeURIComponent(sessionId)}`,
      { method: 'PUT', body: JSON.stringify({ status }) },
    ).then((d) => d.progress);
  },
};

// ---------------------------------------------------------------------------
// 管理 API（content_administrator / system_admin 専用）
// backend interfaces/CreateModuleInput 等と同期
// ---------------------------------------------------------------------------

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

export const learningAdminApi = {
  /** 未公開込みのカリキュラム全ツリー */
  getCurriculum(): Promise<PhaseWithModules[]> {
    return apiFetch<{ phases: PhaseWithModules[] }>('/api/learning/admin/curriculum').then((d) => d.phases);
  },

  /** セッション詳細（未公開も取得可） */
  getSession(id: string): Promise<SessionDetail> {
    return apiFetch<{ session: SessionDetail }>(`/api/learning/admin/sessions/${encodeURIComponent(id)}`).then(
      (d) => d.session,
    );
  },

  createModule(input: CreateModuleInput): Promise<ModuleSummary> {
    return apiFetch<{ module: ModuleSummary }>('/api/learning/admin/modules', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((d) => d.module);
  },

  updateModule(id: string, patch: UpdateModuleInput): Promise<ModuleSummary> {
    return apiFetch<{ module: ModuleSummary }>(`/api/learning/admin/modules/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }).then((d) => d.module);
  },

  deleteModule(id: string): Promise<void> {
    return apiFetch<void>(`/api/learning/admin/modules/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  /** 端（移動先なし）の場合は moved:false */
  reorderModule(id: string, direction: 'up' | 'down'): Promise<boolean> {
    return apiFetch<{ moved: boolean }>(`/api/learning/admin/modules/${encodeURIComponent(id)}/reorder`, {
      method: 'POST',
      body: JSON.stringify({ direction }),
    }).then((d) => d.moved);
  },

  createSession(input: CreateSessionInput): Promise<SessionSummary> {
    return apiFetch<{ session: SessionSummary }>('/api/learning/admin/sessions', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((d) => d.session);
  },

  updateSession(id: string, patch: UpdateSessionInput): Promise<SessionSummary> {
    return apiFetch<{ session: SessionSummary }>(`/api/learning/admin/sessions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }).then((d) => d.session);
  },

  deleteSession(id: string): Promise<void> {
    return apiFetch<void>(`/api/learning/admin/sessions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  reorderSession(id: string, direction: 'up' | 'down'): Promise<boolean> {
    return apiFetch<{ moved: boolean }>(`/api/learning/admin/sessions/${encodeURIComponent(id)}/reorder`, {
      method: 'POST',
      body: JSON.stringify({ direction }),
    }).then((d) => d.moved);
  },
};
