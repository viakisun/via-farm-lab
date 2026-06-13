import type { JSX } from 'react';

import type { Experiment } from './api';
import { useExperiments } from './useExperiments';

interface Props {
  readonly onSelect: (id: string) => void;
  readonly onNew: () => void;
}

export function ExperimentList({ onSelect, onNew }: Props): JSX.Element {
  const { experiments, loading, error, refresh } = useExperiments();
  return (
    <section className="rounded-2xl bg-[var(--color-surface-raised)]/85 px-6 py-5 ring-1 ring-white/5 shadow-2xl backdrop-blur-md">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold uppercase tracking-[0.18em] text-[var(--color-text)]">
          Experiments
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg bg-white/5 px-3 py-1 text-xs text-[var(--color-text-muted)] ring-1 ring-white/10 hover:bg-white/10"
            onClick={() => void refresh()}
          >
            Refresh
          </button>
          <button
            type="button"
            className="rounded-lg bg-[var(--color-success-500)] px-3 py-1 text-xs font-semibold text-[#0a1410]"
            onClick={onNew}
          >
            + New
          </button>
        </div>
      </header>
      {loading ? <p className="text-sm text-[var(--color-text-muted)]">Loading…</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <ul className="space-y-2">
        {experiments.length === 0 ? (
          <li className="text-sm text-[var(--color-text-muted)]">No experiments yet.</li>
        ) : null}
        {experiments.map((exp) => (
          <li key={exp.id}>
            <button
              type="button"
              onClick={() => onSelect(exp.id)}
              className="w-full rounded-xl bg-white/5 px-4 py-3 text-left ring-1 ring-white/10 hover:bg-white/10"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-[var(--color-text)]">{exp.name}</span>
                <StatusPill exp={exp} />
              </div>
              <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                {exp.factors.length} factor{exp.factors.length === 1 ? '' : 's'} ·{' '}
                {exp.treatments.length} treatment
                {exp.treatments.length === 1 ? '' : 's'} · {exp.assignments.length} plot
                {exp.assignments.length === 1 ? '' : 's'}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatusPill({ exp }: { readonly exp: Experiment }): JSX.Element {
  const color =
    exp.status === 'running'
      ? 'bg-emerald-500/20 text-emerald-300'
      : exp.status === 'completed'
        ? 'bg-slate-500/20 text-slate-300'
        : 'bg-amber-500/20 text-amber-300';
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${color}`}>
      {exp.status}
    </span>
  );
}
