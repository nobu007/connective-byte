/**
 * Contact API route (development).
 *
 * Static export skips this route in production builds; the live endpoint is the
 * Netlify Function in netlify/functions/contact.ts, which shares the same
 * handler. The forced redirect in public/_redirects routes production traffic
 * to the function.
 */
import { handleContact } from '@/lib/api/contact-handler';

export async function POST(request: Request): Promise<Response> {
  return handleContact(request);
}
