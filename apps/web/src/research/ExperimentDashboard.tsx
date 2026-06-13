import { useMemo, type JSX } from 'react';

import type { Experiment, MetricName } from './api';
import { anova, cohensD, summarise, tukeyHSD, welchT } from './stats';
import { useMultiMetricPoll } from './useExperiments';

interface Props {
  readonly experiment: Experiment;
}

const METRICS: readonly { key: MetricName; label: string; unit: string }[] = [
  { key: 'biomass', label: 'Biomass', unit: 'g' },
  { key: 'canopyHeightCm', label: 'Height', unit: 'cm' },
  { key: 'leafAreaCm2', label: 'Leaf area', unit: 'cm²' },
  { key: 'leafCount', label: 'Leaves', unit: '' },
  { key: 'colorHealth', label: 'Colour', unit: '0..1' },
];

export function ExperimentDashboard({ experiment }: Props): JSX.Element {
  const { metrics } = useMultiMetricPoll(2000);

  // plotId → MultiMetricSnapshot for fast lookup
  const byPlot = useMemo(() => {
    const m = new Map<string, (typeof metrics)[number]>();
    for (const s of metrics) m.set(s.plotId, s);
    return m;
  }, [metrics]);

  const assignedPlots = experiment.assignments;
  // Group plot-level metric values by treatmentId for per-metric stats.
  const groupsByMetric = useMemo(() => {
    const out = new Map<MetricName, Map<string, number[]>>();
    for (const m of METRICS) {
      const trtMap = new Map<string, number[]>();
      for (const a of assignedPlots) {
        const snap = byPlot.get(a.plotId);
        if (!snap) continue;
        const value = snap[m.key];
        if (value === undefined) continue;
        const bucket = trtMap.get(a.treatmentId) ?? [];
        bucket.push(value);
        trtMap.set(a.treatmentId, bucket);
      }
      out.set(m.key, trtMap);
    }
    return out;
  }, [assignedPlots, byPlot]);

  return (
    <section className="space-y-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold uppercase tracking-[0.18em] text-[var(--color-text)]">
          {experiment.name}
        </h2>
        <span className="text-xs text-[var(--color-text-muted)]">
          {experiment.status === 'running'
            ? `running · ${experiment.assignments.length} plots`
            : experiment.status}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {METRICS.map((m) => {
          const trtMap = groupsByMetric.get(m.key);
          const groups = trtMap ? [...trtMap.values()] : [];
          const anv = anova(groups);
          const tukey = tukeyHSD(groups);
          return (
            <div
              key={m.key}
              className="rounded-2xl bg-[var(--color-surface-raised)]/85 px-4 py-3 ring-1 ring-white/5"
            >
              <h3 className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                {m.label}
              </h3>
              <div className="mt-2 space-y-1">
                {trtMap && trtMap.size > 0 ? (
                  [...trtMap.entries()].map(([trtId, values]) => {
                    const s = summarise(trtId, values);
                    const trt = experiment.treatments.find((t) => t.id === trtId);
                    return (
                      <div key={trtId} className="text-[11px] text-[var(--color-text)]">
                        <div className="flex justify-between">
                          <span className="text-[var(--color-text-muted)]">
                            {trt?.label ?? trtId.slice(0, 6)}
                          </span>
                          <span className="font-mono">
                            {s.mean.toFixed(1)} ± {s.std.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-[var(--color-text-muted)]">No data</div>
                )}
              </div>
              {groups.length >= 2 ? (
                <div className="mt-2 border-t border-white/10 pt-1 text-[10px] text-[var(--color-text-muted)]">
                  F={anv.F.toFixed(2)} df={anv.dfBetween},{anv.dfWithin}
                  {tukey > 0 ? ` · HSD₀.₀₅≈${tukey.toFixed(2)}` : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {experiment.treatments.length >= 2 ? (
        <PairwiseTable experiment={experiment} byPlot={byPlot} />
      ) : null}

      <PlotHeatmap experiment={experiment} byPlot={byPlot} />
    </section>
  );
}

function PairwiseTable({
  experiment,
  byPlot,
}: {
  readonly experiment: Experiment;
  readonly byPlot: Map<string, ReturnType<typeof useMultiMetricPoll>['metrics'][number]>;
}): JSX.Element {
  // Cohen's d + Welch t between consecutive treatments on biomass.
  const treatments = experiment.treatments;
  const buckets = new Map<string, number[]>();
  for (const a of experiment.assignments) {
    const snap = byPlot.get(a.plotId);
    if (!snap) continue;
    const list = buckets.get(a.treatmentId) ?? [];
    list.push(snap.biomass);
    buckets.set(a.treatmentId, list);
  }
  const rows = treatments.slice(1).map((t, i) => {
    const baseline = treatments[i];
    if (!baseline) return null;
    const a = buckets.get(baseline.id) ?? [];
    const b = buckets.get(t.id) ?? [];
    return {
      key: `${baseline.id}-${t.id}`,
      labelA: baseline.label,
      labelB: t.label,
      d: cohensD(a, b),
      welch: welchT(a, b),
      nA: a.length,
      nB: b.length,
    };
  });
  return (
    <section className="rounded-2xl bg-[var(--color-surface-raised)]/85 px-4 py-3 ring-1 ring-white/5">
      <h3 className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
        Pairwise effect (biomass): Cohen's d / Welch t
      </h3>
      <table className="mt-2 w-full text-xs text-[var(--color-text)]">
        <tbody>
          {rows
            .filter((r): r is NonNullable<typeof r> => r !== null)
            .map((r) => (
              <tr key={r.key} className="border-t border-white/5">
                <td className="py-1 pr-3 text-[var(--color-text-muted)]">{r.labelA}</td>
                <td className="py-1 pr-3 text-[var(--color-text-muted)]">vs {r.labelB}</td>
                <td className="py-1 pr-3 text-right font-mono">d={r.d.toFixed(2)}</td>
                <td className="py-1 text-right font-mono">t={r.welch.toFixed(2)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </section>
  );
}

function PlotHeatmap({
  experiment,
  byPlot,
}: {
  readonly experiment: Experiment;
  readonly byPlot: Map<string, ReturnType<typeof useMultiMetricPoll>['metrics'][number]>;
}): JSX.Element {
  // Compute min/max biomass to colourise.
  let max = 0;
  for (const a of experiment.assignments) {
    const v = byPlot.get(a.plotId)?.biomass ?? 0;
    if (v > max) max = v;
  }
  return (
    <section className="rounded-2xl bg-[var(--color-surface-raised)]/85 px-4 py-3 ring-1 ring-white/5">
      <h3 className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
        Plot heatmap (biomass)
      </h3>
      <div className="mt-2 grid grid-cols-6 gap-1">
        {experiment.assignments.map((a) => {
          const v = byPlot.get(a.plotId)?.biomass ?? 0;
          const intensity = max > 0 ? v / max : 0;
          const bg = `rgba(34, 197, 94, ${0.15 + intensity * 0.75})`;
          return (
            <div
              key={a.plotId}
              title={`${a.plotId}\n${v.toFixed(1)} g`}
              style={{ background: bg }}
              className="rounded px-2 py-3 text-center text-[10px] font-mono text-[var(--color-text)]"
            >
              {a.plotId.split('.').slice(-2).join('.')}
              <br />
              {v.toFixed(0)}
            </div>
          );
        })}
      </div>
    </section>
  );
}
