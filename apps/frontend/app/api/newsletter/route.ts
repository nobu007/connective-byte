/**
 * Newsletter API route (development).
 *
 * Static export skips this route in production builds; the live endpoint is the
 * Netlify Function in netlify/functions/newsletter.ts, which shares the same
 * handler. The forced redirect in public/_redirects routes production traffic
 * to the function.
 */
import { handleNewsletter } from '@/lib/api/newsletter-handler';

export async function POST(request: Request): Promise<Response> {
  return handleNewsletter(request);
}
