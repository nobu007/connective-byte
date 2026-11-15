/**
 * Contact API endpoint for production (Cloudflare Pages Function).
 * functions/api/contact.ts はそのまま /api/contact として配信される。
 * Business logic lives in the shared handler.
 */
import { handleContact } from '../../apps/frontend/lib/api/contact-handler';
import { toPagesHandler } from '../../apps/frontend/lib/api/pages-function';

export const onRequest = toPagesHandler(handleContact);
