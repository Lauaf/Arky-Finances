const isLocalHost =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const environment = {
  apiBaseUrl: isLocalHost ? 'http://127.0.0.1:8000/api' : '/api',
};
