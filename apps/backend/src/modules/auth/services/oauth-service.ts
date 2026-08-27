/**
 * OAuth Service（provider 汎用・現状は Google のみ登録）
 *
 * フロー:
 *  1. start:    署名 state + cb_oauth_state Cookie を発行し provider の同意画面へ
 *  2. callback: code 交換 → userinfo 取得 → oauth_accounts 照合 →
 *               email 一致なら既存ユーザーへ link、なければ新規作成 → セッション発行
 *
 * 依存は globalThis.fetch のみ（Workers 互換・新規npm依存なし）。
 */

import { UserRepository, OAuthProvider, User } from '../interfaces/user-repository';
import { AuthService, SessionContext } from './auth-service';
import { AuthError } from '../errors';

/** provider 毎の固定設定（client_id/secret は env から都度読む） */
interface ProviderConfig {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  scope: string;
}

const PROVIDERS: Record<OAuthProvider, ProviderConfig> = {
  google: {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    userinfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid email profile',
  },
};

export interface ProviderEnv {
  clientId?: string;
  clientSecret?: string;
  /** コールバックURL のベース（既定: https://api.connectivebyte.com） */
  redirectBase?: string;
}

export interface OAuthCallbackInput {
  provider: OAuthProvider;
  code: string;
  state: string;
  /** double-submit cookie（cb_oauth_state）の値。state と一致必須 */
  cookieState: string;
  context?: SessionContext;
}

export interface OAuthUserInfo {
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
}

export class OAuthService {
  constructor(
    private userRepository: UserRepository,
    private authService: AuthService,
    /** env は差し替え可能（テスト用）。既定で process.env を見る */
    private env: (provider: OAuthProvider) => ProviderEnv = defaultProviderEnv
  ) {}

  isConfigured(provider: OAuthProvider): boolean {
    const e = this.env(provider);
    return Boolean(e.clientId && e.clientSecret);
  }

  /** 同意画面URL（prompt=select_account でアカウント選択を強制） */
  buildAuthorizationUrl(provider: OAuthProvider, state: string): string {
    if (!this.isConfigured(provider)) {
      throw new AuthError('AUTH_OAUTH_003', 'Provider is not configured', 500);
    }
    const config = PROVIDERS[provider];
    const e = this.env(provider);
    const redirectUri = this.redirectUri(provider);

    const params = new URLSearchParams({
      client_id: e.clientId!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: config.scope,
      state,
      prompt: 'select_account',
    });
    return `${config.authorizationEndpoint}?${params.toString()}`;
  }

  /**
   * コールバック処理。成功時はセッション発行結果（Cookie 用 refreshToken を含む）を返す。
   * 失敗は AuthError（controller が 302 の error クエリへ変換）。
   */
  async handleCallback(input: OAuthCallbackInput): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
    linked: boolean;
  }> {
    const { provider, code, state, cookieState, context } = input;

    // double-submit 検証: state は当サイト発行（Cookie と一致）
    if (!state || !cookieState || state !== cookieState) {
      throw new AuthError('AUTH_OAUTH_001', 'Invalid OAuth state', 401);
    }

    const userInfo = await this.exchangeCodeForUser(provider, code);

    // 既存連携の照合
    const existingAccount = await this.userRepository.findOAuthAccount(
      provider,
      userInfo.providerUserId
    );

    let linked = false;
    let user: User | null = null;

    if (existingAccount) {
      user = await this.userRepository.findById(existingAccount.userId);
      if (!user) {
        // 連携先ユーザーが削除済み → 連携だけ掃除して未登録扱い
        await this.userRepository.unlinkOAuthAccount(existingAccount.userId, provider);
        user = null;
      }
    }

    if (!user) {
      // email 一致で既存アカウントへ link
      user = await this.userRepository.findByEmail(userInfo.email);
    }

    if (user) {
      if (!existingAccount) {
        await this.userRepository.linkOAuthAccount({
          userId: user.id,
          provider,
          providerUserId: userInfo.providerUserId,
          providerEmail: userInfo.email,
        });
        linked = true;
        // email 一致での連携 = provider 側で email 検証済みなので isVerified を付与
        if (!user.isVerified) {
          user = (await this.userRepository.update(user.id, { isVerified: true })) ?? user;
        }
        await this.userRepository.recordAuthLog({
          eventType: 'oauth_link',
          userId: user.id,
          email: user.email,
          ipAddress: context?.ipAddress ?? null,
          userAgent: context?.userAgent ?? null,
          success: true,
        });
      }
    } else {
      // 新規作成（パスワード無し = OAuth専用アカウント）
      user = await this.userRepository.create({
        email: userInfo.email,
        passwordHash: '',
        fullName: userInfo.name || userInfo.email.split('@')[0],
        role: 'learner',
        isVerified: true, // provider 側で email 検証済み
        bio: null,
        timezone: 'UTC',
        githubUsername: null,
        deletionScheduledAt: null,
        deletedAt: null,
      });
      await this.userRepository.linkOAuthAccount({
        userId: user.id,
        provider,
        providerUserId: userInfo.providerUserId,
        providerEmail: userInfo.email,
      });
      linked = true;
      await this.userRepository.recordAuthLog({
        eventType: 'oauth_link',
        userId: user.id,
        email: user.email,
        ipAddress: context?.ipAddress ?? null,
        userAgent: context?.userAgent ?? null,
        success: true,
      });
    }

    await this.userRepository.recordAuthLog({
      eventType: 'oauth_login',
      userId: user.id,
      email: user.email,
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
      success: true,
    });

    const session = await this.authService.issueSession(user, context);
    return {
      user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      linked,
    };
  }

  /** 認可コード → アクセストークン → userinfo（未検証 email は拒否） */
  private async exchangeCodeForUser(provider: OAuthProvider, code: string): Promise<OAuthUserInfo> {
    if (!this.isConfigured(provider)) {
      throw new AuthError('AUTH_OAUTH_003', 'Provider is not configured', 500);
    }
    const config = PROVIDERS[provider];
    const e = this.env(provider);

    // 1. code 交換（form-urlencoded）
    const tokenResponse = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: e.clientId!,
        client_secret: e.clientSecret!,
        redirect_uri: this.redirectUri(provider),
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenResponse.ok) {
      throw new AuthError('AUTH_OAUTH_002', 'Failed to exchange authorization code', 401);
    }
    const tokenJson = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenJson.access_token) {
      throw new AuthError('AUTH_OAUTH_002', 'Token endpoint returned no access token', 401);
    }

    // 2. userinfo
    const userinfoResponse = await fetch(config.userinfoEndpoint, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!userinfoResponse.ok) {
      throw new AuthError('AUTH_OAUTH_002', 'Failed to fetch userinfo', 401);
    }
    const profile = (await userinfoResponse.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
    };
    if (!profile.sub || !profile.email) {
      throw new AuthError('AUTH_OAUTH_002', 'Incomplete userinfo response', 401);
    }
    if (!profile.email_verified) {
      throw new AuthError('AUTH_OAUTH_004', 'Provider email is not verified', 401);
    }

    return {
      providerUserId: profile.sub,
      email: profile.email.toLowerCase(),
      emailVerified: profile.email_verified,
      name: profile.name ?? null,
    };
  }

  private redirectUri(provider: OAuthProvider): string {
    const base = this.env(provider).redirectBase || 'https://api.connectivebyte.com';
    return `${base}/api/auth/${provider}/callback`;
  }
}

function defaultProviderEnv(): ProviderEnv {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectBase: process.env.OAUTH_REDIRECT_BASE,
  };
}
