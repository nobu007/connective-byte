/**
 * Learning Routes
 *
 * 本番 worker（src/worker.ts）はグローバル apiLimiter を持たないため、
 * この router が独自の limiter を携帯する（app.ts / worker.ts 両入口で同一挙動）。
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';
import {
  handleGetCurriculum,
  handleGetModule,
  handleGetSession,
  handleGetProgress,
  handleSetProgress,
} from '../modules/learning/learning.controller';

const router = Router();

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

export default router;
