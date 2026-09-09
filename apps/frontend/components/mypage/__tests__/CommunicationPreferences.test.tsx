import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../../test/test-utils';
import { CommunicationPreferences } from '../CommunicationPreferences';
import { communicationApi, type CommunicationState } from '@/lib/api/communication-api';
jest.mock('@/lib/api/communication-api', () => ({
  communicationApi: {
    getState: jest.fn(),
    getCatalog: jest.fn(),
    confirm: jest.fn(),
    stop: jest.fn(),
    selectRoute: jest.fn(),
  },
}));
const api = jest.mocked(communicationApi);
let state: CommunicationState;
const catalog = {
  title: '学習のヒントとコース案内',
  description: '目的を説明する文',
  timing: '現在は配信準備中です。',
  noticeVersion: 'v1',
  deliveryStatus: 'preparing' as const,
  routes: [
    { id: 'common', label: 'まだ決めていない' },
    { id: 'team_handoff', label: 'チームに伝えたい' },
  ],
};
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(global.crypto, 'randomUUID', { configurable: true, value: jest.fn(() => 'synthetic-request') });
  state = { verified: true, consent: false, route: 'common', channel: null };
  api.getCatalog.mockResolvedValue(catalog);
  api.getState.mockImplementation(async () => ({ ...state }));
  api.confirm.mockImplementation(async () => {
    state.consent = true;
    state.channel = 'email';
    return { recorded: true };
  });
  api.stop.mockImplementation(async () => {
    state.consent = false;
    return { recorded: true };
  });
  api.selectRoute.mockImplementation(async (_id, route) => {
    state.route = route;
    return { recorded: true };
  });
});
test('opening settings never opts in; consent requires an unchecked-by-default checkbox and carries the notice version', async () => {
  render(<CommunicationPreferences />);
  const box = await screen.findByRole('checkbox');
  expect(box).not.toBeChecked();
  const button = screen.getByRole('button', { name: '同意して受取りを設定する' });
  expect(button).toBeDisabled();
  expect(api.confirm).not.toHaveBeenCalled();
  fireEvent.click(box);
  fireEvent.click(button);
  expect(await screen.findByText('受取りに同意済みです。')).toBeInTheDocument();
  expect(api.confirm).toHaveBeenCalledWith('synthetic-request', 'v1');
});
test('interest is saved independently from consent', async () => {
  render(<CommunicationPreferences />);
  const select = await screen.findByRole('combobox');
  fireEvent.change(select, { target: { value: 'team_handoff' } });
  fireEvent.click(screen.getByRole('button', { name: '関心を保存する' }));
  expect(await screen.findByText('設定を保存しました。')).toBeInTheDocument();
  expect(api.selectRoute).toHaveBeenCalledWith('synthetic-request', 'team_handoff');
  expect(api.confirm).not.toHaveBeenCalled();
  expect(screen.getByRole('checkbox')).not.toBeChecked();
});
test('stopping an active subscription reads the saved state before showing completion', async () => {
  state.consent = true;
  state.channel = 'email';
  render(<CommunicationPreferences />);
  fireEvent.click(await screen.findByRole('button', { name: 'この案内の配信を停止する' }));
  expect(await screen.findByText('配信を停止しました。')).toBeInTheDocument();
  expect(api.stop).toHaveBeenCalledTimes(1);
  expect(screen.getByText('現在、この案内を受け取る設定にはなっていません。')).toBeInTheDocument();
});
test('load failure is unknown, never portrayed as opted out, and can be reloaded', async () => {
  api.getState.mockRejectedValueOnce(new Error('offline'));
  render(<CommunicationPreferences />);
  const reload = await screen.findByRole('button', { name: '再読み込み' });
  expect(screen.queryByText('現在、この案内を受け取る設定にはなっていません。')).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  fireEvent.click(reload);
  expect(await screen.findByRole('checkbox')).not.toBeChecked();
});
test('uncertain save does not report success or allow another write until reloaded', async () => {
  api.confirm.mockRejectedValueOnce(new Error('offline'));
  render(<CommunicationPreferences />);
  fireEvent.click(await screen.findByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: '同意して受取りを設定する' }));
  const reload = await screen.findByRole('button', { name: '再読み込み' });
  expect(screen.queryByText('設定を保存しました。')).not.toBeInTheDocument();
  fireEvent.click(reload);
  expect(await screen.findByRole('checkbox')).not.toBeChecked();
  expect(api.confirm).toHaveBeenCalledTimes(1);
});
test('unverified members may stop but cannot consent', async () => {
  state.verified = false;
  render(<CommunicationPreferences />);
  expect(await screen.findByRole('checkbox')).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'この案内の配信を停止する' }));
  await waitFor(() => expect(api.stop).toHaveBeenCalledTimes(1));
});
