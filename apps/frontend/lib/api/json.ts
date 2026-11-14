/**
 * Framework-agnostic JSON response helper.
 * Works in both Next.js route handlers and Pages Functions (Web standard Response).
 */
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
