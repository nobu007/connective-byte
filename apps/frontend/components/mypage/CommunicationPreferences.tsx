'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/forms/FormError';
import { communicationApi, type CommunicationCatalog, type CommunicationState } from '@/lib/api/communication-api';

type Action = 'consent' | 'route' | 'stop';

export function CommunicationPreferences() {
  const [state, setState] = useState<CommunicationState | null>(null);
  const [catalog, setCatalog] = useState<CommunicationCatalog | null>(null);
  const [route, setRoute] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const mounted = useRef(true);

  const load = useCallback(async () => {
    const [next, choices] = await Promise.all([communicationApi.getState(), communicationApi.getCatalog()]);
    if (mounted.current) {
      setState(next);
      setCatalog(choices);
      setRoute(next.route);
    }
    return next;
  }, []);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError('');
    setAgreed(false);
    setMessage('');
    try {
      await load();
    } catch {
      if (mounted.current) {
        setState(null);
        setError('設定を確認できませんでした。時間をおいて再読み込みしてください。');
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [load]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  const save = async (action: Action) => {
    if (busy || !state || !catalog || (action === 'consent' && !agreed)) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      // apiFetch retries reuse this body/ID; after an unknown result the UI
      // requires a fresh read before accepting a new explicit action.
      const id = crypto.randomUUID();
      if (action === 'consent') await communicationApi.confirm(id, catalog.noticeVersion);
      else if (action === 'route') await communicationApi.selectRoute(id, route);
      else await communicationApi.stop(id);
      // An acknowledged write is followed by a read: never paint optimistic consent.
      await load();
      if (mounted.current) {
        setAgreed(false);
        setMessage(action === 'stop' ? '配信を停止しました。' : '設定を保存しました。');
      }
    } catch {
      if (mounted.current) {
        setError('保存結果を確認できませんでした。再読み込みして現在の設定を確認してください。');
        setState(null);
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  if (!state || !catalog)
    return (
      <section className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8" aria-label="配信設定">
        {error ? (
          <>
            <FormError message={error} />
            <Button onClick={() => void refresh()} disabled={busy}>
              再読み込み
            </Button>
          </>
        ) : (
          <p role="status">配信設定を確認しています…</p>
        )}
      </section>
    );

  return (
    <section
      aria-labelledby="communication-title"
      className="bg-white border border-gray-200 rounded-lg p-6 sm:p-8 space-y-6"
    >
      <div>
        <h2 id="communication-title" className="text-xl font-semibold text-gray-900">
          {catalog.title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-gray-600">{catalog.description}</p>
        <p className="mt-2 text-sm leading-7 text-gray-600">{catalog.timing}</p>
      </div>
      <p className="text-sm font-medium" role="status">
        {state.consent ? '受取りに同意済みです。' : '現在、この案内を受け取る設定にはなっていません。'}
      </p>
      {!state.verified && (
        <p className="text-sm text-amber-800">
          案内を受け取るにはメールアドレスの確認が必要です。アカウント削除を予約中の場合も受取りを開始できません。配信停止はこのまま操作できます。
        </p>
      )}
      <div>
        <label htmlFor="communication-interest" className="block text-sm font-medium text-gray-900">
          いま関心があること
        </label>
        <select
          id="communication-interest"
          value={route}
          onChange={(event) => setRoute(event.target.value)}
          disabled={busy || !state.verified}
          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-3 text-sm"
        >
          {!catalog.routes.some((choice) => choice.id === route) && (
            <option value={route}>関心を選び直してください</option>
          )}
          {catalog.routes.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.label}
            </option>
          ))}
        </select>
        <p className="my-3 text-xs text-gray-500">関心を保存するだけでは、メールの受取りは始まりません。</p>
        <Button
          onClick={() => void save('route')}
          disabled={
            busy || !state.verified || route === state.route || !catalog.routes.some((choice) => choice.id === route)
          }
        >
          関心を保存する
        </Button>
      </div>
      {!state.consent && (
        <div className="border-t border-gray-100 pt-5">
          <label className="flex items-start gap-3 text-sm leading-6 text-gray-800">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
              disabled={busy || !state.verified}
              className="mt-1 h-4 w-4"
            />
            <span>上記の学習のヒントとコース案内を、登録したメールアドレスで受け取ることに同意します。</span>
          </label>
          <div className="mt-4">
            <Button onClick={() => void save('consent')} disabled={busy || !state.verified || !agreed}>
              同意して受取りを設定する
            </Button>
          </div>
        </div>
      )}
      <div className="border-t border-gray-100 pt-5">
        <button
          type="button"
          onClick={() => void save('stop')}
          disabled={busy}
          className="text-sm font-medium text-[#1e3a8a] underline disabled:opacity-50"
        >
          この案内の配信を停止する
        </button>
        <p className="mt-2 text-xs leading-6 text-gray-500">
          いつでもこの画面やメール内のリンクから停止できます。研究メールは別の購読設定です。停止前に送信処理へ入ったメールは届く場合があります。
        </p>
      </div>
      {busy && (
        <p role="status" className="text-sm text-gray-600">
          設定を確認しています…
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-emerald-700">
          {message}
        </p>
      )}
    </section>
  );
}
