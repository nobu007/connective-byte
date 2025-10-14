'use client';

import { useHealthCheck } from '../hooks/useHealthCheck';

const statusConfig = {
  loading: { bg: 'bg-yellow-200', text: 'text-yellow-900' },
  success: { bg: 'bg-green-200', text: 'text-green-900' },
  error: { bg: 'bg-red-200', text: 'text-red-900' },
};

export default function HealthCheck() {
  const { status, message } = useHealthCheck();
  const config = statusConfig[status] || statusConfig.error;

  return (
    <div className="space-y-2">
      <div className={`p-4 rounded-lg ${config.bg} ${config.text}`}>
        <p className="font-semibold">API Status: {status.toUpperCase()}</p>
        {message && <p className="mt-1">{message}</p>}
      </div>
    </div>
  );
}
