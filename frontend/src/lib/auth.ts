import { getAccessToken, setAccessToken, clearAccessToken } from './tokenStore';

const ACCESS_STORAGE_KEY = 'jaramgle_access';

function persistAccessToken(token: string) {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      window.localStorage.setItem(ACCESS_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(ACCESS_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('[auth] Failed to persist access token:', err);
  }
}

function readStoredAccessToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  try {
    return window.localStorage.getItem(ACCESS_STORAGE_KEY) ?? '';
  } catch (err) {
    console.warn('[auth] Failed to read stored access token:', err);
    return '';
  }
}

export function setTokens(access?: string) {
  const token = access ?? '';
  setAccessToken(token);
  persistAccessToken(token);
}

export function getAccess() {
  const token = getAccessToken();
  if (token) {
    return token;
  }
  const stored = readStoredAccessToken();
  if (stored) {
    setAccessToken(stored);
  }
  return stored;
}

export function clearTokens() {
  clearAccessToken();
  persistAccessToken('');
}
