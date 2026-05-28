// Plant biomass — logistic growth model.
//
// The simplest defensible per-plot growth curve:
//
//     dB/dt = r · B · (1 − B / K)
//
//   B = biomass (arbitrary units; 0…100 normalised so the digital twin can
//                map cleanly to canopy area, height, mass downstream).
//   K = carrying capacity (asymptotic biomass at maturity).
//   r = intrinsic growth rate per day under ideal conditions.
//
// The closed-form solution is used (not Euler) so we get exact answers
// regardless of tick size and can step over big seek() jumps cleanly:
//
//     B(t) = K / (1 + ((K − B0) / B0) · exp(−r · (t − t0)))
//
// Defaults are tuned so Butter Lettuce reaches ~99% K in ~42 days (the
// typical AU CEA cycle). LOCALISATION.md §4 keeps the cultivar list to
// Butter Lettuce in Phase 1; other crops slot in by adding more params.
//
// This model is environment-agnostic in PR 23. Environmental modulators
// (DLI, EC, T) get layered on in PR 26 (per PLAN.md Phase 1C-β).

export interface BiomassParams {
  /** Maximum biomass (arbitrary units). */
  readonly K: number;
  /** Intrinsic growth rate, per day. */
  readonly r: number;
  /** Initial biomass at transplant. */
  readonly B0: number;
}

/** Defaults — Butter Lettuce week 0 → ~99% K at day ~42. */
export const BUTTER_LETTUCE_DEFAULT: BiomassParams = {
  K: 100,
  r: 0.22, // ≈ 99% K @ 42 d when B0 = 1
  B0: 1,
};

export interface BiomassState {
  /** Current biomass (B). */
  readonly biomass: number;
  /** Days since transplant (t). */
  readonly ageDays: number;
}

/**
 * Closed-form biomass at a given age (days since transplant).
 * Numerically stable across the full domain.
 */
export function biomassAt(params: BiomassParams, ageDays: number): number {
  const { K, r, B0 } = params;
  if (ageDays <= 0) return B0;
  if (B0 <= 0) return 0;
  // Logistic closed form.
  const ratio = (K - B0) / B0;
  return K / (1 + ratio * Math.exp(-r * ageDays));
}

/**
 * Per-plot biomass tracker. Holds plant-by-plot state, advanced by `tick`.
 * Same seed of params + same simulated time → identical biomass.
 */
export class BiomassModel {
  private readonly transplants = new Map<string, number>(); // plotId → t0 (sim ms)
  private readonly paramsByPlot = new Map<string, BiomassParams>();
  private readonly defaultParams: BiomassParams;

  constructor(defaultParams: BiomassParams = BUTTER_LETTUCE_DEFAULT) {
    this.defaultParams = defaultParams;
  }

  /** Mark plot as transplanted at a given simulated time. */
  transplant(plotId: string, sowedAtMs: number, params?: BiomassParams): void {
    this.transplants.set(plotId, sowedAtMs);
    if (params) {
      this.paramsByPlot.set(plotId, params);
    }
  }

  /** Remove a plot (e.g. harvest). */
  harvest(plotId: string): void {
    this.transplants.delete(plotId);
    this.paramsByPlot.delete(plotId);
  }

  /** Whether a plot has been transplanted. */
  hasPlot(plotId: string): boolean {
    return this.transplants.has(plotId);
  }

  /** All currently tracked plot ids. */
  plots(): readonly string[] {
    return [...this.transplants.keys()];
  }

  /**
   * Snapshot biomass for one plot at simulated time `nowMs`.
   * Returns null if the plot hasn't been transplanted.
   */
  snapshot(plotId: string, nowMs: number): BiomassState | null {
    const t0 = this.transplants.get(plotId);
    if (t0 === undefined) return null;
    const params = this.paramsByPlot.get(plotId) ?? this.defaultParams;
    const ageDays = Math.max(0, (nowMs - t0) / 86_400_000);
    return {
      biomass: biomassAt(params, ageDays),
      ageDays,
    };
  }

  /** Snapshot all plots at the given simulated time. */
  snapshotAll(nowMs: number): Map<string, BiomassState> {
    const out = new Map<string, BiomassState>();
    for (const plotId of this.transplants.keys()) {
      const s = this.snapshot(plotId, nowMs);
      if (s) out.set(plotId, s);
    }
    return out;
  }

  /** Test helper — clear all state. */
  reset(): void {
    this.transplants.clear();
    this.paramsByPlot.clear();
  }
}
