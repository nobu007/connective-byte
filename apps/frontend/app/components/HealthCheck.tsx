'use client';

import { useState, useEffect } from 'react';

export default function HealthCheck() {
  const [status, setStatus] = useState('loading...');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) {
          throw new Error('API Error');
        }
        return res.json();
      })
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('error'));
  }, []);

  return <div>API Status: {status}</div>;
}
