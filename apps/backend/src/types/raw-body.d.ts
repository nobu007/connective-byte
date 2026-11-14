/**
 * Express Request 型拡張: rawBody
 *
 * middleware/rawBody.ts の captureRawBody が body-parser の verify で設定する。
 * （verify の req は http.IncomingMessage 型のため、読み取り側はこの宣言を使う）
 */

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

export {};
