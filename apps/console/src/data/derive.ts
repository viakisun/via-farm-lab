// Palette constants + derived aggregates + formatters shared across modules.
import type { Dataset, Device, Experiment, MeasurementKind } from './dataset';

/** Greenhouse palette (mirrors theme.css; exposed for inline styles). */
export const C = {
  bg: '#0A130E',
  sidebar: '#0E1A14',
  card: '#13211A',
  raised: '#182C22',
  inset: 'rgba(8,16,12,0.45)',
  lime: '#A6E26B',
  sky: '#6FB7E8',
  amber: '#E9C45C',
  coral: '#E8836B',
  ink: '#ECF3ED',
  ink2: '#C7D6CC',
  muted: '#9DB3A4',
  muted2: '#7C9387',
  faint: '#5E7468',
  faint2: '#3E4E45',
  line: 'rgba(255,255,255,0.06)',
  line2: 'rgba(255,255,255,0.04)',
} as const;

export const FONT_UI = "'Hanken Grotesk', system-ui, sans-serif";
export const FONT_MONO = "'Space Mono', monospace";

// Monetary formatting. The dataset carries won-scale integers from the design;
// for en-AU we present A$ at 1/1000 of that scale, which lands every figure in a
// realistic Australian wholesale-lettuce range while preserving all proportions.
export const audRate = (won: number): string => 'A$' + (won / 1000).toFixed(2);
export const audAmt = (won: number): string =>
  'A$' + Math.round(won / 1000).toLocaleString('en-AU');
export const audK = (won: number): string => 'A$' + (won / 1e6).toFixed(1) + 'k';

export interface ChipStyle {
  readonly bg: string;
  readonly border: string;
  readonly color: string;
}

export type ChipKind = 'measured' | 'manual' | 'estimated' | 'pending' | 'outlier' | 'invalid';

/** Data-honesty status chips: how a value was obtained / its validity. */
export const CHIP = {
  measured: {
    bg: 'rgba(166,226,107,0.10)',
    border: '1px solid rgba(166,226,107,0.3)',
    color: C.lime,
  },
  manual: { bg: 'rgba(111,183,232,0.12)', border: '1px solid rgba(111,183,232,0.3)', color: C.sky },
  estimated: { bg: 'transparent', border: '1px dashed rgba(233,196,92,0.55)', color: C.amber },
  pending: { bg: 'transparent', border: '1px dashed rgba(94,116,104,0.6)', color: C.muted2 },
  outlier: {
    bg: 'rgba(233,196,92,0.12)',
    border: '1px solid rgba(233,196,92,0.35)',
    color: C.amber,
  },
  invalid: {
    bg: 'rgba(232,131,107,0.12)',
    border: '1px solid rgba(232,131,107,0.35)',
    color: C.coral,
  },
} satisfies Record<ChipKind, ChipStyle>;

export const SYS_COLOR = {
  Light: ['rgba(233,196,92,0.14)', C.amber],
  Nutrient: ['rgba(111,183,232,0.14)', C.sky],
  Climate: ['rgba(166,226,107,0.12)', C.lime],
  Safety: ['rgba(232,131,107,0.14)', C.coral],
  Energy: ['rgba(233,196,92,0.14)', C.amber],
  Flow: ['rgba(94,116,104,0.2)', C.muted],
} satisfies Record<Device['sys'], readonly [string, string]>;

export const PERIODS = [12, 16, 20, 24] as const;

export interface PeriodAgg {
  readonly p: number;
  readonly count: number;
  readonly ppbd: number;
  readonly fw: number;
  readonly tip: number;
  readonly cpk: number;
}

export interface Portfolio {
  readonly doneExps: Experiment[];
  readonly avgPpbd: number;
  readonly totalProfit: number;
  readonly avgCostKg: number;
  readonly recExp: Experiment;
  readonly byPeriod: PeriodAgg[];
  readonly maxBarPpbd: number;
}

export function portfolio(data: Dataset): Portfolio {
  const doneExps = data.exps.filter((e) => e.done);
  const avg = (xs: number[]): number => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  const avgPpbd = avg(doneExps.map((e) => e.ppbd));
  const totalProfit = doneExps.reduce((a, b) => a + b.profit, 0);
  const avgCostKg = avg(doneExps.map((e) => e.costKg));
  const recExp = data.exps.find((e) => e.id === data.recId);
  if (!recExp) throw new Error('portfolio: recommended experiment missing');
  const byPeriod = PERIODS.map((p) => {
    const g = doneExps.filter((e) => e.p === p);
    return {
      p,
      count: g.length,
      ppbd: avg(g.map((e) => e.ppbd)),
      fw: avg(g.map((e) => e.fw)),
      tip: avg(g.map((e) => e.tipburn)),
      cpk: avg(g.map((e) => e.costKg)),
    };
  });
  const maxBarPpbd = Math.max(...byPeriod.map((b) => b.ppbd));
  return { doneExps, avgPpbd, totalProfit, avgCostKg, recExp, byPeriod, maxBarPpbd };
}

// ── Experiment Builder DLI maths ────────────────────────────────────────────
export const DLI_TOL = 0.3;
export const dliOf = (ppfd: number, photoperiod: number): number =>
  (ppfd * photoperiod * 3600) / 1e6;
/** PPFD that hits the target DLI for a photoperiod, rounded to the nearest 5. */
export const equalisedPpfd = (target: number, photoperiod: number): number =>
  Math.round((target * 1e6) / (photoperiod * 3600) / 5) * 5;
/** Required PPFD (unrounded-to-5, integer) for the calculator readout. */
export const requiredPpfd = (target: number, photoperiod: number): number =>
  Math.round((target * 1e6) / (photoperiod * 3600));

export const measKindColor = (kind: MeasurementKind): string =>
  kind === 'invalid' ? C.coral : kind === 'outlier' ? C.amber : C.ink;
