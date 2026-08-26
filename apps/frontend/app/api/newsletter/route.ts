/**
 * Newsletter API route (development).
 *
 * Static export skips this route in production builds; the live endpoint is the
 * Pages Function in functions/api/newsletter.ts, which shares the same handler.
 */
import { handleNewsletter } from '@/lib/api/newsletter-handler';

export async function POST(request: Request): Promise<Response> {
  return handleNewsletter(request);
}
