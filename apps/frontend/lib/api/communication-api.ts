import { apiFetch } from './auth-api';

export interface CommunicationState {
  verified: boolean;
  consent: boolean;
  route: string;
  channel: 'email' | 'line' | null;
}
export interface CommunicationCatalog {
  noticeVersion: string;
  title: string;
  description: string;
  timing: string;
  deliveryStatus: 'preparing' | 'active';
  routes: Array<{ id: string; label: string }>;
}
export const communicationApi = {
  async getState(): Promise<CommunicationState> {
    const state = await apiFetch<CommunicationState>('/communication/state');
    if (
      typeof state?.verified !== 'boolean' ||
      typeof state?.consent !== 'boolean' ||
      typeof state?.route !== 'string' ||
      ![null, 'email', 'line'].includes(state.channel)
    )
      throw new Error('配信設定を確認できませんでした。');
    return state;
  },
  async getCatalog(): Promise<CommunicationCatalog> {
    const catalog = await apiFetch<CommunicationCatalog>('/communication/catalog');
    if (
      !catalog ||
      !['noticeVersion', 'title', 'description', 'timing'].every(
        (key) => typeof catalog[key as keyof CommunicationCatalog] === 'string',
      ) ||
      !['preparing', 'active'].includes(catalog.deliveryStatus) ||
      !Array.isArray(catalog.routes) ||
      !catalog.routes.length ||
      !catalog.routes.every((route) => typeof route.id === 'string' && typeof route.label === 'string')
    )
      throw new Error('案内の内容を確認できませんでした。');
    return catalog;
  },
  confirm(requestId: string, noticeVersion: string): Promise<{ recorded: boolean }> {
    return apiFetch('/communication/consent', {
      method: 'POST',
      body: JSON.stringify({ requestId, noticeVersion, confirmed: true }),
    });
  },
  selectRoute(requestId: string, route: string): Promise<{ recorded: boolean }> {
    return apiFetch('/communication/route', { method: 'POST', body: JSON.stringify({ requestId, route }) });
  },
  stop(requestId: string): Promise<{ recorded: boolean }> {
    return apiFetch('/communication/stop', { method: 'POST', body: JSON.stringify({ requestId }) });
  },
};
