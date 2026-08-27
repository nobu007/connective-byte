/**
 * Session Service
 * アクティブセッションの一覧・失効（マイページ「セッション」タブの裏側）
 */

import { UserRepository, SessionRecord } from '../interfaces/user-repository';
import { AuthError } from '../errors';
import crypto from 'crypto';

export interface SessionView {
  id: string;
  deviceInfo: SessionRecord['deviceInfo'];
  ipAddress: string | null;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  /** Cookie のリフレッシュトークンに紐づく現在セッションか */
  isCurrent: boolean;
}

export class SessionService {
  constructor(private userRepository: UserRepository) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /** Cookie のリフレッシュトークンに紐づく現在セッションを解決 */
  async findCurrentSession(
    userId: string,
    currentRefreshToken: string
  ): Promise<SessionRecord | null> {
    const currentHash = this.hashToken(currentRefreshToken);
    const sessions = await this.userRepository.findSessionsByUser(userId);
    return sessions.find((s) => s.refreshTokenHash === currentHash) ?? null;
  }

  /** ユーザーのアクティブセッション一覧（isCurrent 付き） */
  async listSessions(userId: string, currentRefreshToken: string): Promise<SessionView[]> {
    const currentHash = this.hashToken(currentRefreshToken);
    const sessions = await this.userRepository.findSessionsByUser(userId);
    return sessions.map((s) => ({
      id: s.id,
      deviceInfo: s.deviceInfo,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastActivityAt: s.lastActivityAt,
      expiresAt: s.expiresAt,
      isCurrent: s.refreshTokenHash === currentHash,
    }));
  }

  /**
   * 指定セッションを失効（他ユーザーのセッションID指定は not_found）
   */
  async revokeSession(userId: string, sessionId: string): Promise<'revoked'> {
    const sessions = await this.userRepository.findSessionsByUser(userId);
    const target = sessions.find((s) => s.id === sessionId);
    if (!target) {
      throw new AuthError('AUTH_SESSION_001', 'Session not found', 404);
    }

    await this.userRepository.revokeSession(sessionId);
    await this.userRepository.recordAuthLog({
      eventType: 'session_revoked',
      userId,
      success: true,
    });
    return 'revoked';
  }

  /**
   * 現在セッション以外をすべて失効。失効件数を返す
   */
  async revokeOthers(userId: string, currentRefreshToken: string): Promise<number> {
    const current = await this.findCurrentSession(userId, currentRefreshToken);
    if (!current) {
      throw new AuthError('AUTH_TOKEN_002', 'Invalid or expired refresh token', 401);
    }

    const sessions = await this.userRepository.findSessionsByUser(userId);
    await this.userRepository.revokeAllSessionsForUser(userId, current.id);
    await this.userRepository.recordAuthLog({
      eventType: 'session_revoked',
      userId,
      success: true,
    });
    return sessions.length - 1;
  }
}
