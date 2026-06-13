import { useEffect, useState, type JSX } from 'react';

import { api, type PlayScenarioResult, type ScenarioTemplate } from './api';

interface Props {
  /** Called once a scenario successfully starts so the parent can flip to 3D Live. */
  readonly onPlay: (scenario: ScenarioTemplate, result: PlayScenarioResult) => void;
}

export function ScenariosCard({ onPlay }: Props): JSX.Element {
  const [scenarios, setScenarios] = useState<readonly ScenarioTemplate[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listScenarios()
      .then((list) => {
        if (!cancelled) setScenarios(list);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const play = async (s: ScenarioTemplate): Promise<void> => {
    setBusyId(s.id);
    setError(null);
    try {
      // BFF /play auto-completes any prior scenario-occupied plots, so a
      // page refresh that orphaned the previous demo no longer blocks us.
      const result = await api.playScenario(s.id);
      onPlay(s, result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-2xl bg-[var(--color-surface-raised)]/85 px-6 py-5 ring-1 ring-white/5 shadow-2xl backdrop-blur-md">
      <header className="mb-4">
        <h2 className="text-lg font-semibold uppercase tracking-[0.18em] text-[var(--color-text)]">
          Scenarios
        </h2>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          One-click demos. Each plays at 100× sim speed in the 3D Live view.
        </p>
      </header>
      <ul className="space-y-3">
        {scenarios.map((s) => (
          <li key={s.id} className="rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-[var(--color-text)]">{s.name}</div>
                <div className="mt-1 text-xs leading-snug text-[var(--color-text-muted)]">
                  {s.hypothesis}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.factors.map((f) => (
                    <span
                      key={f.name}
                      className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]"
                    >
                      {f.name} × {f.levels.length}
                    </span>
                  ))}
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">
                    {s.demo.durationSimDays}d · {s.demo.simSpeedMultiplier}×
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void play(s)}
                disabled={busyId !== null}
                className="shrink-0 rounded-xl bg-[var(--color-success-500)] px-3 py-1.5 text-sm font-semibold text-[#0a1410] disabled:opacity-40"
              >
                {busyId === s.id ? '…' : '▶ Play'}
              </button>
            </div>
          </li>
        ))}
        {scenarios.length === 0 ? (
          <li className="text-sm text-[var(--color-text-muted)]">Loading…</li>
        ) : null}
      </ul>
      {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}
    </section>
  );
}
