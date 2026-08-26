/**
 * Newsletter API endpoint for production (Cloudflare Pages Function).
 * functions/api/newsletter.ts はそのまま /api/newsletter として配信される。
 * Business logic lives in the shared handler.
 */
import { handleNewsletter } from '../../apps/frontend/lib/api/newsletter-handler';
import { toPagesHandler } from '../../apps/frontend/lib/api/pages-function';

export const onRequest = toPagesHandler(handleNewsletter);
