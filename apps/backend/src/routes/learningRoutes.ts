/**
 * Learning Routes
 *
 * 本番 worker（src/worker.ts）はグローバル apiLimiter を持たないため、
 * この router が独自の limiter を携帯する（app.ts / worker.ts 両入口で同一挙動）。
 */

import { Router, type RequestHandler } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';
import {
  handleGetCurriculum,
  handleGetModule,
  handleGetSession,
  handleGetProgress,
  handleSetProgress,
  handleGetAdminCurriculum,
  handleCreateModule,
  handleUpdateModule,
  handleDeleteModule,
  handleReorderModule,
  handleGetAdminSession,
  handleCreateSession,
  handleUpdateSession,
  handleDeleteSession,
  handleReorderSession,
} from '../modules/learning/learning.controller';

const router = Router();

// Postgres は uuid 列への不正入力で構文エラー（500）を出すためパラメータを事前検証。
// slug 系パラメータ（moduleSlug/sessionSlug）は対象外。
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const rejectInvalidUuid =
  (paramName: string): RequestHandler =>
  (req, res, next) => {
    if (!UUID_PATTERN.test(String(req.params[paramName]))) {
      res.status(400).json({
        error: {
          code: 'LEARNING_VALIDATION_001',
          message: `${paramName} は UUID 形式である必要があります`,
        },
      });
      return;
    }
    next();
  };

router.param('id', rejectInvalidUuid('id'));
router.param('sessionId', rejectInvalidUuid('sessionId'));

// 公開読み取り: 通常利用（ページ表示ごとに数回）で引っかからない程度
const learningReadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  code: 'RATE_LIMIT_005',
  message: 'Too many learning content requests. Please try again later.',
});

// 進捗書き込み: 学習者の操作（完了切替）より十分広い
const learningWriteLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  code: 'RATE_LIMIT_006',
  message: 'Too many progress updates. Please try again later.',
});

// --- 公開コンテンツ（認証不要・全公開） ---

router.get('/api/learning/curriculum', learningReadLimiter, handleGetCurriculum);

router.get('/api/learning/modules/:moduleSlug', learningReadLimiter, handleGetModule);

router.get('/api/learning/sessions/:sessionSlug', learningReadLimiter, handleGetSession);

// --- 進捗（要認証） ---

router.get('/api/learning/progress', authenticate, handleGetProgress);

router.put(
  '/api/learning/progress/sessions/:sessionId',
  authenticate,
  learningWriteLimiter,
  handleSetProgress
);

// --- 管理（content_administrator / system_admin のみ） ---
// sanitizeInput は security.ts 側で /api/learning/admin を免除
// （Markdown 本文の onChange= 等が破壊されるのを防ぐ。出力は raw HTML 非描画のため安全）

const adminGuard = [authenticate, authorize('content_administrator', 'system_admin')];

router.get(
  '/api/learning/admin/curriculum',
  learningReadLimiter,
  ...adminGuard,
  handleGetAdminCurriculum
);

router.post('/api/learning/admin/modules', learningWriteLimiter, ...adminGuard, handleCreateModule);

router.patch(
  '/api/learning/admin/modules/:id',
  learningWriteLimiter,
  ...adminGuard,
  handleUpdateModule
);

router.delete(
  '/api/learning/admin/modules/:id',
  learningWriteLimiter,
  ...adminGuard,
  handleDeleteModule
);

router.post(
  '/api/learning/admin/modules/:id/reorder',
  learningWriteLimiter,
  ...adminGuard,
  handleReorderModule
);

router.get(
  '/api/learning/admin/sessions/:id',
  learningReadLimiter,
  ...adminGuard,
  handleGetAdminSession
);

router.post(
  '/api/learning/admin/sessions',
  learningWriteLimiter,
  ...adminGuard,
  handleCreateSession
);

router.patch(
  '/api/learning/admin/sessions/:id',
  learningWriteLimiter,
  ...adminGuard,
  handleUpdateSession
);

router.delete(
  '/api/learning/admin/sessions/:id',
  learningWriteLimiter,
  ...adminGuard,
  handleDeleteSession
);

router.post(
  '/api/learning/admin/sessions/:id/reorder',
  learningWriteLimiter,
  ...adminGuard,
  handleReorderSession
);

export default router;
