// Subscribe to the simulator clock stream (WebSocket) and surface a
// React-friendly snapshot. Auto-reconnects on close with exponential backoff.
import { useEffect, useRef, useState } from 'react';

import { bffWsUrl } from './bff-url';

type ClockStatus = 'stopped' | 'running' | 'paused';

export interface ClockSnapshot {
  readonly status: ClockStatus;
  readonly tick: number;
  readonly simTimeMs: number;
  readonly simTimeIso: string;
  readonly speed: number;
  /** Hour-of-day 0..24, derived from simTimeMs by BFF. */
  readonly hourOfDay?: number;
  /** Sinusoidal lightFactor 0..1 for the current sim time. */
  readonly lightFactor?: number;
  /** Whole sim days since epoch. */
  readonly simDay?: number;
}

interface StreamMessage {
  readonly type: 'tick' | 'status' | 'jumped' | 'speed' | 'heartbeat';
  readonly at: string;
  readonly payload: unknown;
}

interface TickPayload {
  readonly tick: number;
  readonly simTimeMs: number;
  readonly wallTimeMs: number;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
function deriveDiurnal(simTimeMs: number): {
  hourOfDay: number;
  lightFactor: number;
  simDay: number;
} {
  const h = (((simTimeMs % DAY_MS) + DAY_MS) % DAY_MS) / HOUR_MS;
  const lightOnHour = 6;
  const photoperiodH = 16;
  let lf = 0;
  if (h >= lightOnHour && h < lightOnHour + photoperiodH) {
    const t = (h - lightOnHour) / photoperiodH;
    lf = Math.sin(Math.PI * t) ** 2;
  }
  return { hourOfDay: h, lightFactor: lf, simDay: Math.floor(simTimeMs / DAY_MS) };
}

export interface UseSimStream {
  readonly snapshot: ClockSnapshot | null;
  readonly connected: boolean;
  readonly lastMessageAt: number | null;
}

export function useSimStream(): UseSimStream {
  const [snapshot, setSnapshot] = useState<ClockSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const reconnectAttempt = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let backoffTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = (): void => {
      if (cancelled) return;
      // Same-origin via Vite proxy in dev; absolute configured origin in prod.
      // bffWsUrl() falls back to window.location.host when the build constant
      // is the localhost default, so we never bypass the proxy in dev.
      const ws = new WebSocket(bffWsUrl('/sim/stream'));
      wsRef.current = ws;

      ws.addEventListener('open', () => {
        if (cancelled) return;
        reconnectAttempt.current = 0;
        setConnected(true);
      });

      ws.addEventListener('message', (event: MessageEvent<string>) => {
        if (cancelled) return;
        setLastMessageAt(Date.now());
        try {
          const msg = JSON.parse(event.data) as StreamMessage;
          if (msg.type === 'status') {
            setSnapshot(msg.payload as ClockSnapshot);
          } else if (msg.type === 'tick') {
            const tickPayload = msg.payload as TickPayload;
            const diurnal = deriveDiurnal(tickPayload.simTimeMs);
            setSnapshot((prev) =>
              prev
                ? {
                    ...prev,
                    tick: tickPayload.tick,
                    simTimeMs: tickPayload.simTimeMs,
                    simTimeIso: new Date(tickPayload.simTimeMs).toISOString(),
                    ...diurnal,
                  }
                : null,
            );
          } else if (msg.type === 'speed') {
            const speedPayload = msg.payload as { speed: number };
            setSnapshot((prev) => (prev ? { ...prev, speed: speedPayload.speed } : null));
          }
          // jumped/heartbeat: rely on the next status/tick to refresh.
        } catch {
          // ignore malformed message; next one will be fine
        }
      });

      ws.addEventListener('close', () => {
        if (cancelled) return;
        setConnected(false);
        const attempt = Math.min(reconnectAttempt.current + 1, 6);
        reconnectAttempt.current = attempt;
        const delay = Math.min(30_000, 500 * 2 ** attempt);
        backoffTimer = setTimeout(connect, delay);
      });

      ws.addEventListener('error', () => {
        ws.close();
      });
    };

    connect();

    return () => {
      cancelled = true;
      if (backoffTimer) clearTimeout(backoffTimer);
      wsRef.current?.close();
    };
  }, []);

  return { snapshot, connected, lastMessageAt };
}
