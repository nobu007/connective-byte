/**
 * Cloudflare Workers Entry Point
 *
 * authRoutes + healthRoutes + learningRoutes のみをマウントする slim 構成。
 * （lab モジュール・swagger は本番ホスト対象外 — 消費者なし）
 *
 * 公式チュートリアル "Deploy an Express.js application on Cloudflare Workers"
 * に従い、node:http サーバ API（app.listen）+ cloudflare:node の
 * httpServerHandler で Workers の fetch ハンドラをエクスポートする。
 *
 * 環境変数は wrangler.toml の compatibility_flags
 * nodejs_compat_populate_process_env により process.env へ注入される
 * （既存コードの process.env.JWT_SECRET 等は無変更で動作）。
 */

import express from 'express';
import { httpServerHandler } from 'cloudflare:node';
import { WorkerEntrypoint } from 'cloudflare:workers';
import { neon } from '@neondatabase/serverless';
import { securityHeaders, corsConfig, sanitizeInput } from './middleware/security';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import { captureRawBody } from './middleware/rawBody';
import healthRoutes from './routes/healthRoutes';
import authRoutes from './routes/authRoutes';
import learningRoutes from './routes/learningRoutes';
import paymentRoutes from './routes/paymentRoutes';
import { authContainer } from './modules/auth/auth.container';
import { paymentsContainer } from './modules/payments/payments.container';
import { communicationRead } from './services/communicationSource';

const app = express();
app.disable('x-powered-by');

// Cloudflare はプロキシ1段（X-Forwarded-For を付与）。これを設定しないと
// Express の req.ip が undefined になり、express-rate-limit が ValidationError を投げる
// （Workers の httpServerHandler は socket.remoteAddress を提供しないため）。
app.set('trust proxy', 1);

// Security middleware (app.ts と同じ適用順・APIに不要なものは省略)
app.use(securityHeaders);
app.use(corsConfig);

// Body parsing（learning の管理APIは Markdown 本文（最大1MB）を扱うため 1mb まで許可）
// verify: Stripe Webhook 署名検証用に生ボディを req.rawBody へ（参照のみ）
app.use(express.json({ limit: '1mb', verify: captureRawBody }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(sanitizeInput);

// Routes
app.use(healthRoutes);
app.use(authRoutes);
app.use(learningRoutes);
app.use(paymentRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Workers requirements: node:http サーバを起動し、そのポートをハンドラへ渡す
const PORT = 3001;
app.listen(PORT);

// httpServerHandler() は { fetch } オブジェクトを返す（関数ではない）。
// scheduled を追加でexportするため、fetch はここでアダプトする。
// （`{ fetch: httpServerHandler(...) }` と書くと fetch がオブジェクトになり
//   "Handler does not export a fetch() function" で全route 500になる）
const serverHandler = httpServerHandler({ port: PORT });

// Cron Trigger（wrangler.toml [triggers] crons / 毎日 19:17 UTC = 04:17 JST）:
// 期限切れセッション・トークン・保持期限超過ログの整理を実行する。
// scheduled event の型は最小限だけ定義（@cloudflare/workers-types 未導入のため）
interface ScheduledEvent {
  scheduledTime: number;
}

async function runScheduledMaintenance(event: ScheduledEvent): Promise<void> {
  const { maintenanceService } = authContainer;
  const result = await maintenanceService.run();
  console.log(
    JSON.stringify({
      level: 'info',
      message: 'scheduled maintenance completed',
      scheduledTime: new Date(event.scheduledTime).toISOString(),
      ...result,
    })
  );
}

export default class MemberApi extends WorkerEntrypoint<{ DATABASE_URL: string }> {
  fetch(request: Request): Promise<Response> {
    return serverHandler.fetch(request);
  }
  async scheduled(event: ScheduledEvent): Promise<void> {
    this.ctx.waitUntil(runScheduledMaintenance(event));
  }
  // RPC is reachable only through a Cloudflare Service binding. Public HTTP
  // continues through Express; no URL exposes this method or member enumeration.
  async communicationRead(input: unknown): Promise<unknown> {
    return communicationRead(input, {
      databaseUrl: this.env.DATABASE_URL,
      users: authContainer.userRepository,
      purchases: paymentsContainer.purchaseRepository,
      listIds: async (after, limit) => {
        const sql = neon(this.env.DATABASE_URL);
        const results = await sql.transaction(
          [
            sql.query(
              'SELECT id FROM users WHERE ($1::uuid IS NULL OR id > $1::uuid) ORDER BY id LIMIT $2',
              [after, limit]
            ),
          ],
          { readOnly: true, fetchOptions: { signal: AbortSignal.timeout(15000) } }
        );
        return results[0].map((row) => row.id as string);
      },
    });
  }
}
