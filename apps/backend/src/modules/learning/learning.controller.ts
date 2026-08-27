/**
 * Learning Controller
 * HTTP request handlers for learning content endpoints
 *
 * コンテンツ読み取りは公開（認証不要）。進捗は authenticate 必須。
 */

import { Request, Response, NextFunction } from 'express';
import { LearningError } from './errors';
import { learningContainer } from './learning.container';

const learningService = learningContainer.learningService;
const progressService = learningContainer.progressService;

/** LearningError を HTTP レスポンスへ変換（それ以外は next へ） */
export function handleLearningError(res: Response, next: NextFunction, error: unknown): void {
  if (error instanceof LearningError) {
    res.status(error.httpStatus).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }
  next(error);
}

/**
 * カリキュラム全体（phases → modules → sessions の要約ツリー）
 * GET /api/learning/curriculum
 */
export async function handleGetCurriculum(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tree = await learningService.getCurriculum();
    // 公開ツリーは頻繁に叩かれるためブラウザキャッシュを付与
    // （Neon HTTP クエリの呼び出頻度を緩和）
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.status(200).json({ success: true, data: { phases: tree } });
  } catch (error) {
    handleLearningError(res, next, error);
  }
}

/**
 * モジュール詳細（セッション一覧付き）
 * GET /api/learning/modules/:moduleSlug
 */
export async function handleGetModule(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const module = await learningService.getModuleBySlug(String(req.params.moduleSlug));
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.status(200).json({ success: true, data: { module } });
  } catch (error) {
    handleLearningError(res, next, error);
  }
}

/**
 * セッション本文
 * GET /api/learning/sessions/:sessionSlug
 */
export async function handleGetSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await learningService.getSessionBySlug(String(req.params.sessionSlug));
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.status(200).json({ success: true, data: { session } });
  } catch (error) {
    handleLearningError(res, next, error);
  }
}

/**
 * 学習者の進捗サマリ
 * GET /api/learning/progress （authenticate 済み）
 */
export async function handleGetProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const overview = await progressService.getOverview(req.user!.id);
    res.status(200).json({ success: true, data: overview });
  } catch (error) {
    handleLearningError(res, next, error);
  }
}

/**
 * セッションの進捗記録（完了/進行中の切替）
 * PUT /api/learning/progress/sessions/:sessionId （authenticate 済み）
 */
export async function handleSetProgress(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { status } = req.body;
    if (status !== 'in_progress' && status !== 'completed') {
      res.status(400).json({
        error: {
          code: 'LEARNING_VALIDATION_001',
          message: "status は 'in_progress' または 'completed' です",
        },
      });
      return;
    }
    const record = await progressService.setProgress(
      req.user!.id,
      String(req.params.sessionId),
      status
    );
    res.status(200).json({ success: true, data: { progress: record } });
  } catch (error) {
    handleLearningError(res, next, error);
  }
}
