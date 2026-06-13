// Fades in when a scenario reaches 'completed'. Computes a quick winner
// summary from the experiment's current MultiMetricSnapshots.
import { useMemo, type JSX } from 'react';

import { useDemo } from '../research/DemoController';
import { anova, cohensD, summarise } from '../research/stats';
import { useExperiment, useMultiMetricPoll } from '../research/useExperiments';

export function ScenarioResultCard(): JSX.Element | null {
  const demo = useDemo();
  const { experiment } = useExperiment(demo.result?.experimentId ?? null);
  const { metrics } = useMultiMetricPoll(2000);

  const summary = useMemo(() => {
    if (!experiment || metrics.length === 0) return null;
    const byPlot = new Map<string, (typeof metrics)[number]>();
    for (const m of metrics) byPlot.set(m.plotId, m);

    const buckets = new Map<string, number[]>();
    for (const a of experiment.assignments) {
      const snap = byPlot.get(a.plotId);
      if (!snap) continue;
      const list = buckets.get(a.treatmentId) ?? [];
      list.push(snap.biomass);
      buckets.set(a.treatmentId, list);
    }

    const summaries = experiment.treatments.map((t) => ({
      treatment: t,
      stats: summarise(t.id, buckets.get(t.id) ?? []),
    }));
    if (summaries.length === 0) return null;
    const sorted = [...summaries].sort((a, b) => b.stats.mean - a.stats.mean);
    const winner = sorted[0];
    const baseline = sorted[sorted.length - 1];
    if (!winner || !baseline) return null;
    const winnerValues = buckets.get(winner.treatment.id) ?? [];
    const baselineValues = buckets.get(baseline.treatment.id) ?? [];
    const groups = [...buckets.values()];
    return {
      winner,
      baseline,
      d: cohensD(winnerValues, baselineValues),
      anv: anova(groups),
      summaries: sorted,
    };
  }, [experiment, metrics]);

  if (demo.status !== 'completed') return null;
  if (!demo.scenario || !summary) {
    return (
      <div className="pointer-events-auto absolute left-1/2 top-1/2 z-40 w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[var(--color-surface-raised)]/95 px-6 py-5 text-center ring-1 ring-white/10 shadow-2xl backdrop-blur-md">
        <h2 className="text-base font-semibold uppercase tracking-[0.18em] text-[var(--color-text)]">
          {demo.scenario?.name ?? 'Scenario'} — completed
        </h2>
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">Waiting for final data…</p>
        <button
          type="button"
          onClick={() => demo.stop()}
          className="mt-4 rounded-lg bg-[var(--color-success-500)] px-4 py-2 text-sm font-semibold text-[#0a1410]"
        >
          ✓ Done
        </button>
      </div>
    );
  }

  const improvementPct =
    summary.baseline.stats.mean > 0
      ? ((summary.winner.stats.mean - summary.baseline.stats.mean) / summary.baseline.stats.mean) *
        100
      : 0;

  return (
    <section className="pointer-events-auto absolute left-1/2 top-1/2 z-40 w-[560px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[var(--color-surface-raised)]/95 px-6 py-5 ring-1 ring-white/10 shadow-2xl backdrop-blur-md">
      <header className="mb-3">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          Scenario Result
        </span>
        <h2 className="text-lg font-semibold text-[var(--color-text)]">{demo.scenario.name}</h2>
      </header>

      <div className="rounded-xl bg-emerald-500/15 px-4 py-3 ring-1 ring-emerald-500/30">
        <div className="text-[10px] uppercase tracking-wider text-emerald-300">Winner</div>
        <div className="mt-1 text-base font-semibold text-[var(--color-text)]">
          {summary.winner.treatment.label || summary.winner.treatment.id}
        </div>
        <div className="mt-1 text-xs text-[var(--color-text-muted)]">
          Biomass {summary.winner.stats.mean.toFixed(1)} g ({improvementPct >= 0 ? '+' : ''}
          {improvementPct.toFixed(0)}% vs {summary.baseline.treatment.label || 'baseline'})
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
            Cohen's d
          </div>
          <div className="mt-0.5 font-mono text-[var(--color-text)]">{summary.d.toFixed(2)}</div>
        </div>
        <div className="rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
            ANOVA F({summary.anv.dfBetween},{summary.anv.dfWithin})
          </div>
          <div className="mt-0.5 font-mono text-[var(--color-text)]">
            {summary.anv.F.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="mt-3 max-h-32 overflow-y-auto rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
              <th className="py-1 text-left">Treatment</th>
              <th className="py-1 text-right">n</th>
              <th className="py-1 text-right">mean ± std</th>
            </tr>
          </thead>
          <tbody>
            {summary.summaries.map((r) => (
              <tr key={r.treatment.id} className="border-t border-white/5">
                <td className="py-1 text-[var(--color-text-muted)]">
                  {r.treatment.label || r.treatment.id}
                </td>
                <td className="py-1 text-right text-[var(--color-text)]">{r.stats.n}</td>
                <td className="py-1 text-right font-mono text-[var(--color-text)]">
                  {r.stats.mean.toFixed(1)} ± {r.stats.std.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => demo.stop()}
          className="rounded-lg bg-[var(--color-success-500)] px-4 py-2 text-sm font-semibold text-[#0a1410]"
        >
          ✓ Done
        </button>
      </div>
    </section>
  );
}
