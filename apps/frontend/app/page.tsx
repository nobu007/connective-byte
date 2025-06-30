'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Connecting to backend...');

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        console.log('--- FETCHING API STATUS ---');
        const response = await fetch('/api/health');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setStatus('success');
        setMessage(`Backend status: ${data.status}`);
      } catch (error) {
        setStatus('error');
        setMessage('Failed to connect to the backend.');
        console.error('Error fetching health:', error);
      }
    };

    fetchHealth();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          {message}
        </p>
        <div className={`p-4 rounded-lg ${status === 'loading' ? 'bg-yellow-200' : status === 'success' ? 'bg-green-200' : 'bg-red-200'}`}>
          <p data-testid="status-indicator">Current Status: {status.toUpperCase()}</p>
        </div>
      </div>
    </main>
  );
}
