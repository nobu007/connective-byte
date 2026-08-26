/**
 * cloudflare:node モジュールの型定義
 *
 * wrangler はバンドル時に実モジュールを解決するが、tsc はこの宣言で型検査する。
 * 実際のシグネチャは Cloudflare の公式チュートリアル
 * (Deploy an Express.js application on Cloudflare Workers) に基づく。
 */

declare module 'cloudflare:node' {
  export interface HttpServerHandler {
    fetch(request: Request): Promise<Response>;
  }

  export function httpServerHandler(options: { port: number }): HttpServerHandler;
}
