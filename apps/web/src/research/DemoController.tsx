// Orchestrates a scenario play: sim speed up → wait for sim duration →
// auto-pause. Exposes demo state via a small React context so the
// 3D scene + HUD can react (camera path, banner, result card).
//
// In Phase E-A, this controller wires (1) clock speed (2) auto-pause when
// the simulator advances past `durationSimDays`. Camera animation +
// HUD banner come in Phase E-C.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from 'react';

import { useSimStream } from '../sim/useSimStream';
import { api, type PlayScenarioResult, type ScenarioTemplate } from './api';

export interface DemoState {
  readonly scenario: ScenarioTemplate | null;
  readonly result: PlayScenarioResult | null;
  /** 0..1 progress through the demo. */
  readonly progress: number;
  readonly status: 'idle' | 'starting' | 'playing' | 'completing' | 'completed';
  /** Sim-clock value when the scenario started. Used for Day 0/n labelling. */
  readonly startedAtSimMs: number | null;
  readonly start: (scenario: ScenarioTemplate, result: PlayScenarioResult) => void;
  readonly stop: () => void;
}

const Ctx = createContext<DemoState | null>(null);

export function useDemo(): DemoState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useDemo must be inside <DemoProvider>');
  return ctx;
}

export function DemoProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  const [scenario, setScenario] = useState<ScenarioTemplate | null>(null);
  const [result, setResult] = useState<PlayScenarioResult | null>(null);
  const [status, setStatus] = useState<DemoState['status']>('idle');
  const startSimMsRef = useRef<number | null>(null);
  const [startedAtSimMs, setStartedAtSimMs] = useState<number | null>(null);
  const { snapshot } = useSimStream();

  const start = useCallback((s: ScenarioTemplate, r: PlayScenarioResult) => {
    setScenario(s);
    setResult(r);
    setStatus('starting');
    startSimMsRef.current = null;
    setStartedAtSimMs(null);
  }, []);

  const stop = useCallback(() => {
    setScenario(null);
    setResult(null);
    setStatus('idle');
    startSimMsRef.current = null;
    setStartedAtSimMs(null);
    void api.pauseClock().catch(() => {
      /* ignore */
    });
    void api.setClockSpeed(1).catch(() => {
      /* ignore */
    });
  }, []);

  // Apply sim speed + start on transition starting → playing.
  useEffect(() => {
    if (status !== 'starting' || !scenario) return;
    void (async (): Promise<void> => {
      try {
        await api.setClockSpeed(scenario.demo.simSpeedMultiplier);
        await api.startClock();
        const t = snapshot?.simTimeMs ?? Date.now();
        startSimMsRef.current = t;
        setStartedAtSimMs(t);
        setStatus('playing');
      } catch {
        /* swallow */
      }
    })();
  }, [status, scenario, snapshot?.simTimeMs]);

  // Watch sim clock; when we pass durationSimDays, pause + complete.
  useEffect(() => {
    if (status !== 'playing' || !scenario || !snapshot) return;
    if (startSimMsRef.current === null) {
      startSimMsRef.current = snapshot.simTimeMs;
      setStartedAtSimMs(snapshot.simTimeMs);
      return;
    }
    const elapsedMs = snapshot.simTimeMs - startSimMsRef.current;
    const targetMs = scenario.demo.durationSimDays * 86_400_000;
    if (elapsedMs >= targetMs) {
      setStatus('completing');
      void (async (): Promise<void> => {
        try {
          await api.pauseClock();
          await api.setClockSpeed(1);
          setStatus('completed');
        } catch {
          setStatus('completed');
        }
      })();
    }
  }, [status, scenario, snapshot]);

  const progress = useMemo(() => {
    if (!scenario || !snapshot || startSimMsRef.current === null) return 0;
    const elapsedMs = snapshot.simTimeMs - startSimMsRef.current;
    const targetMs = scenario.demo.durationSimDays * 86_400_000;
    return Math.max(0, Math.min(1, elapsedMs / targetMs));
  }, [scenario, snapshot]);

  const value: DemoState = useMemo(
    () => ({ scenario, result, progress, status, startedAtSimMs, start, stop }),
    [scenario, result, progress, status, startedAtSimMs, start, stop],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
