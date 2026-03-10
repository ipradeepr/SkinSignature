const envBase =
  (import.meta.env.VITE_API_BASE as string) ||
  (import.meta.env.VITE_API_URL as string) ||
  '';

export const API_BASE: string = envBase.replace(/\/$/, '');

const isLoopbackApiBase = (base: string): boolean => {
  if (!base) return false;
  try {
    const parsed = new URL(base);
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname);
  } catch {
    return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i.test(base);
  }
};

const isLocalHost = (hostname: string): boolean => {
  return ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname);
};

export const apiUrl = (path: string): string => {
  if (!path.startsWith('/')) return API_BASE ? `${API_BASE}/${path}` : `/${path}`;
  return API_BASE ? `${API_BASE}${path}` : path;
};

export const apiFetch = (path: string, init?: RequestInit) => {
  if (
    typeof window !== 'undefined' &&
    API_BASE &&
    isLoopbackApiBase(API_BASE) &&
    !isLocalHost(window.location.hostname)
  ) {
    return Promise.reject(
      new Error(
        'Invalid API configuration: frontend is running on a public host but API base points to localhost. Set VITE_API_BASE to your deployed backend URL (https).'
      )
    );
  }

  const url = apiUrl(path);
  return fetch(url, init);
};

export const parseApiError = async (response: Response): Promise<string> => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => null);
    const message =
      (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string' && payload.message) ||
      (payload && typeof payload === 'object' && 'detail' in payload && typeof payload.detail === 'string' && payload.detail) ||
      '';
    return message || `HTTP ${response.status} ${response.statusText}`;
  }

  const bodyText = (await response.text().catch(() => '')).trim();
  if (bodyText.toLowerCase().includes('<!doctype html') || bodyText.toLowerCase().includes('<html')) {
    return `HTTP ${response.status} ${response.statusText} (received HTML instead of JSON; verify VITE_API_BASE points to backend)`;
  }

  if (!bodyText) return `HTTP ${response.status} ${response.statusText}`;

  const snippet = bodyText.replace(/\s+/g, ' ').slice(0, 220);
  return `HTTP ${response.status} ${response.statusText}: ${snippet}`;
};
