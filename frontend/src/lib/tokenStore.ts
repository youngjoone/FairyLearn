type Listener = (token: string) => void;

let accessToken: string = '';
const listeners = new Set<Listener>();

export function setAccessToken(token: string) {
  accessToken = token ?? '';
  listeners.forEach((listener) => listener(accessToken));
}

export function getAccessToken(): string {
  return accessToken;
}

export function clearAccessToken() {
  setAccessToken('');
}

export function subscribeAccessToken(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
