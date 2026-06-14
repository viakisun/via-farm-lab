// Resolve the BFF URL at runtime so the page works from any host
// (localhost, LAN IP, prod domain). In dev, Vite proxies /sim/* and
// /commissioning/* to the real BFF on :4100, so we always go same-origin.
//
// In production, set VITE_SIM_BFF_URL to the absolute origin at build time.
// (Copied from apps/web/src/sim/bff-url.ts — apps can't cross-import; a future
// @via-farm-lab/data package should host this once.)
declare const __SIM_BFF_URL__: string;
declare const __SIM_BFF_WS_URL__: string;

export function bffHttpUrl(path: string): string {
  const configured = __SIM_BFF_URL__;
  if (configured && !/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(configured)) {
    return `${configured}${path}`;
  }
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}

export function bffWsUrl(path: string): string {
  const configured = __SIM_BFF_WS_URL__;
  if (configured && !/^wss?:\/\/(localhost|127\.0\.0\.1)/i.test(configured)) {
    return `${configured}${path}`;
  }
  if (typeof window === 'undefined') return path;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}${path}`;
}
