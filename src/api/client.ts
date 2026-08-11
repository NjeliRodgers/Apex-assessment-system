export const API_BASE_URL: string =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TOKEN_STORAGE_KEY = 'apex_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const token = getStoredToken();

  const headers = new Headers(init?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, { ...init, headers });
}

export const jsonHeaders = { 'Content-Type': 'application/json' };