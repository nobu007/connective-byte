/**
 * Learning Service
 *
 * 公開読み取り・管理CRUD・reorder。入力検証はここに集約し、
 * 不正値は LearningError（code + httpStatus）で投げる。
 */

import {
  LearningRepository,
  PhaseWithModules,
  ModuleWithSessions,
  ModuleSummary,
  SessionDetail,
  SessionSummary,
  CreateModuleInput,
  UpdateModuleInput,
  CreateSessionInput,
  UpdateSessionInput,
} from '../interfaces/learning-repository';
import { LearningError } from '../errors';

const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_CONTENT_LENGTH = 1_000_000; // worker の body limit 1mb と対応
const MAX_OBJECTIVES = 20;
const MAX_OBJECTIVE_LENGTH = 300;

function validateSlug(slug: string): void {
  if (!SLUG_PATTERN.test(slug)) {
    throw new LearningError(
      'LEARNING_VALIDATION_001',
      'slug は半角英小文字・数字・ハイフン（最大80文字）で指定してください'
    );
  }
}

function validateTitle(title: unknown): asserts title is string {
  if (typeof title !== 'string' || title.trim().length === 0 || title.length > MAX_TITLE_LENGTH) {
    throw new LearningError(
      'LEARNING_VALIDATION_001',
      `title は必須（最大${MAX_TITLE_LENGTH}文字）です`
    );
  }
}

function validateDescription(description: unknown): string | null {
  if (description === undefined || description === null) return null;
  if (typeof description !== 'string' || description.length > MAX_DESCRIPTION_LENGTH) {
    throw new LearningError(
      'LEARNING_VALIDATION_001',
      `description は文字列（最大${MAX_DESCRIPTION_LENGTH}文字）で指定してください`
    );
  }
  return description;
}

function validateObjectives(objectives: unknown): string[] {
  if (objectives === undefined || objectives === null) return [];
  if (!Array.isArray(objectives)) {
    throw new LearningError('LEARNING_VALIDATION_001', 'objectives は文字列配列です');
  }
  if (objectives.length > MAX_OBJECTIVES) {
    throw new LearningError('LEARNING_VALIDATION_001', `objectives は最大${MAX_OBJECTIVES}件です`);
  }
  return objectives.map((o) => {
    if (typeof o !== 'string' || o.length === 0 || o.length > MAX_OBJECTIVE_LENGTH) {
      throw new LearningError(
        'LEARNING_VALIDATION_001',
        `各 objective は1〜${MAX_OBJECTIVE_LENGTH}文字の文字列です`
      );
    }
    return o;
  });
}

export class LearningService {
  constructor(private readonly repository: LearningRepository) {}

  // --- 公開読み取り ---

  getCurriculum(): Promise<PhaseWithModules[]> {
    return this.repository.getCurriculumTree(false);
  }

  async getModuleBySlug(slug: string): Promise<ModuleWithSessions> {
    const module = await this.repository.findModuleBySlug(slug, false);
    if (!module) {
      throw new LearningError('LEARNING_MODULE_001', 'モジュールが見つかりません', 404);
    }
    return module;
  }

  async getSessionBySlug(slug: string): Promise<SessionDetail> {
    const session = await this.repository.findSessionBySlug(slug, false);
    if (!session) {
      throw new LearningError('LEARNING_SESSION_001', 'セッションが見つかりません', 404);
    }
    return session;
  }

  /** 管理: 未公開込みの全ツリー */
  getAdminCurriculum(): Promise<PhaseWithModules[]> {
    return this.repository.getCurriculumTree(true);
  }

  async getAdminSession(id: string): Promise<SessionDetail> {
    const session = await this.repository.findSessionById(id);
    if (!session) {
      throw new LearningError('LEARNING_SESSION_001', 'セッションが見つかりません', 404);
    }
    return session;
  }

  // --- 管理: modules ---

  async createModule(input: {
    slug: unknown;
    title: unknown;
    description?: unknown;
    weekNumber: unknown;
    orderIndex?: unknown;
    isPublished?: unknown;
  }): Promise<ModuleSummary> {
    const slug = this.requireString(input.slug, 'slug');
    validateSlug(slug);
    validateTitle(input.title);
    const description = validateDescription(input.description);
    const weekNumber = this.validateWeekNumber(input.weekNumber);
    const orderIndex = this.validateOptionalIndex(input.orderIndex);
    const isPublished = this.validateOptionalBoolean(input.isPublished);

    if (await this.repository.findModuleBySlug(slug, true)) {
      throw new LearningError('LEARNING_MODULE_002', 'この slug のモジュールは既に存在します', 409);
    }

    const phaseId = await this.resolvePhaseId(weekNumber);
    return this.repository.createModule({
      phaseId,
      slug,
      title: input.title,
      description,
      weekNumber,
      orderIndex,
      isPublished,
    });
  }

  async updateModule(
    id: string,
    patch: {
      slug?: unknown;
      title?: unknown;
      description?: unknown;
      weekNumber?: unknown;
      orderIndex?: unknown;
      isPublished?: unknown;
    }
  ): Promise<ModuleSummary> {
    const update: UpdateModuleInput = {};

    if (patch.slug !== undefined) {
      const slug = this.requireString(patch.slug, 'slug');
      validateSlug(slug);
      const existing = await this.repository.findModuleBySlug(slug, true);
      if (existing && existing.id !== id) {
        throw new LearningError(
          'LEARNING_MODULE_002',
          'この slug のモジュールは既に存在します',
          409
        );
      }
      update.slug = slug;
    }
    if (patch.title !== undefined) {
      validateTitle(patch.title);
      update.title = patch.title;
    }
    if (patch.description !== undefined) {
      update.description = validateDescription(patch.description);
    }
    if (patch.weekNumber !== undefined) {
      const weekNumber = this.validateWeekNumber(patch.weekNumber);
      update.phaseId = await this.resolvePhaseId(weekNumber);
      update.weekNumber = weekNumber;
    }
    if (patch.orderIndex !== undefined) {
      update.orderIndex = this.validateOptionalIndex(patch.orderIndex);
    }
    if (patch.isPublished !== undefined) {
      update.isPublished = this.validateOptionalBoolean(patch.isPublished);
    }

    const updated = await this.repository.updateModule(id, update);
    if (!updated) {
      throw new LearningError('LEARNING_MODULE_001', 'モジュールが見つかりません', 404);
    }
    return updated;
  }

  async deleteModule(id: string): Promise<void> {
    const deleted = await this.repository.deleteModule(id);
    if (!deleted) {
      throw new LearningError('LEARNING_MODULE_001', 'モジュールが見つかりません', 404);
    }
  }

  async reorderModule(id: string, direction: unknown): Promise<boolean> {
    const dir = this.validateDirection(direction);
    return this.repository.reorderModule(id, dir);
  }

  // --- 管理: sessions ---

  async createSession(input: {
    moduleId: unknown;
    slug: unknown;
    title: unknown;
    description?: unknown;
    content: unknown;
    durationMinutes: unknown;
    objectives?: unknown;
    orderIndex?: unknown;
    isPublished?: unknown;
  }): Promise<SessionSummary> {
    const moduleId = this.requireString(input.moduleId, 'moduleId');
    const slug = this.requireString(input.slug, 'slug');
    validateSlug(slug);
    validateTitle(input.title);
    const description = validateDescription(input.description);
    const content = this.validateContent(input.content);
    const durationMinutes = this.validateDuration(input.durationMinutes);
    const objectives = validateObjectives(input.objectives);
    const orderIndex = this.validateOptionalIndex(input.orderIndex);
    const isPublished = this.validateOptionalBoolean(input.isPublished);

    if (await this.repository.findSessionBySlug(slug, true)) {
      throw new LearningError(
        'LEARNING_SESSION_002',
        'この slug のセッションは既に存在します',
        409
      );
    }
    // 親モジュールの存在確認（未公開でも管理上は登録可）
    const tree = await this.repository.getCurriculumTree(true);
    const exists = tree.some((p) => p.modules.some((m) => m.id === moduleId));
    if (!exists) {
      throw new LearningError('LEARNING_MODULE_001', '親モジュールが見つかりません', 404);
    }

    return this.repository.createSession({
      moduleId,
      slug,
      title: input.title,
      description,
      content,
      durationMinutes,
      objectives,
      orderIndex,
      isPublished,
    });
  }

  async updateSession(
    id: string,
    patch: {
      slug?: unknown;
      title?: unknown;
      description?: unknown;
      content?: unknown;
      durationMinutes?: unknown;
      objectives?: unknown;
      orderIndex?: unknown;
      isPublished?: unknown;
    }
  ): Promise<SessionSummary> {
    const update: UpdateSessionInput = {};

    if (patch.slug !== undefined) {
      const slug = this.requireString(patch.slug, 'slug');
      validateSlug(slug);
      const existing = await this.repository.findSessionBySlug(slug, true);
      if (existing && existing.id !== id) {
        throw new LearningError(
          'LEARNING_SESSION_002',
          'この slug のセッションは既に存在します',
          409
        );
      }
      update.slug = slug;
    }
    if (patch.title !== undefined) {
      validateTitle(patch.title);
      update.title = patch.title;
    }
    if (patch.description !== undefined) {
      update.description = validateDescription(patch.description);
    }
    if (patch.content !== undefined) {
      update.content = this.validateContent(patch.content);
    }
    if (patch.durationMinutes !== undefined) {
      update.durationMinutes = this.validateDuration(patch.durationMinutes);
    }
    if (patch.objectives !== undefined) {
      update.objectives = validateObjectives(patch.objectives);
    }
    if (patch.orderIndex !== undefined) {
      update.orderIndex = this.validateOptionalIndex(patch.orderIndex);
    }
    if (patch.isPublished !== undefined) {
      update.isPublished = this.validateOptionalBoolean(patch.isPublished);
    }

    const updated = await this.repository.updateSession(id, update);
    if (!updated) {
      throw new LearningError('LEARNING_SESSION_001', 'セッションが見つかりません', 404);
    }
    return updated;
  }

  async deleteSession(id: string): Promise<void> {
    const deleted = await this.repository.deleteSession(id);
    if (!deleted) {
      throw new LearningError('LEARNING_SESSION_001', 'セッションが見つかりません', 404);
    }
  }

  async reorderSession(id: string, direction: unknown): Promise<boolean> {
    const dir = this.validateDirection(direction);
    return this.repository.reorderSession(id, dir);
  }

  // --- 検証ヘルパ ---

  private requireString(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new LearningError('LEARNING_VALIDATION_001', `${field} は必須です`);
    }
    return value;
  }

  private validateWeekNumber(value: unknown): number {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(num) || num < 1 || num > 52) {
      throw new LearningError('LEARNING_VALIDATION_001', 'weekNumber は 1〜52 の整数です');
    }
    return num;
  }

  private validateDuration(value: unknown): number {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(num) || num < 0 || num > 24 * 60) {
      throw new LearningError('LEARNING_VALIDATION_001', 'durationMinutes は 0〜1440 の整数です');
    }
    return num;
  }

  private validateContent(value: unknown): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new LearningError('LEARNING_VALIDATION_001', 'content は必須です');
    }
    if (value.length > MAX_CONTENT_LENGTH) {
      throw new LearningError(
        'LEARNING_VALIDATION_001',
        `content は最大${MAX_CONTENT_LENGTH}文字です`
      );
    }
    return value;
  }

  private validateOptionalIndex(value: unknown): number | undefined {
    if (value === undefined || value === null) return undefined;
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(num) || num < 0) {
      throw new LearningError('LEARNING_VALIDATION_001', 'orderIndex は 0以上の整数です');
    }
    return num;
  }

  private validateOptionalBoolean(value: unknown): boolean | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'boolean') {
      throw new LearningError('LEARNING_VALIDATION_001', 'boolean 値を指定してください');
    }
    return value;
  }

  private validateDirection(value: unknown): 'up' | 'down' {
    if (value !== 'up' && value !== 'down') {
      throw new LearningError('LEARNING_VALIDATION_001', "direction は 'up' または 'down' です");
    }
    return value;
  }

  /** weekNumber を含む Phase を解決（phases は3つ固定） */
  private async resolvePhaseId(weekNumber: number): Promise<string> {
    const phases = await this.repository.getPhases();
    const phase = phases.find((p) => weekNumber >= p.startWeek && weekNumber <= p.endWeek);
    if (!phase) {
      throw new LearningError('LEARNING_PHASE_001', 'どの Phase にも属さない weekNumber です');
    }
    return phase.id;
  }
}
