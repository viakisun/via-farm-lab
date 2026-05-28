// Resolve the BFF URL at runtime so the page works from any host
// (localhost, LAN IP, prod domain). In dev, Vite proxies /sim/* to the
// real BFF on :4100, so we always go same-origin from the browser.
//
// In production, set VITE_SIM_BFF_URL to the absolute origin
// (e.g. https://sim-bff.viafarm.com.au) at build time.
declare const __SIM_BFF_URL__: string;
declare const __SIM_BFF_WS_URL__: string;

export function bffHttpUrl(path: string): string {
  // Empty/localhost-default build constant means "use the page's origin".
  // Anything non-empty and non-localhost means a configured prod origin.
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
