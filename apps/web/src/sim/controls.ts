// Minimal REST client for /sim/clock control. Same-origin via Vite proxy
// in dev; configured base in prod (see bff-url.ts).
import { bffHttpUrl } from './bff-url';

async function post(path: string, body?: unknown): Promise<void> {
  const init: RequestInit = {
    method: 'POST',
    headers: body ? { 'content-type': 'application/json' } : {},
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  const res = await fetch(bffHttpUrl(`/sim/clock${path}`), init);
  if (!res.ok) {
    throw new Error(`sim control failed: ${res.status} ${res.statusText}`);
  }
}

export const simControls = {
  start: () => post('/start'),
  pause: () => post('/pause'),
  seek: (targetMs: number) => post('/seek', { targetMs }),
  setSpeed: (multiplier: number) => post('/speed', { multiplier }),
};
