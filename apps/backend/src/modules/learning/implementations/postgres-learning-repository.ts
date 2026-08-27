/**
 * PostgreSQL Learning Repository Implementation (Neon)
 *
 * auth の postgres-user-repository と同じ慣行:
 * - neon() HTTP ドライバ（クエリ毎に独立した fetch。Pool の WebSocket を
 *   Workers のリクエスト横断で再利用すると "Cannot perform I/O on behalf of a
 *   different request" で 500 になるため、接続を保持しない HTTP ドライバを使う）
 * - rowCount は RETURNING 付き SQL でのみ正確（削除件数は CTE で取得）
 * - JSONB は JSON.stringify + $n::jsonb キャスト
 * - トランザクション不可のため、reorder は SELECT 隣接 → 単一 UPDATE CASE の2文
 *
 * テーブル定義は scripts/init-learning-db.mjs を参照。
 */

import { neon, NeonQueryFunction } from '@neondatabase/serverless';
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

interface PhaseRow {
  number: number;
  title: string;
  description: string | null;
  start_week: number;
  end_week: number;
}

interface ModuleRow {
  id: string;
  phase_id: string;
  slug: string;
  title: string;
  description: string | null;
  week_number: number;
  order_index: number;
  is_published: boolean;
}

interface SessionRow {
  id: string;
  module_id: string;
  slug: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  objectives: string[] | string;
  order_index: number;
  is_published: boolean;
  content?: string;
}

interface SessionWithModuleRow extends SessionRow {
  module_slug: string;
  module_title: string;
}

interface ProgressRow {
  session_id: string;
  status: SessionProgressStatus;
  started_at: Date | string;
  completed_at: Date | string | null;
}

interface ModuleCountRow {
  module_id: string;
  module_slug: string;
  module_title: string;
  total: number;
  completed: number;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toIsoOrNull(value: Date | string | null): string | null {
  return value === null ? null : toIso(value);
}

/** JSONB はドライバによって object または文字列で来るため両対応 */
function parseObjectives(raw: string[] | string): string[] {
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rowToModule(row: ModuleRow): ModuleSummary {
  return {
    id: row.id,
    phaseId: row.phase_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    weekNumber: row.week_number,
    orderIndex: row.order_index,
    isPublished: row.is_published,
  };
}

function rowToSession(row: SessionRow): SessionSummary {
  return {
    id: row.id,
    moduleId: row.module_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    durationMinutes: row.duration_minutes,
    objectives: parseObjectives(row.objectives),
    orderIndex: row.order_index,
    isPublished: row.is_published,
  };
}

function rowToSessionDetail(row: SessionWithModuleRow): SessionDetail {
  return {
    ...rowToSession(row),
    content: row.content ?? '',
    moduleSlug: row.module_slug,
    moduleTitle: row.module_title,
  };
}

function rowToProgress(row: ProgressRow): SessionProgressRecord {
  return {
    sessionId: row.session_id,
    status: row.status,
    startedAt: toIso(row.started_at),
    completedAt: toIsoOrNull(row.completed_at),
  };
}

export class PostgresLearningRepository implements LearningRepository {
  private sql: NeonQueryFunction<false, false> | null = null;
  private connectionString: string;

  constructor(connectionString?: string) {
    this.connectionString = connectionString || process.env.DATABASE_URL || '';
    if (!this.connectionString) {
      throw new Error('DATABASE_URL is required for PostgresLearningRepository');
    }
  }

  /** 遅延初期化。pool.query 互換の { rows, rowCount } を返す */
  private async query<T>(
    text: string,
    params: unknown[] = []
  ): Promise<{ rows: T[]; rowCount: number }> {
    if (!this.sql) {
      this.sql = neon(this.connectionString);
    }
    const rows = (await this.sql.query(text, params)) as T[];
    return { rows, rowCount: rows.length };
  }

  // --- 読み取り（公開） ---

  async getCurriculumTree(includeUnpublished: boolean): Promise<PhaseWithModules[]> {
    // 3クエリ取得して TS 側で組み立て（LEFT JOIN 一発より読みやすく、
    // セッション0件のモジュールも自然に扱える。ブラウザ Cache で呼出頻度は緩和）
    const { rows: phaseRows } = await this.query<PhaseRow & { id: string }>(
      `SELECT id, number, title, description, start_week, end_week FROM phases ORDER BY number`
    );
    const { rows: moduleRows } = await this.query<ModuleRow>(
      `SELECT id, phase_id, slug, title, description, week_number, order_index, is_published
       FROM curriculum_modules
       WHERE ($1::boolean OR is_published)
       ORDER BY order_index, week_number`,
      [includeUnpublished]
    );
    const { rows: sessionRows } = await this.query<SessionRow>(
      `SELECT id, module_id, slug, title, description, duration_minutes, objectives,
              order_index, is_published
       FROM learning_sessions
       WHERE ($1::boolean OR is_published)
       ORDER BY module_id, order_index`,
      [includeUnpublished]
    );

    const sessionsByModule = new Map<string, SessionSummary[]>();
    for (const row of sessionRows) {
      const list = sessionsByModule.get(row.module_id) ?? [];
      list.push(rowToSession(row));
      sessionsByModule.set(row.module_id, list);
    }

    return phaseRows.map((phase) => ({
      id: phase.id,
      number: phase.number,
      title: phase.title,
      description: phase.description,
      startWeek: phase.start_week,
      endWeek: phase.end_week,
      modules: moduleRows
        .filter((m) => m.phase_id === phase.id)
        .map(rowToModule)
        .map((m) => ({ ...m, sessions: sessionsByModule.get(m.id) ?? [] })),
    }));
  }

  async findModuleBySlug(
    slug: string,
    includeUnpublished: boolean
  ): Promise<ModuleWithSessions | null> {
    const { rows } = await this.query<ModuleRow>(
      `SELECT id, phase_id, slug, title, description, week_number, order_index, is_published
       FROM curriculum_modules
       WHERE slug = $1 AND ($2::boolean OR is_published)`,
      [slug, includeUnpublished]
    );
    const module = rows[0];
    if (!module) return null;

    const { rows: sessionRows } = await this.query<SessionRow>(
      `SELECT id, module_id, slug, title, description, duration_minutes, objectives,
              order_index, is_published
       FROM learning_sessions
       WHERE module_id = $1 AND ($2::boolean OR is_published)
       ORDER BY order_index`,
      [module.id, includeUnpublished]
    );
    return { ...rowToModule(module), sessions: sessionRows.map(rowToSession) };
  }

  async findSessionBySlug(
    slug: string,
    includeUnpublished: boolean
  ): Promise<SessionDetail | null> {
    const { rows } = await this.query<SessionWithModuleRow>(
      `SELECT s.id, s.module_id, s.slug, s.title, s.description, s.duration_minutes,
              s.objectives, s.order_index, s.is_published, s.content,
              m.slug AS module_slug, m.title AS module_title
       FROM learning_sessions s
       JOIN curriculum_modules m ON m.id = s.module_id
       WHERE s.slug = $1
         AND ($2::boolean OR (s.is_published AND m.is_published))`,
      [slug, includeUnpublished]
    );
    return rows[0] ? rowToSessionDetail(rows[0]) : null;
  }

  async findSessionById(id: string): Promise<SessionDetail | null> {
    const { rows } = await this.query<SessionWithModuleRow>(
      `SELECT s.id, s.module_id, s.slug, s.title, s.description, s.duration_minutes,
              s.objectives, s.order_index, s.is_published, s.content,
              m.slug AS module_slug, m.title AS module_title
       FROM learning_sessions s
       JOIN curriculum_modules m ON m.id = s.module_id
       WHERE s.id = $1`,
      [id]
    );
    return rows[0] ? rowToSessionDetail(rows[0]) : null;
  }

  async getPhases(): Promise<Phase[]> {
    const { rows } = await this.query<PhaseRow & { id: string }>(
      `SELECT id, number, title, description, start_week, end_week FROM phases ORDER BY number`
    );
    return rows.map((row) => ({
      id: row.id,
      number: row.number,
      title: row.title,
      description: row.description,
      startWeek: row.start_week,
      endWeek: row.end_week,
    }));
  }

  // --- 管理 ---

  async createModule(input: CreateModuleInput): Promise<ModuleSummary> {
    // order_index 未指定時は同一 phase 内の最大値+1
    const { rows } = await this.query<ModuleRow>(
      `INSERT INTO curriculum_modules (id, phase_id, slug, title, description,
                                       week_number, order_index, is_published)
       VALUES ($1, $2, $3, $4, $5, $6,
               COALESCE($7::int, (SELECT COALESCE(MAX(order_index), 0) + 1
                                  FROM curriculum_modules WHERE phase_id = $2)),
               COALESCE($8::boolean, FALSE))
       RETURNING id, phase_id, slug, title, description, week_number, order_index, is_published`,
      [
        crypto.randomUUID(),
        input.phaseId,
        input.slug,
        input.title,
        input.description ?? null,
        input.weekNumber,
        input.orderIndex ?? null,
        input.isPublished ?? null,
      ]
    );
    return rowToModule(rows[0]);
  }

  async updateModule(id: string, patch: UpdateModuleInput): Promise<ModuleSummary | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const columns: Array<[keyof UpdateModuleInput, string]> = [
      ['slug', 'slug'],
      ['title', 'title'],
      ['description', 'description'],
      ['weekNumber', 'week_number'],
      ['phaseId', 'phase_id'],
      ['orderIndex', 'order_index'],
      ['isPublished', 'is_published'],
    ];

    for (const [field, column] of columns) {
      if (field in patch && patch[field] !== undefined) {
        const value = patch[field];
        if (value === null && field === 'description') {
          // NULL はプレースホルダなしで直接（$N を消費しない）
          sets.push(`${column} = NULL`);
        } else {
          sets.push(`${column} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }
    }

    if (sets.length === 0) {
      return this.findModuleByIdInternal(id);
    }

    sets.push('updated_at = now()');
    values.push(id);

    const { rows } = await this.query<ModuleRow>(
      `UPDATE curriculum_modules SET ${sets.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, phase_id, slug, title, description, week_number, order_index, is_published`,
      values
    );
    return rows[0] ? rowToModule(rows[0]) : null;
  }

  private async findModuleByIdInternal(id: string): Promise<ModuleSummary | null> {
    const { rows } = await this.query<ModuleRow>(
      `SELECT id, phase_id, slug, title, description, week_number, order_index, is_published
       FROM curriculum_modules WHERE id = $1`,
      [id]
    );
    return rows[0] ? rowToModule(rows[0]) : null;
  }

  async deleteModule(id: string): Promise<boolean> {
    const { rows } = await this.query(
      `WITH deleted AS (DELETE FROM curriculum_modules WHERE id = $1 RETURNING 1)
       SELECT count(*)::int AS count FROM deleted`,
      [id]
    );
    return ((rows[0] as { count: number } | undefined)?.count ?? 0) > 0;
  }

  async reorderModule(id: string, direction: 'up' | 'down'): Promise<boolean> {
    const neighbor = await this.findNeighbor('curriculum_modules', id, direction, 'phase_id');
    if (!neighbor) return false;

    await this.query(
      `UPDATE curriculum_modules
       SET order_index = CASE id WHEN $1 THEN $2 WHEN $3 THEN $4 END, updated_at = now()
       WHERE id IN ($1, $3)`,
      [id, neighbor.neighborIndex, neighbor.id, neighbor.thisIndex]
    );
    return true;
  }

  async createSession(input: CreateSessionInput): Promise<SessionSummary> {
    const { rows } = await this.query<SessionRow>(
      `INSERT INTO learning_sessions (id, module_id, slug, title, description, content,
                                      duration_minutes, objectives, order_index, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb,
               COALESCE($9::int, (SELECT COALESCE(MAX(order_index), 0) + 1
                                  FROM learning_sessions WHERE module_id = $2)),
               COALESCE($10::boolean, FALSE))
       RETURNING id, module_id, slug, title, description, duration_minutes, objectives,
                 order_index, is_published`,
      [
        crypto.randomUUID(),
        input.moduleId,
        input.slug,
        input.title,
        input.description ?? null,
        input.content,
        input.durationMinutes,
        JSON.stringify(input.objectives),
        input.orderIndex ?? null,
        input.isPublished ?? null,
      ]
    );
    return rowToSession(rows[0]);
  }

  async updateSession(id: string, patch: UpdateSessionInput): Promise<SessionSummary | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const columns: Array<[keyof UpdateSessionInput, string, boolean]> = [
      ['slug', 'slug', false],
      ['title', 'title', false],
      ['description', 'description', false],
      ['content', 'content', false],
      ['durationMinutes', 'duration_minutes', false],
      ['objectives', 'objectives', true],
      ['orderIndex', 'order_index', false],
      ['isPublished', 'is_published', false],
    ];

    for (const [field, column, isJsonb] of columns) {
      if (field in patch && patch[field] !== undefined) {
        const value = patch[field];
        if (value === null && field === 'description') {
          sets.push(`${column} = NULL`);
        } else {
          sets.push(`${column} = $${paramIndex}${isJsonb ? '::jsonb' : ''}`);
          values.push(isJsonb ? JSON.stringify(value) : value);
          paramIndex++;
        }
      }
    }

    if (sets.length === 0) {
      const found = await this.findSessionById(id);
      return found
        ? {
            id: found.id,
            moduleId: found.moduleId,
            slug: found.slug,
            title: found.title,
            description: found.description,
            durationMinutes: found.durationMinutes,
            objectives: found.objectives,
            orderIndex: found.orderIndex,
            isPublished: found.isPublished,
          }
        : null;
    }

    sets.push('updated_at = now()');
    values.push(id);

    const { rows } = await this.query<SessionRow>(
      `UPDATE learning_sessions SET ${sets.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, module_id, slug, title, description, duration_minutes, objectives,
                 order_index, is_published`,
      values
    );
    return rows[0] ? rowToSession(rows[0]) : null;
  }

  async deleteSession(id: string): Promise<boolean> {
    const { rows } = await this.query(
      `WITH deleted AS (DELETE FROM learning_sessions WHERE id = $1 RETURNING 1)
       SELECT count(*)::int AS count FROM deleted`,
      [id]
    );
    return ((rows[0] as { count: number } | undefined)?.count ?? 0) > 0;
  }

  async reorderSession(id: string, direction: 'up' | 'down'): Promise<boolean> {
    const neighbor = await this.findNeighbor('learning_sessions', id, direction, 'module_id');
    if (!neighbor) return false;

    await this.query(
      `UPDATE learning_sessions
       SET order_index = CASE id WHEN $1 THEN $2 WHEN $3 THEN $4 END, updated_at = now()
       WHERE id IN ($1, $3)`,
      [id, neighbor.neighborIndex, neighbor.id, neighbor.thisIndex]
    );
    return true;
  }

  /**
   * reorder 用に隣接行（同親内で direction 側の直近）を探す。
   * トランザクションが使えないため SELECT → UPDATE の2文だが、
   * order_index の交換は冪等であり競合時も壊れない。
   */
  private async findNeighbor(
    table: 'curriculum_modules' | 'learning_sessions',
    id: string,
    direction: 'up' | 'down',
    parentColumn: 'phase_id' | 'module_id'
  ): Promise<{ id: string; thisIndex: number; neighborIndex: number } | null> {
    const { rows } = await this.query<{
      id: string;
      neighbor_id: string | null;
      this_index: number;
      neighbor_index: number | null;
    }>(
      `SELECT t.id,
              n.id AS neighbor_id,
              t.order_index AS this_index,
              n.order_index AS neighbor_index
       FROM ${table} t
       LEFT JOIN ${table} n ON n.${parentColumn} = t.${parentColumn}
         AND n.order_index ${direction === 'up' ? '<' : '>'} t.order_index
         AND NOT EXISTS (
           SELECT 1 FROM ${table} x
           WHERE x.${parentColumn} = t.${parentColumn}
             AND x.order_index ${direction === 'up' ? '<' : '>'} t.order_index
             AND x.order_index ${direction === 'up' ? '>' : '<'} n.order_index
         )
       WHERE t.id = $1`,
      [id]
    );
    const row = rows[0];
    if (!row || !row.neighbor_id) return null;
    return {
      id: row.neighbor_id,
      thisIndex: row.this_index,
      neighborIndex: row.neighbor_index ?? row.this_index,
    };
  }

  // --- 進捗 ---

  async upsertProgress(
    learnerId: string,
    sessionId: string,
    status: SessionProgressStatus
  ): Promise<SessionProgressRecord> {
    const { rows } = await this.query<ProgressRow>(
      `INSERT INTO session_progress (learner_id, session_id, status, completed_at)
       VALUES ($1, $2, $3, CASE WHEN $3 = 'completed' THEN now() ELSE NULL END)
       ON CONFLICT (learner_id, session_id) DO UPDATE SET
         status = EXCLUDED.status,
         completed_at = CASE WHEN EXCLUDED.status = 'completed' THEN now() ELSE NULL END
       RETURNING session_id, status, started_at, completed_at`,
      [learnerId, sessionId, status]
    );
    return rowToProgress(rows[0]);
  }

  async getProgressOverview(learnerId: string): Promise<ProgressOverview> {
    const { rows: progressRows } = await this.query<ProgressRow>(
      `SELECT session_id, status, started_at, completed_at
       FROM session_progress WHERE learner_id = $1`,
      [learnerId]
    );

    const { rows: countRows } = await this.query<ModuleCountRow>(
      `SELECT m.id AS module_id, m.slug AS module_slug, m.title AS module_title,
              count(s.id)::int AS total,
              count(p.session_id)::int AS completed
       FROM curriculum_modules m
       LEFT JOIN learning_sessions s ON s.module_id = m.id AND s.is_published
       LEFT JOIN session_progress p
         ON p.session_id = s.id AND p.learner_id = $1 AND p.status = 'completed'
       WHERE m.is_published
       GROUP BY m.id, m.slug, m.title, m.week_number, m.order_index
       HAVING count(s.id) > 0
       ORDER BY m.week_number, m.order_index`,
      [learnerId]
    );

    const modules: ModuleProgressSummary[] = countRows.map((row) => ({
      moduleId: row.module_id,
      moduleSlug: row.module_slug,
      moduleTitle: row.module_title,
      completedSessions: row.completed,
      totalSessions: row.total,
    }));

    const completedSessions = modules.reduce((sum, m) => sum + m.completedSessions, 0);
    const totalSessions = modules.reduce((sum, m) => sum + m.totalSessions, 0);

    return {
      sessions: progressRows.map(rowToProgress),
      modules,
      overall: { completedSessions, totalSessions },
    };
  }
}
