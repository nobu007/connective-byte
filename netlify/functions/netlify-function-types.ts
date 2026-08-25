/**
 * Minimal typings for Netlify Functions (synchronous) handlers.
 * Avoids depending on the @netlify/functions package.
 */
export interface HandlerEvent {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body: string | null;
  isBase64Encoded: boolean;
}

export interface HandlerResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
}
