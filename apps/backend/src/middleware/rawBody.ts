/**
 * Raw Body Capture Middleware
 *
 * Stripe Webhook の署名検証には、Stripe が送ったバイト列そのものが必要。
 * express.json の verify フックは body-parser が Buffer を保持している時点で
 * 呼ばれるため、ここでは参照のみを req.rawBody に置く（コピーなし・コスト最小）。
 */

import type { IncomingMessage, ServerResponse } from 'http';

export function captureRawBody(req: IncomingMessage, _res: ServerResponse, buf: Buffer): void {
  // Express Request は IncomingMessage を拡張したもの。型は raw-body.d.ts で宣言
  (req as { rawBody?: Buffer }).rawBody = buf;
}
