// Phase F — statistical helpers for treatment comparison.
//
// Closed-form / approximate methods only; no external numerical libs.
// Designed for the small sample sizes typical of CEA experiments (n = 3-12
// replicates per treatment).
//
//   - mean, std (sample, n-1), seMean
//   - 95% confidence interval (normal approx)
//   - Cohen's d (effect size)
//   - 1-way ANOVA F-statistic (no p-value — UI shows raw F + df)
//   - Tukey HSD critical difference (q approx q=3.5 at α=0.05, k=3-6)
//   - Welch's t-statistic (Bayesian posterior surrogate)

export interface GroupSummary {
  readonly label: string;
  readonly n: number;
  readonly mean: number;
  readonly std: number;
  readonly se: number;
  readonly ci95: readonly [number, number];
}

export function summarise(label: string, values: readonly number[]): GroupSummary {
  const n = values.length;
  const mean = n > 0 ? values.reduce((a, b) => a + b, 0) / n : 0;
  const variance = n > 1 ? values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  const std = Math.sqrt(variance);
  const se = n > 0 ? std / Math.sqrt(n) : 0;
  const half = 1.96 * se;
  return { label, n, mean, std, se, ci95: [mean - half, mean + half] };
}

/** Cohen's d for two independent groups (pooled SD). */
export function cohensD(a: readonly number[], b: readonly number[]): number {
  const sa = summarise('a', a);
  const sb = summarise('b', b);
  if (sa.n < 2 || sb.n < 2) return 0;
  const pooled = Math.sqrt(
    ((sa.n - 1) * sa.std ** 2 + (sb.n - 1) * sb.std ** 2) / (sa.n + sb.n - 2),
  );
  return pooled > 0 ? (sa.mean - sb.mean) / pooled : 0;
}

export interface AnovaResult {
  readonly F: number;
  readonly dfBetween: number;
  readonly dfWithin: number;
  readonly grandMean: number;
  readonly ssBetween: number;
  readonly ssWithin: number;
}

/** 1-way ANOVA F-statistic (no p-value computation). */
export function anova(groups: readonly (readonly number[])[]): AnovaResult {
  const valid = groups.filter((g) => g.length > 0);
  const k = valid.length;
  const total: number[] = [];
  for (const g of valid) total.push(...g);
  const N = total.length;
  if (k < 2 || N < k + 1) {
    return { F: 0, dfBetween: 0, dfWithin: 0, grandMean: 0, ssBetween: 0, ssWithin: 0 };
  }
  const grandMean = total.reduce((a, b) => a + b, 0) / N;
  let ssBetween = 0;
  let ssWithin = 0;
  for (const g of valid) {
    const mean = g.reduce((a, b) => a + b, 0) / g.length;
    ssBetween += g.length * (mean - grandMean) ** 2;
    for (const v of g) ssWithin += (v - mean) ** 2;
  }
  const dfBetween = k - 1;
  const dfWithin = N - k;
  const msB = ssBetween / dfBetween;
  const msW = dfWithin > 0 ? ssWithin / dfWithin : 0;
  const F = msW > 0 ? msB / msW : 0;
  return { F, dfBetween, dfWithin, grandMean, ssBetween, ssWithin };
}

/**
 * Tukey HSD critical difference at α=0.05. Uses q≈3.5 — a rough lookup
 * suitable for k∈[3,6] and df∈[10,40] which covers our 3-6 treatments ×
 * 3-6 replicates regime.
 */
export function tukeyHSD(groups: readonly (readonly number[])[], q = 3.5): number {
  const a = anova(groups);
  if (a.dfWithin <= 0) return 0;
  const msW = a.ssWithin / a.dfWithin;
  // Use harmonic mean n for unbalanced designs.
  const n = groups.length;
  const reciprocal = groups.reduce((s, g) => s + (g.length > 0 ? 1 / g.length : 0), 0);
  const harmonicN = reciprocal > 0 ? n / reciprocal : 0;
  return harmonicN > 0 ? q * Math.sqrt(msW / harmonicN) : 0;
}

/** Welch's t-statistic between two groups (Bayesian posterior surrogate). */
export function welchT(a: readonly number[], b: readonly number[]): number {
  const sa = summarise('a', a);
  const sb = summarise('b', b);
  if (sa.n < 2 || sb.n < 2) return 0;
  const denom = Math.sqrt(sa.std ** 2 / sa.n + sb.std ** 2 / sb.n);
  return denom > 0 ? (sa.mean - sb.mean) / denom : 0;
}
