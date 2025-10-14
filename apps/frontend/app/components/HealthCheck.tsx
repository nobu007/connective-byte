'use client';

import { useHealthCheck } from '../hooks/useHealthCheck';

export default function HealthCheck() {
  const { status, message } = useHealthCheck();

  return (
    <div>
      API Status: {status}
      {message && <p>{message}</p>}
    </div>
  );
}
