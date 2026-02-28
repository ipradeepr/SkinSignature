import { useEffect, useState } from 'react';
import { apiFetch } from '../config/api';

export function useBackendStatus(pollMs: number = 5000) {
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const check = async () => {
      try {
        const resp = await apiFetch('/v1/health');
        if (!cancelled) {
          setStatus(resp.ok ? 'online' : 'offline');
        }
      } catch {
        if (!cancelled) setStatus('offline');
      }
      timer = window.setTimeout(check, pollMs);
    };

    check();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [pollMs]);

  return status;
}
