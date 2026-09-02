/**
 * Learning Controller
 * HTTP request handlers for learning content endpoints
 *
 * コンテンツ読み取りは公開（認証不要）。進捗は authenticate 必須。
 * 管理（admin）はルーター側で authorize('content_administrator','system_admin') 済み。
 */

import { Request, Response, NextFunction } from 'express';
import { LearningError } from './errors';
import { FREE_WEEKS } from './services/learning-service';
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
    // optionalAuthenticate 由来。未ログインでも Week 1（無料週）は閲覧可
    const session = await learningService.getSessionBySlug(
      String(req.params.sessionSlug),
      req.user?.id ?? null
    );
    // 応答がAuthorization（購入状態）で変化するため共有キャッシュには載せない。
    // 有料本文は private でも不十分（同一ブラウザの別アカウント・返金後に
    // HTTPキャッシュから読める）ためブラウザキャッシュにも残さない。
    const cacheControl =
      session.moduleWeekNumber > FREE_WEEKS
        ? 'private, no-store'
        : 'private, max-age=60, stale-while-revalidate=300';
    res.set('Cache-Control', cacheControl);
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

// --- 管理（content_administrator / system_admin 専用） ---

/**
 * 未公開込みのカリキュラム全ツリー
 * GET /api/learning/admin/curriculum
 */
export async function handleGetAdminCurriculum(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tree = await learningService.getAdminCurriculum();
    res.status(200).json({ success: true, data: { phases: tree } });
  } catch (error) {
    handleLearningError(res, next, error);
  }
}

/**
 * モジュール作成
 * POST /api/learning/admin/modules
 */
export async function handleCreateModule(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const module = await learningService.createModule(req.body);
    res.status(201).json({ success: true, data: { module } });
  } catch (error) {
    handleLearningError(res, next, error);
  }
}

/**
 * モジュール更新（is_published の切替を含む）
 * PATCH /api/learning/admin/modules/:id
 */
export async function handleUpdateModule(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const module = await learningService.updateModule(String(req.params.id), req.body);
    res.status(200).json({ success: true, data: { module } });
  } catch (error) {
    handleLearningError(res, next, error);
  }
}

/**
 * モジュール削除（配下セッション・進捗は CASCADE）
 * DELETE /api/learning/admin/modules/:id
 */
export async function handleDeleteModule(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await learningService.deleteModule(String(req.params.id));
    res.status(204).send();
  } catch (error) {
    handleLearningError(res, next, error);
  }
}

/**
 * モジュール表示順入れ替え（up / down）
 * POST /api/learning/admin/modules/:id/reorder
 */
export async function handleReorderModule(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const moved = await learningService.reorderModule(String(req.params.id), req.body?.direction);
    res.status(200).json({ success: true, data: { moved } });
  } catch (error) {
    handleLearningError(res, next, error);
  }
}

/**
 * セッション詳細（管理用・未公開も取得可）
 * GET /api/learning/admin/sessions/:id
 */
export async function handleGetAdminSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await learningService.getAdminSession(String(req.params.id));
    res.status(200).json({ success: true, data: { session } });
  } catch (error) {
    handleLearningError(res, next, error);
  }
}

/**
 * セッション作成
 * POST /api/learning/admin/sessions
 */
export async function handleCreateSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await learningService.createSession(req.body);
    res.status(201).json({ success: true, data: { session } });
  } catch (error) {
    handleLearningError(res, next, error);
  }
}

/**
 * セッション更新（本文・is_published 切替を含む）
 * PATCH /api/learning/admin/sessions/:id
 */
export async function handleUpdateSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await learningService.updateSession(String(req.params.id), req.body);
    res.status(200).json({ success: true, data: { session } });
  } catch (error) {
    handleLearningError(res, next, error);
  }
}

/**
 * セッション削除（進捗は CASCADE）
 * DELETE /api/learning/admin/sessions/:id
 */
export async function handleDeleteSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await learningService.deleteSession(String(req.params.id));
    res.status(204).send();
  } catch (error) {
    handleLearningError(res, next, error);
  }
}

/**
 * セッション表示順入れ替え（up / down）
 * POST /api/learning/admin/sessions/:id/reorder
 */
export async function handleReorderSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const moved = await learningService.reorderSession(String(req.params.id), req.body?.direction);
    res.status(200).json({ success: true, data: { moved } });
  } catch (error) {
    handleLearningError(res, next, error);
  }
}
