// Resolve the BFF URL at runtime. In dev the app's Vite server proxies /sim,
// /commissioning, /settings, /schedules, /sensors to the BFF on :4100, so the
// browser stays same-origin. In prod set VITE_SIM_BFF_URL at build time.
declare const __SIM_BFF_URL__: string;
declare const __SIM_BFF_WS_URL__: string;

const constUrl = (name: '__SIM_BFF_URL__' | '__SIM_BFF_WS_URL__'): string => {
  try {
    return name === '__SIM_BFF_URL__' ? __SIM_BFF_URL__ : __SIM_BFF_WS_URL__;
  } catch {
    return '';
  }
};

export function bffHttpUrl(path: string): string {
  const configured = constUrl('__SIM_BFF_URL__');
  if (configured && !/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(configured)) {
    return `${configured}${path}`;
  }
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}

export function bffWsUrl(path: string): string {
  const configured = constUrl('__SIM_BFF_WS_URL__');
  if (configured && !/^wss?:\/\/(localhost|127\.0\.0\.1)/i.test(configured)) {
    return `${configured}${path}`;
  }
  if (typeof window === 'undefined') return path;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}${path}`;
}
