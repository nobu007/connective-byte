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
