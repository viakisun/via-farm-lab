// Subscribe to plant biomass messages from /sim/stream. Maintains a map
// of plotId → fraction (0..1) so the renderer can scale meshes.
//
// We re-use the same WebSocket as useSimStream so we don't open a second
// connection — but to keep React boundaries simple, this hook opens its
// own. Future refactor (PR 41) consolidates into @via-farm-lab/data.
import { useEffect, useState } from 'react';

import { bffWsUrl } from './bff-url';

export interface PlantSnapshot {
  readonly plotId: string;
  readonly biomass: number;
  readonly ageDays: number;
  readonly fraction: number;
}

interface StreamMessage {
  readonly type: 'tick' | 'status' | 'jumped' | 'speed' | 'heartbeat' | 'plants';
  readonly at: string;
  readonly payload: unknown;
}

export function usePlants(): readonly PlantSnapshot[] {
  const [plants, setPlants] = useState<readonly PlantSnapshot[]>([]);

  useEffect(() => {
    let cancelled = false;
    let backoffTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let ws: WebSocket | null = null;

    const connect = (): void => {
      if (cancelled) return;
      ws = new WebSocket(bffWsUrl('/sim/stream'));

      ws.addEventListener('message', (event: MessageEvent<string>) => {
        if (cancelled) return;
        try {
          const msg = JSON.parse(event.data) as StreamMessage;
          if (msg.type === 'plants') {
            setPlants(msg.payload as PlantSnapshot[]);
          }
        } catch {
          // ignore malformed frames
        }
      });

      ws.addEventListener('open', () => {
        attempt = 0;
      });

      ws.addEventListener('close', () => {
        if (cancelled) return;
        attempt = Math.min(attempt + 1, 6);
        backoffTimer = setTimeout(connect, Math.min(30_000, 500 * 2 ** attempt));
      });

      ws.addEventListener('error', () => ws?.close());
    };

    connect();
    return () => {
      cancelled = true;
      if (backoffTimer) clearTimeout(backoffTimer);
      ws?.close();
    };
  }, []);

  return plants;
}
