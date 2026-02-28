import { useCallback, useState } from 'react';
import { apiFetch } from '../config/api';

export function useBackendStatus() {
  const [status, setStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = useCallback(async () => {
    setIsChecking(true);
    setStatus('checking');
    try {
      const resp = await apiFetch('/v1/health');
      setStatus(resp.ok ? 'online' : 'offline');
    } catch {
      setStatus('offline');
    } finally {
      setIsChecking(false);
    }
  }, []);

  return { status, isChecking, checkStatus };
}
