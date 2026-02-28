const envBase =
  (import.meta.env.VITE_API_BASE as string) ||
  (import.meta.env.VITE_API_URL as string) ||
  '';

export const API_BASE: string = envBase.replace(/\/$/, '');

export const apiUrl = (path: string): string => {
  if (!path.startsWith('/')) return API_BASE ? `${API_BASE}/${path}` : `/${path}`;
  return API_BASE ? `${API_BASE}${path}` : path;
};

export const apiFetch = (path: string, init?: RequestInit) => {
  const url = apiUrl(path);
  return fetch(url, init);
};
