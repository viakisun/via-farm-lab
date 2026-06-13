// Right-side collapsible sidebar with environment/biomass sparklines.
//
// Currently powered by client-side rolling history of multi-metric polls —
// per-treatment means computed in-memory. Server-side aggregation is a
// future BFF endpoint; this is enough for the demo.

import { useEffect, useMemo, useRef, useState, type JSX } from 'react';

import { useDemo } from '../research/DemoController';
import { SparklineSVG, type SparklinePoint } from '../research/charts';
import { useExperiment, useMultiMetricPoll } from '../research/useExperiments';
import { useSimStream } from '../sim/useSimStream';

const ROW_W = 260;
const ROW_H = 36;
const MAX_SAMPLES = 240; // ~12 min @ 3 s poll

interface PanelRow {
  readonly label: string;
  readonly unit: string;
  readonly points: readonly SparklinePoint[];
  readonly yMin: number;
  readonly yMax: number;
  readonly band?: { readonly min: number; readonly max: number };
  readonly latest: number;
  readonly stroke: string;
}

interface MetricSample {
  readonly t: number;
  readonly biomassMean: number;
  readonly colorMean: number;
  readonly heightMean: number;
  readonly poolECMean: number | null;
  readonly poolPHMean: number | null;
}

export function EnvTimeSeriesPanel(): JSX.Element | null {
  const demo = useDemo();
  const { metrics } = useMultiMetricPoll(4000);
  const { snapshot } = useSimStream();
  const { experiment } = useExperiment(demo.result?.experimentId ?? null);
  const [collapsed, setCollapsed] = useState(false);
  const historyRef = useRef<MetricSample[]>([]);

  useEffect(() => {
    if (demo.status === 'idle' || metrics.length === 0) return;
    const t = snapshot?.simTimeMs ?? Date.now();
    let biomassSum = 0;
    let colorSum = 0;
    let heightSum = 0;
    let ecSum = 0;
    let ecCount = 0;
    let phSum = 0;
    let phCount = 0;
    for (const m of metrics) {
      biomassSum += m.biomass;
      colorSum += m.colorHealth;
      heightSum += m.canopyHeightCm;
      if (m.poolEC !== undefined) {
        ecSum += m.poolEC;
        ecCount += 1;
      }
      if (m.poolPH !== undefined) {
        phSum += m.poolPH;
        phCount += 1;
      }
    }
    const n = metrics.length;
    historyRef.current = [
      ...historyRef.current,
      {
        t,
        biomassMean: biomassSum / n,
        colorMean: colorSum / n,
        heightMean: heightSum / n,
        poolECMean: ecCount > 0 ? ecSum / ecCount : null,
        poolPHMean: phCount > 0 ? phSum / phCount : null,
      },
    ].slice(-MAX_SAMPLES);
  }, [metrics, demo.status, snapshot?.simTimeMs]);

  // Reset history on stop.
  useEffect(() => {
    if (demo.status === 'idle') historyRef.current = [];
  }, [demo.status]);

  // Treatment-average target EC / pH for the dominant treatment band. Falls
  // back to neutral defaults if the experiment has no EC/pH factors.
  const { targetEC, targetPH } = useMemo(() => {
    let ec = 2.0;
    let ph = 6.0;
    if (experiment) {
      const ecFactor = experiment.factors.find((f) => f.name === 'EC');
      const phFactor = experiment.factors.find((f) => f.name === 'pH');
      if (ecFactor && ecFactor.levels.length > 0) {
        ec = ecFactor.levels.reduce((s, v) => s + v, 0) / ecFactor.levels.length;
      }
      if (phFactor && phFactor.levels.length > 0) {
        ph = phFactor.levels.reduce((s, v) => s + v, 0) / phFactor.levels.length;
      }
    }
    return { targetEC: ec, targetPH: ph };
  }, [experiment]);

  const rows: PanelRow[] = useMemo(() => {
    const hist = historyRef.current;
    const biomassPoints = hist.map((s) => ({ x: s.t, y: s.biomassMean }));
    const colorPoints = hist.map((s) => ({ x: s.t, y: s.colorMean }));
    const heightPoints = hist.map((s) => ({ x: s.t, y: s.heightMean }));
    const ecPoints: SparklinePoint[] = [];
    const phPoints: SparklinePoint[] = [];
    for (const s of hist) {
      if (s.poolECMean !== null) ecPoints.push({ x: s.t, y: s.poolECMean });
      if (s.poolPHMean !== null) phPoints.push({ x: s.t, y: s.poolPHMean });
    }
    const last = hist[hist.length - 1];
    return [
      {
        label: 'Biomass',
        unit: 'g',
        points: biomassPoints,
        yMin: 0,
        yMax: 100,
        band: { min: 30, max: 90 },
        latest: last?.biomassMean ?? 0,
        stroke: 'var(--color-success-500)',
      },
      {
        label: 'Canopy height',
        unit: 'cm',
        points: heightPoints,
        yMin: 0,
        yMax: 18,
        latest: last?.heightMean ?? 0,
        stroke: '#7dd3fc',
      },
      {
        label: 'Colour health',
        unit: '0–1',
        points: colorPoints,
        yMin: 0,
        yMax: 1,
        band: { min: 0.75, max: 1 },
        latest: last?.colorMean ?? 0,
        stroke: '#fde68a',
      },
      {
        label: 'Pool EC',
        unit: 'mS/cm',
        points: ecPoints,
        yMin: 0.5,
        yMax: 3.0,
        band: { min: targetEC - 0.15, max: targetEC + 0.15 },
        latest: last?.poolECMean ?? targetEC,
        stroke: '#22d3ee',
      },
      {
        label: 'Pool pH',
        unit: '',
        points: phPoints,
        yMin: 4.5,
        yMax: 7.5,
        band: { min: targetPH - 0.3, max: targetPH + 0.3 },
        latest: last?.poolPHMean ?? targetPH,
        stroke: '#a78bfa',
      },
    ];
  }, [metrics, targetEC, targetPH]);

  if (demo.status === 'idle' || !demo.scenario) return null;

  return (
    <aside
      className={
        'pointer-events-auto absolute right-6 top-28 z-30 rounded-2xl bg-[var(--color-surface-raised)]/90 ring-1 ring-white/10 shadow-2xl backdrop-blur-md transition-all ' +
        (collapsed ? 'w-[80px]' : 'w-[320px]')
      }
      aria-label="Environment time series"
    >
      <header className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          {collapsed ? 'Env' : 'Env time series'}
        </span>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="rounded bg-white/5 px-2 py-0.5 text-xs text-[var(--color-text-muted)] ring-1 ring-white/10 hover:text-[var(--color-text)]"
          aria-label={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '◀' : '▶'}
        </button>
      </header>

      {!collapsed && (
        <div className="space-y-3 px-3 py-3">
          {rows.map((r) => (
            <div key={r.label}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                  {r.label}
                </span>
                <span className="font-mono text-[11px] text-[var(--color-text)]">
                  {r.latest.toFixed(
                    r.label === 'Colour health' || r.label === 'Pool EC' || r.label === 'Pool pH'
                      ? 2
                      : 1,
                  )}{' '}
                  <span className="text-[var(--color-text-muted)]">{r.unit}</span>
                </span>
              </div>
              <SparklineSVG
                points={r.points}
                width={ROW_W}
                height={ROW_H}
                yMin={r.yMin}
                yMax={r.yMax}
                stroke={r.stroke}
                {...(r.band ? { band: r.band } : {})}
              />
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
