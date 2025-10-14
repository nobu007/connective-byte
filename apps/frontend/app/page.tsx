'use client';

import { useHealthCheck } from './hooks/useHealthCheck';

const statusConfig = {
  loading: { bg: 'bg-yellow-200', text: 'text-yellow-900' },
  success: { bg: 'bg-green-200', text: 'text-green-900' },
  error: { bg: 'bg-red-200', text: 'text-red-900' },
};

export default function Home() {
  const { status, message } = useHealthCheck();
  const config = statusConfig[status] || statusConfig.error;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          {message}
        </p>
        <div className={`p-4 rounded-lg ${config.bg} ${config.text}`} data-testid="status-indicator">
          <p className="font-semibold">Current Status: {status.toUpperCase()}</p>
        </div>
      </div>
    </main>
  );
}
