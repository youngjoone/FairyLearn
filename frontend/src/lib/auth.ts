import { getAccessToken, setAccessToken, clearAccessToken } from './tokenStore';

export function setTokens(access?: string) {
  setAccessToken(access ?? '');
}

export function getAccess() {
  return getAccessToken();
}

export function clearTokens() {
  clearAccessToken();
}
