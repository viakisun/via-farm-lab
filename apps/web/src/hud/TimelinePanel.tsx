// Bottom-centre floating timeline scrubber with Play / Pause / Speed and
// a draggable progress bar mapped onto the active scenario's
// durationSimDays. Drag → POST /sim/clock/seek (jumps to absolute sim time
// of `demo.startedAtSimMs + dragFraction × durationMs`).
//
// Only renders while a scenario is active — outside of demo mode the bar
// would have no meaningful timeline.

import { useCallback, useMemo, useRef, useState, type JSX, type PointerEvent } from 'react';

import { useDemo } from '../research/DemoController';
import { api } from '../research/api';
import { useSimStream } from '../sim/useSimStream';

const DAY_MS = 86_400_000;
const SPEED_PRESETS: readonly number[] = [1000, 10_000, 100_000];

function formatSpeed(sp: number): string {
  if (sp >= 1000) return `${sp / 1000}k×`;
  return `${sp}×`;
}

interface DayLabel {
  readonly fraction: number;
  readonly day: number;
}

function dayMarkers(durationDays: number): DayLabel[] {
  const out: DayLabel[] = [];
  const step = durationDays <= 7 ? 1 : durationDays <= 14 ? 2 : 7;
  for (let d = 0; d <= durationDays; d += step) {
    out.push({ fraction: d / durationDays, day: d });
  }
  return out;
}

export function TimelinePanel(): JSX.Element | null {
  const demo = useDemo();
  const { snapshot } = useSimStream();
  const [dragFraction, setDragFraction] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  // All hooks must run on every render — derive scenario-dependent values
  // with safe fallbacks so we can early-return AFTER the hook block.
  const durationDays = demo.scenario?.demo.durationSimDays ?? 1;
  const durationMs = durationDays * DAY_MS;
  const startMs = demo.startedAtSimMs;
  const currentMs = snapshot?.simTimeMs ?? startMs ?? 0;
  const liveFraction =
    startMs === null ? 0 : Math.max(0, Math.min(1, (currentMs - startMs) / durationMs));
  const fraction = dragFraction ?? liveFraction;

  const markers = useMemo(() => dayMarkers(durationDays), [durationDays]);

  const positionFromEvent = useCallback((event: PointerEvent<HTMLDivElement>): number => {
    const bar = barRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    const x = event.clientX - rect.left;
    return Math.max(0, Math.min(1, x / rect.width));
  }, []);

  const onScrub = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.buttons !== 1) return;
      setDragFraction(positionFromEvent(event));
    },
    [positionFromEvent],
  );

  const commitSeek = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (startMs === null) return;
      const f = positionFromEvent(event);
      const targetMs = startMs + f * durationMs;
      setDragFraction(null);
      void api.seekClock(Math.max(0, Math.floor(targetMs))).catch(() => {
        /* ignore */
      });
    },
    [durationMs, positionFromEvent, startMs],
  );

  if (demo.status === 'idle' || !demo.scenario) return null;

  const isPaused = snapshot?.status === 'paused' || snapshot?.status === 'stopped';
  const currentSpeed = snapshot?.speed ?? 1;

  const onPlayPause = (): void => {
    if (isPaused) void api.startClock().catch(() => undefined);
    else void api.pauseClock().catch(() => undefined);
  };

  const elapsedDays = liveFraction * durationDays;
  const hhmm = (() => {
    if (snapshot?.hourOfDay === undefined) return '--:--';
    const h = Math.floor(snapshot.hourOfDay);
    const m = Math.floor((snapshot.hourOfDay - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  })();
  const sunGlyph = (snapshot?.lightFactor ?? 0) > 0.05 ? '☀' : '☾';

  return (
    <section
      className="pointer-events-auto absolute bottom-6 left-1/2 z-30 w-[760px] max-w-[94vw] -translate-x-1/2 rounded-2xl bg-[var(--color-surface-raised)]/90 px-5 py-3 ring-1 ring-white/10 shadow-2xl backdrop-blur-md"
      aria-label="Timeline scrubber"
    >
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPlayPause}
            className="rounded-lg bg-[var(--color-success-500)]/90 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#0a1410] hover:bg-[var(--color-success-500)]"
          >
            {isPaused ? '▶ Play' : '⏸ Pause'}
          </button>
          <div className="flex gap-1 rounded-lg bg-white/5 p-0.5 ring-1 ring-white/10">
            {SPEED_PRESETS.map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => {
                  void api.setClockSpeed(sp).catch(() => undefined);
                }}
                className={
                  'rounded-md px-2 py-0.5 font-mono text-[11px] transition ' +
                  (Math.abs(currentSpeed - sp) < 0.01
                    ? 'bg-[var(--color-success-500)]/30 text-[var(--color-text)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]')
                }
              >
                {formatSpeed(sp)}
              </button>
            ))}
          </div>
        </div>
        <div className="font-mono text-xs text-[var(--color-text)]">
          Day {Math.floor(elapsedDays)} · {hhmm} {sunGlyph}
          <span className="ml-2 text-[var(--color-text-muted)]">/ Day {durationDays}</span>
        </div>
      </header>

      <div
        ref={barRef}
        role="slider"
        tabIndex={0}
        aria-label="Timeline position"
        aria-valuemin={0}
        aria-valuemax={durationDays}
        aria-valuenow={Math.round(elapsedDays)}
        className="relative mt-3 h-3 cursor-pointer rounded-full bg-white/5 ring-1 ring-white/10"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragFraction(positionFromEvent(event));
        }}
        onPointerMove={onScrub}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId);
          commitSeek(event);
        }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-success-500)]/70"
          style={{ width: `${fraction * 100}%` }}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-success-500)] ring-2 ring-[#0a1410]"
          style={{ left: `${fraction * 100}%` }}
        />
        {markers.map((m) => (
          <div
            key={m.day}
            className="pointer-events-none absolute top-full mt-1 -translate-x-1/2 font-mono text-[9px] text-[var(--color-text-muted)]"
            style={{ left: `${m.fraction * 100}%` }}
          >
            {m.day}
          </div>
        ))}
      </div>
    </section>
  );
}
