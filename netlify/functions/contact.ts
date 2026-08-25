/**
 * Contact API endpoint for production (Netlify Function).
 * Routed from /api/contact via public/_redirects.
 * Business logic lives in the shared handler.
 */
import { handleContact } from '../../apps/frontend/lib/api/contact-handler';
import type { HandlerEvent, HandlerResponse } from './netlify-function-types';

export const handler = async (event: HandlerEvent): Promise<HandlerResponse> => {
  const headers = new Headers();
  Object.entries(event.headers).forEach(([key, value]) => {
    if (value != null) headers.set(key, value);
  });

  const clientIp = event.headers['x-nf-client-connection-ip'];
  if (clientIp && !headers.has('x-forwarded-for')) {
    headers.set('x-forwarded-for', clientIp);
  }

  const body =
    event.isBase64Encoded && event.body != null
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : (event.body ?? undefined);

  const request = new Request('https://connectivebyte.com/api/contact', {
    method: event.httpMethod,
    headers,
    body: event.httpMethod === 'GET' || event.httpMethod === 'HEAD' ? undefined : body,
  });

  const response = await handleContact(request);

  return {
    statusCode: response.status,
    body: await response.text(),
    headers: Object.fromEntries(response.headers.entries()),
  };
};
