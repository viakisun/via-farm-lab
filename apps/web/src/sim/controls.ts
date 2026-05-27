// Minimal REST client for /sim/clock control. Same-origin in dev (Vite proxy),
// configured base in prod via __SIM_BFF_URL__.
declare const __SIM_BFF_URL__: string;

const base = `${__SIM_BFF_URL__}/sim/clock`;

async function post(path: string, body?: unknown): Promise<void> {
  const init: RequestInit = {
    method: 'POST',
    headers: body ? { 'content-type': 'application/json' } : {},
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${base}${path}`, init);
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
