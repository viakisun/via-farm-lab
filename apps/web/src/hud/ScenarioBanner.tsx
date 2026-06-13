import type { JSX } from 'react';

import { useDemo } from '../research/DemoController';
import { useSimStream } from '../sim/useSimStream';

function formatDayClock(
  simTimeMs: number,
  startedAtMs: number | null,
): {
  simDay: number;
  hh: string;
  mm: string;
  isDay: boolean;
} {
  const baseMs = startedAtMs ?? 0;
  const elapsed = Math.max(0, simTimeMs - baseMs);
  const dayMs = 86_400_000;
  const simDay = Math.floor(elapsed / dayMs);
  const inDayMs = elapsed - simDay * dayMs;
  const totalMins = Math.floor(inDayMs / 60_000);
  const hh = String(Math.floor(totalMins / 60)).padStart(2, '0');
  const mm = String(totalMins % 60).padStart(2, '0');
  const h = Math.floor(totalMins / 60);
  return { simDay, hh, mm, isDay: h >= 6 && h < 22 };
}

export function ScenarioBanner(): JSX.Element | null {
  const demo = useDemo();
  const { snapshot } = useSimStream();
  if (demo.status === 'idle' || !demo.scenario) return null;

  const pct = Math.round(demo.progress * 100);
  const statusLabel =
    demo.status === 'starting'
      ? 'Starting…'
      : demo.status === 'playing'
        ? 'Playing'
        : demo.status === 'completing'
          ? 'Finalising…'
          : 'Completed';

  const clock = snapshot ? formatDayClock(snapshot.simTimeMs, demo.startedAtSimMs) : null;
  const lf = snapshot?.lightFactor ?? 0;

  const factorChips = demo.scenario.factors
    .map((f) => `${f.name} × ${f.levels.length}`)
    .join(' · ');

  return (
    <section className="pointer-events-auto absolute left-1/2 top-6 z-30 w-[640px] max-w-[92vw] -translate-x-1/2 rounded-2xl bg-[var(--color-surface-raised)]/85 px-5 py-3 ring-1 ring-white/10 shadow-2xl backdrop-blur-md">
      <header className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 truncate">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            Scenario · {statusLabel}
            {clock && (
              <span className="ml-2 font-mono text-[var(--color-text)]">
                Day {clock.simDay} · {clock.hh}:{clock.mm} {clock.isDay ? '☀' : '☾'}
                <span className="ml-1 text-[var(--color-text-muted)]">({lf.toFixed(2)})</span>
              </span>
            )}
          </span>
          <h2 className="truncate text-base font-semibold text-[var(--color-text)]">
            {demo.scenario.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => demo.stop()}
          className="shrink-0 rounded-lg bg-white/5 px-3 py-1 text-xs text-[var(--color-text-muted)] ring-1 ring-white/10 hover:bg-white/10 hover:text-[var(--color-text)]"
        >
          ⨯ Stop
        </button>
      </header>
      <p className="mt-1 line-clamp-2 text-xs leading-snug text-[var(--color-text-muted)]">
        {demo.scenario.hypothesis}
      </p>
      <div className="mt-2 flex items-center gap-3">
        <div className="grow rounded-full bg-white/5 ring-1 ring-white/10">
          <div
            className="h-1.5 rounded-full bg-[var(--color-success-500)] transition-[width] duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="shrink-0 font-mono text-[11px] text-[var(--color-text)]">{pct}%</span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
        <span>{factorChips}</span>
        <span>
          {demo.scenario.demo.durationSimDays}d · {demo.scenario.demo.simSpeedMultiplier}×
        </span>
      </div>
    </section>
  );
}
