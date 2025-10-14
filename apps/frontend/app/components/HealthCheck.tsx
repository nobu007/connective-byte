'use client';

import { useHealthCheck } from '../hooks/useHealthCheck';
import { getStatusConfig } from '@libs/components/config/statusConfig';

export default function HealthCheck() {
  const { status, message } = useHealthCheck();
  const config = getStatusConfig(status);

  return (
    <div className="space-y-2">
      <div className={`p-4 rounded-lg ${config.bg} ${config.text}`}>
        <p className="font-semibold">API Status: {status.toUpperCase()}</p>
        {message && <p className="mt-1">{message}</p>}
      </div>
    </div>
  );
}
