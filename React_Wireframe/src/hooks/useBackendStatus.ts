import { useCallback, useState } from 'react';
import { apiFetch } from '../config/api';

export function useBackendStatus() {
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    setStatus('checking');
    try {
      const pingResp = await apiFetch('/v1/ping', { cache: 'no-store' });
      if (pingResp.ok) {
        setStatus('online');
        return;
      }

      const healthResp = await apiFetch('/v1/health', { cache: 'no-store' });
      setStatus(healthResp.ok ? 'online' : 'offline');
    } catch {
      setStatus('offline');
    } finally {
      setIsChecking(false);
    }
  }, []);

  return { status, isChecking, checkStatus };
}
