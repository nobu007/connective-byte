/**
 * Cloudflare Pages Functions アダプタ。
 * 共有handler（Request → Response）を Pages Function（onRequest）へ変換する。
 * 開発用Next.jsルート（app/api/*）と同じ役割で、ビジネスロジックは共用。
 */

type Env = Record<string, unknown>;

export interface PagesFunctionContext {
  request: Request;
  env: Env;
  params: Record<string, string | string[]>;
  waitUntil: (promise: Promise<unknown>) => void;
}

export function toPagesHandler(handler: (request: Request) => Promise<Response>) {
  return async (context: PagesFunctionContext): Promise<Response> => {
    // Pages の env バインディングを、共有handlerが期待する process.env 経由で見せる
    for (const [key, value] of Object.entries(context.env ?? {})) {
      if (value != null && process.env[key] === undefined) {
        process.env[key] = String(value);
      }
    }

    // Cloudflare はクライアントIPを cf-connecting-ip で渡す。
    // 共有handlerのレートリミットが x-forwarded-for を読むため変換。
    const headers = new Headers(context.request.headers);
    const clientIp = headers.get('cf-connecting-ip');
    if (clientIp && !headers.has('x-forwarded-for')) {
      headers.set('x-forwarded-for', clientIp);
    }

    return handler(new Request(context.request, { headers }));
  };
}
