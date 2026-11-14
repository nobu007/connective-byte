/**
 * Contact API route (development).
 *
 * Static export skips this route in production builds; the live endpoint is the
 * Pages Function in functions/api/contact.ts, which shares the same handler.
 */
import { handleContact } from '@/lib/api/contact-handler';

export async function POST(request: Request): Promise<Response> {
  return handleContact(request);
}
