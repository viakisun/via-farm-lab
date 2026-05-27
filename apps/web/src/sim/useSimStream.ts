// Subscribe to the simulator clock stream (WebSocket) and surface a
// React-friendly snapshot. Auto-reconnects on close with exponential backoff.
import { useEffect, useRef, useState } from 'react';

type ClockStatus = 'stopped' | 'running' | 'paused';

export interface ClockSnapshot {
  readonly status: ClockStatus;
  readonly tick: number;
  readonly simTimeMs: number;
  readonly simTimeIso: string;
  readonly speed: number;
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

declare const __SIM_BFF_WS_URL__: string;

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
      // Same-origin via Vite proxy in dev; absolute in prod.
      const url = `${__SIM_BFF_WS_URL__}/sim/stream`;
      const ws = new WebSocket(url);
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
            setSnapshot((prev) =>
              prev
                ? {
                    ...prev,
                    tick: tickPayload.tick,
                    simTimeMs: tickPayload.simTimeMs,
                    simTimeIso: new Date(tickPayload.simTimeMs).toISOString(),
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
