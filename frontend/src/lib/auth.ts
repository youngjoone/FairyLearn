export const ACCESS_KEY = 'findme_access';
export const REFRESH_KEY = 'findme_refresh';

export function setTokens(access?: string, refresh?: string) {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function getAccess() { return localStorage.getItem(ACCESS_KEY) || ''; }
export function getRefresh() { return localStorage.getItem(REFRESH_KEY) || ''; }

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}