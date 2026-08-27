/**
 * Cloudflare Workers Entry Point
 *
 * authRoutes + healthRoutes のみをマウントする slim 構成。
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
import { securityHeaders, corsConfig, sanitizeInput } from './middleware/security';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import healthRoutes from './routes/healthRoutes';
import authRoutes from './routes/authRoutes';
import { authContainer } from './modules/auth/auth.container';

const app = express();
app.disable('x-powered-by');

// Cloudflare はプロキシ1段（X-Forwarded-For を付与）。これを設定しないと
// Express の req.ip が undefined になり、express-rate-limit が ValidationError を投げる
// （Workers の httpServerHandler は socket.remoteAddress を提供しないため）。
app.set('trust proxy', 1);

// Security middleware (app.ts と同じ適用順・APIに不要なものは省略)
app.use(securityHeaders);
app.use(corsConfig);

// Body parsing (Workers では大きなペイロードを想定しないため 100kb に制限)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

app.use(sanitizeInput);

// Routes
app.use(healthRoutes);
app.use(authRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Workers requirements: node:http サーバを起動し、そのポートをハンドラへ渡す
const PORT = 3001;
app.listen(PORT);

// Cron Trigger（wrangler.toml [triggers] crons / 毎日 19:17 UTC = 04:17 JST）:
// 期限切れセッション・トークン・保持期限超過ログの整理を実行する。
// scheduled event の型は最小限だけ定義（@cloudflare/workers-types 未導入のため）
interface ScheduledEvent {
  scheduledTime: number;
}
interface ScheduledController {
  waitUntil(promise: Promise<unknown>): void;
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

export default {
  fetch: httpServerHandler({ port: PORT }),
  async scheduled(event: ScheduledEvent, _env: unknown, ctx: ScheduledController): Promise<void> {
    ctx.waitUntil(runScheduledMaintenance(event));
  },
};
