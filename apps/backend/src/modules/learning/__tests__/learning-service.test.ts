/**
 * Learning Service Unit Tests
 *
 * JsonLearningRepository（テスト毎の一時ファイル）+ LearningService の
 * 検証・並び順・公開絞込・重複排除を検証する。
 */

import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { LearningService } from '../services/learning-service';
import { JsonLearningRepository } from '../implementations/json-learning-repository';
import { LearningError } from '../errors';

describe('LearningService', () => {
  let repository: JsonLearningRepository;
  let service: LearningService;

  beforeEach(() => {
    const dbPath = path.join(os.tmpdir(), `learning-svc-test-${crypto.randomUUID()}.json`);
    repository = new JsonLearningRepository(dbPath);
    service = new LearningService(repository);
  });

  describe('phase シード', () => {
    it('初期化時に3 Phase が番号順に並ぶ', async () => {
      const tree = await service.getCurriculum();
      expect(tree.map((p) => p.number)).toEqual([1, 2, 3]);
      expect(tree[0]).toMatchObject({ startWeek: 1, endWeek: 3 });
      expect(tree[1]).toMatchObject({ startWeek: 4, endWeek: 8 });
      expect(tree[2]).toMatchObject({ startWeek: 9, endWeek: 12 });
      expect(tree.every((p) => p.modules)).toBe(true);
    });
  });

  describe('createModule', () => {
    it('weekNumber から phase を解決して作成する', async () => {
      const created = await service.createModule({
        slug: 'week-01',
        title: 'Week 1: 接続思考の基礎',
        description: '導入週',
        weekNumber: 1,
        isPublished: true,
      });

      expect(created).toMatchObject({ slug: 'week-01', weekNumber: 1, isPublished: true });

      const tree = await service.getCurriculum();
      expect(tree[0].modules).toHaveLength(1);
      expect(tree[1].modules).toHaveLength(0);
      expect(tree[2].modules).toHaveLength(0);
    });

    it('weekNumber 5 は Phase 2 に配置される', async () => {
      await service.createModule({ slug: 'week-05', title: 'W5', weekNumber: 5 });
      const tree = await service.getAdminCurriculum();
      expect(tree[0].modules).toHaveLength(0);
      expect(tree[1].modules).toHaveLength(1);
    });

    it('不正な slug を 400 で拒否する', async () => {
      await expect(
        service.createModule({ slug: 'Week_1!', title: 'x', weekNumber: 1 })
      ).rejects.toMatchObject({ code: 'LEARNING_VALIDATION_001', httpStatus: 400 });
    });

    it('空の title を 400 で拒否する', async () => {
      await expect(
        service.createModule({ slug: 'week-01', title: '  ', weekNumber: 1 })
      ).rejects.toMatchObject({ code: 'LEARNING_VALIDATION_001', httpStatus: 400 });
    });

    it('範囲外の weekNumber を 400 で拒否する', async () => {
      await expect(
        service.createModule({ slug: 'week-00', title: 'x', weekNumber: 0 })
      ).rejects.toMatchObject({ code: 'LEARNING_VALIDATION_001', httpStatus: 400 });
    });

    it('どの Phase にも属さない weekNumber は PHASE_001', async () => {
      // weekNumber 自体は 1〜52 で有効だが、Phase 定義は W12 まで
      await expect(
        service.createModule({ slug: 'week-13', title: 'x', weekNumber: 13 })
      ).rejects.toMatchObject({ code: 'LEARNING_PHASE_001', httpStatus: 400 });
    });

    it('重複 slug を 409 で拒否する', async () => {
      await service.createModule({ slug: 'week-01', title: 'A', weekNumber: 1 });
      await expect(
        service.createModule({ slug: 'week-01', title: 'B', weekNumber: 2 })
      ).rejects.toMatchObject({ code: 'LEARNING_MODULE_002', httpStatus: 409 });
    });
  });

  describe('公開絞込', () => {
    it('公開ツリーは isPublished の module/session のみ含む', async () => {
      const pub = await service.createModule({
        slug: 'week-01',
        title: '公開',
        weekNumber: 1,
        isPublished: true,
      });
      await service.createModule({ slug: 'week-02', title: '非公開', weekNumber: 2 });

      await service.createSession({
        moduleId: pub.id,
        slug: 'day-01',
        title: '公開セッション',
        content: '# 内容',
        durationMinutes: 30,
        isPublished: true,
      });
      await service.createSession({
        moduleId: pub.id,
        slug: 'day-02',
        title: '非公開セッション',
        content: '# 下書き',
        durationMinutes: 30,
      });

      const tree = await service.getCurriculum();
      expect(tree[0].modules.map((m) => m.slug)).toEqual(['week-01']);
      expect(tree[0].modules[0].sessions.map((s) => s.slug)).toEqual(['day-01']);

      const adminTree = await service.getAdminCurriculum();
      expect(adminTree[0].modules.map((m) => m.slug)).toEqual(['week-01', 'week-02']);
      expect(adminTree[0].modules[0].sessions.map((s) => s.slug)).toEqual(['day-01', 'day-02']);
    });
  });

  describe('session 読み取り', () => {
    it('本文・親モジュール情報付きでセッションを返す', async () => {
      const module = await service.createModule({
        slug: 'week-01',
        title: 'Week 1',
        weekNumber: 1,
        isPublished: true,
      });
      await service.createSession({
        moduleId: module.id,
        slug: 'day-01',
        title: 'Day 1',
        description: '初日',
        content: '# Hello\n\n```js\nconst x = 1;\n```',
        durationMinutes: 45,
        objectives: ['接続を理解する', '環境を整える'],
        isPublished: true,
      });

      const session = await service.getSessionBySlug('day-01');
      expect(session).toMatchObject({
        slug: 'day-01',
        moduleSlug: 'week-01',
        moduleTitle: 'Week 1',
        durationMinutes: 45,
      });
      expect(session.content).toContain('```js');
      expect(session.objectives).toHaveLength(2);
    });

    it('未公開セッションは 404', async () => {
      const module = await service.createModule({
        slug: 'week-01',
        title: 'W1',
        weekNumber: 1,
        isPublished: true,
      });
      await service.createSession({
        moduleId: module.id,
        slug: 'draft-01',
        title: '下書き',
        content: 'x',
        durationMinutes: 10,
      });
      await expect(service.getSessionBySlug('draft-01')).rejects.toMatchObject({
        code: 'LEARNING_SESSION_001',
        httpStatus: 404,
      });
    });

    it('公開セッションでも親モジュールが未公開なら 404', async () => {
      const module = await service.createModule({
        slug: 'week-01',
        title: 'W1',
        weekNumber: 1,
      });
      await service.createSession({
        moduleId: module.id,
        slug: 'orphan-01',
        title: '孤立',
        content: 'x',
        durationMinutes: 10,
        isPublished: true,
      });
      await expect(service.getSessionBySlug('orphan-01')).rejects.toMatchObject({
        code: 'LEARNING_SESSION_001',
        httpStatus: 404,
      });
    });

    it('未知の slug は 404', async () => {
      await expect(service.getModuleBySlug('nope')).rejects.toMatchObject({
        code: 'LEARNING_MODULE_001',
        httpStatus: 404,
      });
      await expect(service.getSessionBySlug('nope')).rejects.toMatchObject({
        code: 'LEARNING_SESSION_001',
        httpStatus: 404,
      });
    });
  });

  describe('createSession 検証', () => {
    let moduleId: string;

    beforeEach(async () => {
      const module = await service.createModule({ slug: 'week-01', title: 'W1', weekNumber: 1 });
      moduleId = module.id;
    });

    it('重複 slug を 409 で拒否する', async () => {
      const input = { moduleId, slug: 'day-01', title: 'A', content: 'x', durationMinutes: 30 };
      await service.createSession(input);
      await expect(service.createSession({ ...input, title: 'B' })).rejects.toMatchObject({
        code: 'LEARNING_SESSION_002',
        httpStatus: 409,
      });
    });

    it('空の content を 400 で拒否する', async () => {
      await expect(
        service.createSession({
          moduleId,
          slug: 'day-01',
          title: 'A',
          content: '',
          durationMinutes: 30,
        })
      ).rejects.toMatchObject({ code: 'LEARNING_VALIDATION_001', httpStatus: 400 });
    });

    it('存在しない親モジュールは 404', async () => {
      await expect(
        service.createSession({
          moduleId: crypto.randomUUID(),
          slug: 'day-01',
          title: 'A',
          content: 'x',
          durationMinutes: 30,
        })
      ).rejects.toMatchObject({ code: 'LEARNING_MODULE_001', httpStatus: 404 });
    });

    it('objectives は文字列配列のみ許可する', async () => {
      await expect(
        service.createSession({
          moduleId,
          slug: 'day-01',
          title: 'A',
          content: 'x',
          durationMinutes: 30,
          objectives: '接続を理解する',
        })
      ).rejects.toMatchObject({ code: 'LEARNING_VALIDATION_001', httpStatus: 400 });
    });
  });

  describe('session 並び順・reorder', () => {
    it('orderIndex 順に並び、reorder で入れ替わる。端では no-op', async () => {
      const module = await service.createModule({ slug: 'week-01', title: 'W1', weekNumber: 1 });
      const a = await service.createSession({
        moduleId: module.id,
        slug: 'day-01',
        title: 'A',
        content: 'a',
        durationMinutes: 10,
      });
      const b = await service.createSession({
        moduleId: module.id,
        slug: 'day-02',
        title: 'B',
        content: 'b',
        durationMinutes: 10,
      });
      const c = await service.createSession({
        moduleId: module.id,
        slug: 'day-03',
        title: 'C',
        content: 'c',
        durationMinutes: 10,
      });

      // 先頭での up は no-op
      await expect(service.reorderSession(a.id, 'up')).resolves.toBe(false);
      // 真ん中の down で b↔c 入れ替え
      await expect(service.reorderSession(b.id, 'down')).resolves.toBe(true);

      const tree = await service.getAdminCurriculum();
      expect(tree[0].modules[0].sessions.map((s) => s.slug)).toEqual([
        'day-01',
        'day-03',
        'day-02',
      ]);
    });
  });

  describe('module 更新・reorder', () => {
    it('is_published の切替で公開ツリーの出現が変わる', async () => {
      const created = await service.createModule({ slug: 'week-01', title: 'W1', weekNumber: 1 });
      let tree = await service.getCurriculum();
      expect(tree[0].modules).toHaveLength(0);

      await service.updateModule(created.id, { isPublished: true });
      tree = await service.getCurriculum();
      expect(tree[0].modules.map((m) => m.slug)).toEqual(['week-01']);

      await service.updateModule(created.id, { isPublished: false });
      tree = await service.getCurriculum();
      expect(tree[0].modules).toHaveLength(0);
    });

    it('slug 変更時、他モジュールとの衝突は 409', async () => {
      const a = await service.createModule({ slug: 'week-01', title: 'A', weekNumber: 1 });
      await service.createModule({ slug: 'week-02', title: 'B', weekNumber: 2 });
      await expect(service.updateModule(a.id, { slug: 'week-02' })).rejects.toMatchObject({
        code: 'LEARNING_MODULE_002',
        httpStatus: 409,
      });
    });

    it('自身と同じ slug への変更は許可する', async () => {
      const a = await service.createModule({ slug: 'week-01', title: 'A', weekNumber: 1 });
      await expect(
        service.updateModule(a.id, { slug: 'week-01', title: '改題' })
      ).resolves.toMatchObject({
        slug: 'week-01',
        title: '改題',
      });
    });

    it('reorder は同一 Phase 内で入れ替える。端では no-op', async () => {
      const a = await service.createModule({ slug: 'week-01', title: 'A', weekNumber: 1 });
      const b = await service.createModule({ slug: 'week-02', title: 'B', weekNumber: 2 });

      await expect(service.reorderModule(a.id, 'up')).resolves.toBe(false);
      await expect(service.reorderModule(a.id, 'down')).resolves.toBe(true);

      const tree = await service.getAdminCurriculum();
      expect(tree[0].modules.map((m) => m.slug)).toEqual(['week-02', 'week-01']);
      expect(b).toBeDefined();
    });
  });

  describe('LearningError 形状', () => {
    it('code と httpStatus を持つ', async () => {
      try {
        await service.getModuleBySlug('nope');
        throw new Error('should not reach');
      } catch (error) {
        expect(error).toBeInstanceOf(LearningError);
        const learningError = error as LearningError;
        expect(typeof learningError.code).toBe('string');
        expect(typeof learningError.httpStatus).toBe('number');
      }
    });
  });
});
