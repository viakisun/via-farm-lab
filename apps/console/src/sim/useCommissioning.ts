// Live commissioning state from the DigitalTwin BFF: subscribes to the
// `commissioning` messages on /sim/stream and exposes a command() that POSTs a
// recipe. Auto-reconnects with exponential backoff (mirrors useSimStream).
import { useCallback, useEffect, useRef, useState } from 'react';

import { bffHttpUrl, bffWsUrl } from './bff-url';

export type Signal = 'Pending' | 'Estimated' | 'Measured';

export interface Verdict {
  readonly metric: 'EC' | 'pH' | 'flow' | 'power';
  readonly target: number;
  readonly actual: number;
  readonly variance: number;
  readonly tolerance: number;
  readonly withinTol: boolean;
  readonly settled: boolean;
  readonly signal: Signal;
}

export interface Rig {
  readonly id: string;
  readonly label: string;
  readonly volumeL: number;
  readonly EC: number;
  readonly pH: number;
  readonly target: { readonly EC: number; readonly pH: number; readonly abRatio: number } | null;
  readonly flowLmin: number;
  readonly powerW: number;
  readonly lastCommandMs: number | null;
  readonly inFlight: boolean;
  readonly settled: boolean;
  readonly verdicts: Verdict[];
}

export interface CommandInput {
  readonly targetEC: number;
  readonly targetPH: number;
  readonly abRatio: number;
  readonly volumeL?: number;
}

interface StreamMessage {
  readonly type: string;
  readonly payload: unknown;
}

export interface UseCommissioning {
  readonly rigs: Rig[];
  readonly connected: boolean;
  readonly command: (rigId: string, input: CommandInput) => Promise<void>;
  readonly reset: (rigId: string) => Promise<void>;
}

export function useCommissioning(): UseCommissioning {
  const [rigs, setRigs] = useState<Rig[]>([]);
  const [connected, setConnected] = useState(false);
  const reconnectAttempt = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let backoffTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = (): void => {
      if (cancelled) return;
      const ws = new WebSocket(bffWsUrl('/sim/stream'));

      ws.addEventListener('open', () => {
        if (cancelled) return;
        reconnectAttempt.current = 0;
        setConnected(true);
      });
      ws.addEventListener('message', (event: MessageEvent<string>) => {
        if (cancelled) return;
        try {
          const msg = JSON.parse(event.data) as StreamMessage;
          if (msg.type === 'commissioning') setRigs(msg.payload as Rig[]);
        } catch {
          // ignore malformed frames
        }
      });
      ws.addEventListener('close', () => {
        if (cancelled) return;
        setConnected(false);
        const attempt = Math.min(reconnectAttempt.current + 1, 6);
        reconnectAttempt.current = attempt;
        backoffTimer = setTimeout(connect, Math.min(30_000, 500 * 2 ** attempt));
      });
      ws.addEventListener('error', () => ws.close());
    };

    connect();
    return () => {
      cancelled = true;
      if (backoffTimer) clearTimeout(backoffTimer);
    };
  }, []);

  const command = useCallback(async (rigId: string, input: CommandInput): Promise<void> => {
    await fetch(bffHttpUrl(`/commissioning/${rigId}/command`), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
  }, []);

  const reset = useCallback(async (rigId: string): Promise<void> => {
    await fetch(bffHttpUrl(`/commissioning/${rigId}/reset`), { method: 'POST' });
  }, []);

  return { rigs, connected, command, reset };
}
