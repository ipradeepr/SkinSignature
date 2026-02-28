import { useEffect, useState, type FC } from 'react';
import { apiFetch, apiUrl } from '../config/api';

type HealthDiagnostics = {
  opencv?: boolean;
  numpy?: boolean;
  mediapipe?: boolean;
  mediapipe_face_mesh_available?: boolean;
  facemesh_instantiated?: boolean;
  torch?: boolean;
  mode?: string;
};

type HealthResponse = {
  status?: string;
  diagnostics?: HealthDiagnostics;
};

const StatusDot: FC<{ ok: boolean }> = ({ ok }) => (
  <span
    className={`inline-block w-2.5 h-2.5 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`}
    aria-hidden
  />
);

const SystemHealthPanel: FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const healthViewUrl = apiUrl('/v1/health/view');
  const healthJsonUrl = apiUrl('/v1/health');

  const loadHealth = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch('/v1/health');
      if (!response.ok) {
        throw new Error(`Health API returned ${response.status}`);
      }
      const data = (await response.json()) as HealthResponse;
      setHealth(data);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unknown error';
      setError(reason);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const diagnostics = health?.diagnostics;

  return (
    <div className="mt-4 w-full max-w-md mx-auto">
      <div className="lux-card rounded-xl px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="font-bold text-sm text-[#6d4c1e]">Atelier Readiness</div>
          <button
            type="button"
            onClick={loadHealth}
            className="text-xs px-2 py-1 rounded border border-[#bfa77a] text-[#6d4c1e] hover:bg-[#bfa77a] hover:text-white transition"
            disabled={loading}
          >
            {loading ? 'Checking...' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            Atelier readiness check failed: {error}
          </div>
        )}

        {!error && (
          <div className="mt-3 space-y-2 text-xs text-[#6d4c1e]">
            <div className="flex items-center justify-between">
              <span>API Status</span>
              <span className="inline-flex items-center gap-2">
                <StatusDot ok={health?.status === 'ok'} />
                {health?.status === 'ok' ? 'OK' : 'Unavailable'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>MediaPipe Loaded</span>
              <span className="inline-flex items-center gap-2">
                <StatusDot ok={!!diagnostics?.mediapipe} />
                {diagnostics?.mediapipe ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>FaceMesh Module</span>
              <span className="inline-flex items-center gap-2">
                <StatusDot ok={!!diagnostics?.mediapipe_face_mesh_available} />
                {diagnostics?.mediapipe_face_mesh_available ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>FaceMesh Ready</span>
              <span className="inline-flex items-center gap-2">
                <StatusDot ok={!!diagnostics?.facemesh_instantiated} />
                {diagnostics?.facemesh_instantiated ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Mode</span>
              <span className="font-semibold text-[#bfa77a]">{diagnostics?.mode || 'unknown'}</span>
            </div>

            <div className="pt-2 mt-2 border-t border-[#bfa77a]/30 flex items-center justify-end gap-3">
              <a
                href={healthViewUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#6d4c1e] hover:text-[#bfa77a] transition"
              >
                Dashboard
              </a>
              <span className="text-[#bfa77a]/70">|</span>
              <a
                href={healthJsonUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#6d4c1e] hover:text-[#bfa77a] transition"
              >
                JSON
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemHealthPanel;
