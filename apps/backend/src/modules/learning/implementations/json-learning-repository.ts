/**
 * JSON File-based Learning Repository Implementation
 *
 * ローカル開発・テスト用（DATABASE_URL 未設定時に container が選択）。
 * auth の JsonUserRepository と同じファイル永続化パターン。
 * phases は init script 相当の3 Phase を initialize 時に自動シードする。
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import {
  LearningRepository,
  Phase,
  PhaseWithModules,
  ModuleSummary,
  ModuleWithSessions,
  SessionSummary,
  SessionDetail,
  SessionProgressRecord,
  SessionProgressStatus,
  ProgressOverview,
  ModuleProgressSummary,
  CreateModuleInput,
  UpdateModuleInput,
  CreateSessionInput,
  UpdateSessionInput,
} from '../interfaces/learning-repository';

/** init-learning-db.mjs のシードと同一内容（Postgres 側との一貫性） */
const DEFAULT_PHASES: Array<Phase & { id: string }> = [
  {
    id: '00000000-0000-4000-8000-000000000000',
    number: 0,
    title: 'はじめに',
    description: '購入前に読む、このコースの価値と使い方',
    startWeek: 0,
    endWeek: 0,
  },
  {
    id: '00000000-0000-4000-8000-000000000001',
    number: 1,
    title: '個人思考OS構築',
    description: '思考プロセスの可視化からAI協働まで、個人の思考基盤を築く',
    startWeek: 1,
    endWeek: 4,
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    number: 2,
    title: 'チーム協働システム',
    description: '思考の共有とプロトコル統一でチーム協働を実現する',
    startWeek: 5,
    endWeek: 8,
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    number: 3,
    title: '組織実装・スケール',
    description: '部門間連携と継続改善システムで組織に展開する',
    startWeek: 9,
    endWeek: 12,
  },
];

interface StoredModule extends ModuleSummary {}
interface StoredSession extends SessionSummary {
  content: string;
}
interface StoredProgress {
  learnerId: string;
  sessionId: string;
  status: SessionProgressStatus;
  startedAt: string;
  completedAt: string | null;
}

interface Database {
  phases: Array<Phase & { id: string }>;
  modules: StoredModule[];
  sessions: StoredSession[];
  progress: StoredProgress[];
}

function nowIso(): string {
  return new Date().toISOString();
}

export class JsonLearningRepository implements LearningRepository {
  private dbPath: string;
  private data: Database;
  private loaded = false;

  constructor(
    dbPath: string = process.env.LEARNING_DB_PATH ||
      path.join(process.cwd(), 'data/learning', 'learning.json')
  ) {
    this.dbPath = dbPath;
    this.data = { phases: [], modules: [], sessions: [], progress: [] };
  }

  private async initialize(): Promise<void> {
    if (this.loaded) return;

    const exists = await fs
      .access(this.dbPath)
      .then(() => true)
      .catch(() => false);
    if (exists) {
      const parsed = JSON.parse(await fs.readFile(this.dbPath, 'utf-8'));
      this.data = {
        phases: parsed.phases?.length ? parsed.phases : DEFAULT_PHASES,
        modules: parsed.modules ?? [],
        sessions: parsed.sessions ?? [],
        progress: parsed.progress ?? [],
      };
    } else {
      this.data = {
        phases: DEFAULT_PHASES,
        modules: [],
        sessions: [],
        progress: [],
      };
      await this.save();
    }
    this.loaded = true;
  }

  private async save(): Promise<void> {
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
    await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  private sessionsOfModule(moduleId: string): SessionSummary[] {
    return this.data.sessions
      .filter((s) => s.moduleId === moduleId)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(({ content: _content, ...summary }) => summary);
  }

  // --- 読み取り（公開） ---

  async getCurriculumTree(includeUnpublished: boolean): Promise<PhaseWithModules[]> {
    await this.initialize();
    return this.data.phases
      .slice()
      .sort((a, b) => a.number - b.number)
      .map((phase) => ({
        id: phase.id,
        number: phase.number,
        title: phase.title,
        description: phase.description,
        startWeek: phase.startWeek,
        endWeek: phase.endWeek,
        modules: this.data.modules
          .filter((m) => m.phaseId === phase.id && (includeUnpublished || m.isPublished))
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((m) => ({
            ...m,
            sessions: this.sessionsOfModule(m.id).filter(
              (s) => includeUnpublished || s.isPublished
            ),
          })),
      }));
  }

  async findModuleBySlug(
    slug: string,
    includeUnpublished: boolean
  ): Promise<ModuleWithSessions | null> {
    await this.initialize();
    const module = this.data.modules.find((m) => m.slug === slug);
    if (!module || (!includeUnpublished && !module.isPublished)) return null;
    return {
      ...module,
      sessions: this.sessionsOfModule(module.id).filter((s) => includeUnpublished || s.isPublished),
    };
  }

  async findSessionBySlug(
    slug: string,
    includeUnpublished: boolean
  ): Promise<SessionDetail | null> {
    await this.initialize();
    const session = this.data.sessions.find((s) => s.slug === slug);
    if (!session) return null;
    const module = this.data.modules.find((m) => m.id === session.moduleId);
    if (!module) return null;
    // 公開ビューではセッションと親モジュールの両方が公開されている必要がある
    if (!includeUnpublished && (!session.isPublished || !module.isPublished)) {
      return null;
    }
    const { content, ...summary } = session;
    return {
      ...summary,
      content,
      moduleSlug: module.slug,
      moduleTitle: module.title,
      moduleWeekNumber: module.weekNumber,
    };
  }

  async findSessionById(id: string): Promise<SessionDetail | null> {
    await this.initialize();
    const session = this.data.sessions.find((s) => s.id === id);
    if (!session) return null;
    const module = this.data.modules.find((m) => m.id === session.moduleId);
    if (!module) return null;
    const { content, ...summary } = session;
    return {
      ...summary,
      content,
      moduleSlug: module.slug,
      moduleTitle: module.title,
      moduleWeekNumber: module.weekNumber,
    };
  }

  async getPhases(): Promise<Phase[]> {
    await this.initialize();
    return this.data.phases
      .slice()
      .sort((a, b) => a.number - b.number)
      .map((phase) => ({ ...phase }));
  }

  // --- 管理 ---

  async createModule(input: CreateModuleInput): Promise<ModuleSummary> {
    await this.initialize();
    const maxIndex = Math.max(
      0,
      ...this.data.modules.filter((m) => m.phaseId === input.phaseId).map((m) => m.orderIndex)
    );
    const module: StoredModule = {
      id: crypto.randomUUID(),
      phaseId: input.phaseId,
      slug: input.slug,
      title: input.title,
      description: input.description ?? null,
      weekNumber: input.weekNumber,
      orderIndex: input.orderIndex ?? maxIndex + 1,
      isPublished: input.isPublished ?? false,
    };
    this.data.modules.push(module);
    await this.save();
    return { ...module };
  }

  async updateModule(id: string, patch: UpdateModuleInput): Promise<ModuleSummary | null> {
    await this.initialize();
    const module = this.data.modules.find((m) => m.id === id);
    if (!module) return null;
    Object.assign(module, { ...patch, description: patch.description ?? module.description });
    await this.save();
    return { ...module };
  }

  async deleteModule(id: string): Promise<boolean> {
    await this.initialize();
    const before = this.data.modules.length;
    const sessionIds = this.data.sessions.filter((s) => s.moduleId === id).map((s) => s.id);
    this.data.modules = this.data.modules.filter((m) => m.id !== id);
    this.data.sessions = this.data.sessions.filter((s) => s.moduleId !== id);
    // sessions の CASCADE 相当（進捗も削除）
    this.data.progress = this.data.progress.filter((p) => !sessionIds.includes(p.sessionId));
    const changed = this.data.modules.length < before;
    if (changed) await this.save();
    return changed;
  }

  async reorderModule(id: string, direction: 'up' | 'down'): Promise<boolean> {
    await this.initialize();
    const module = this.data.modules.find((m) => m.id === id);
    if (!module) return false;
    const siblings = this.data.modules
      .filter((m) => m.phaseId === module.phaseId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    const pos = siblings.findIndex((m) => m.id === id);
    const targetPos = direction === 'up' ? pos - 1 : pos + 1;
    if (targetPos < 0 || targetPos >= siblings.length) return false;
    // 配列位置を入れ替えてから 1..n に採番し直す（重複 order_index を解消）
    const swapped = [...siblings];
    swapped[pos] = siblings[targetPos];
    swapped[targetPos] = siblings[pos];
    swapped.forEach((m, i) => {
      const row = this.data.modules.find((x) => x.id === m.id);
      if (row) row.orderIndex = i + 1;
    });
    await this.save();
    return true;
  }

  async createSession(input: CreateSessionInput): Promise<SessionSummary> {
    await this.initialize();
    const maxIndex = Math.max(
      0,
      ...this.data.sessions.filter((s) => s.moduleId === input.moduleId).map((s) => s.orderIndex)
    );
    const session: StoredSession = {
      id: crypto.randomUUID(),
      moduleId: input.moduleId,
      slug: input.slug,
      title: input.title,
      description: input.description ?? null,
      content: input.content,
      durationMinutes: input.durationMinutes,
      objectives: input.objectives,
      orderIndex: input.orderIndex ?? maxIndex + 1,
      isPublished: input.isPublished ?? false,
    };
    this.data.sessions.push(session);
    await this.save();
    const { content: _content, ...summary } = session;
    return summary;
  }

  async updateSession(id: string, patch: UpdateSessionInput): Promise<SessionSummary | null> {
    await this.initialize();
    const session = this.data.sessions.find((s) => s.id === id);
    if (!session) return null;
    Object.assign(session, { ...patch, description: patch.description ?? session.description });
    await this.save();
    const { content: _content, ...summary } = session;
    return summary;
  }

  async deleteSession(id: string): Promise<boolean> {
    await this.initialize();
    const before = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter((s) => s.id !== id);
    this.data.progress = this.data.progress.filter((p) => p.sessionId !== id);
    const changed = this.data.sessions.length < before;
    if (changed) await this.save();
    return changed;
  }

  async reorderSession(id: string, direction: 'up' | 'down'): Promise<boolean> {
    await this.initialize();
    const session = this.data.sessions.find((s) => s.id === id);
    if (!session) return false;
    const siblings = this.data.sessions
      .filter((s) => s.moduleId === session.moduleId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    const pos = siblings.findIndex((s) => s.id === id);
    const targetPos = direction === 'up' ? pos - 1 : pos + 1;
    if (targetPos < 0 || targetPos >= siblings.length) return false;
    // 配列位置を入れ替えてから 1..n に採番し直す（module と同じ手法）
    const swapped = [...siblings];
    swapped[pos] = siblings[targetPos];
    swapped[targetPos] = siblings[pos];
    swapped.forEach((s, i) => {
      const row = this.data.sessions.find((x) => x.id === s.id);
      if (row) row.orderIndex = i + 1;
    });
    await this.save();
    return true;
  }

  // --- 進捗 ---

  async upsertProgress(
    learnerId: string,
    sessionId: string,
    status: SessionProgressStatus
  ): Promise<SessionProgressRecord> {
    await this.initialize();
    const existing = this.data.progress.find(
      (p) => p.learnerId === learnerId && p.sessionId === sessionId
    );
    const timestamp = nowIso();
    if (existing) {
      existing.status = status;
      // 完了→in_progress の「解除」では completed_at をクリア。started_at は初回アクセス時刻を保持。
      // completed 再送は upsert 冪等に初回完了時刻を保持（postgres 実装の COALESCE と同期）
      existing.completedAt = status === 'completed' ? (existing.completedAt ?? timestamp) : null;
      await this.save();
      return this.toRecord(existing);
    }
    const created: StoredProgress = {
      learnerId,
      sessionId,
      status,
      startedAt: timestamp,
      completedAt: status === 'completed' ? timestamp : null,
    };
    this.data.progress.push(created);
    await this.save();
    return this.toRecord(created);
  }

  private toRecord(p: StoredProgress): SessionProgressRecord {
    return {
      sessionId: p.sessionId,
      status: p.status,
      startedAt: p.startedAt,
      completedAt: p.completedAt,
    };
  }

  async getProgressOverview(learnerId: string): Promise<ProgressOverview> {
    await this.initialize();
    const sessions: SessionProgressRecord[] = this.data.progress
      .filter((p) => p.learnerId === learnerId)
      .map((p) => this.toRecord(p));

    const modules: ModuleProgressSummary[] = this.data.modules
      .filter((m) => m.isPublished)
      .map((m) => {
        const published = this.sessionsOfModule(m.id).filter((s) => s.isPublished);
        const completed = published.filter((s) =>
          this.data.progress.some(
            (p) => p.learnerId === learnerId && p.sessionId === s.id && p.status === 'completed'
          )
        ).length;
        return {
          moduleId: m.id,
          moduleSlug: m.slug,
          moduleTitle: m.title,
          completedSessions: completed,
          totalSessions: published.length,
        };
      })
      .filter((m) => m.totalSessions > 0)
      .sort((a, b) => {
        const wa = this.data.modules.find((m) => m.id === a.moduleId)?.weekNumber ?? 0;
        const wb = this.data.modules.find((m) => m.id === b.moduleId)?.weekNumber ?? 0;
        return wa - wb;
      });

    const completedSessions = modules.reduce((sum, m) => sum + m.completedSessions, 0);
    const totalSessions = modules.reduce((sum, m) => sum + m.totalSessions, 0);
    return { sessions, modules, overall: { completedSessions, totalSessions } };
  }
}
