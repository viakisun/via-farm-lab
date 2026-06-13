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
// `BiomassModel` is the original time-only tracker (Phase-1 demo + tests).
// `MultiFactorBiomassModel` (see end of file) layers crop-specific params +
// environmental modulators on top for the experimental research platform.

import { type CropId, type CropParams, getCrop } from './crops';
import { ENV_DEFAULT, type EnvActual } from './environment';
import { modulator } from './modulators';

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

// ──────────────────────────────────────────────────────────────────────────
// Multi-factor biomass — env modulators + multi-metric snapshot
// ──────────────────────────────────────────────────────────────────────────

/** Snapshot returned by the multi-factor model — extends the time-only
 *  state with environment-derived metrics suitable for analysis. */
export interface MultiMetricState {
  /** Days since transplant (t). */
  readonly ageDays: number;
  /** Current biomass (0..K). */
  readonly biomass: number;
  /** Canopy height proxy, cm. Allometric: ~14 cm at K. */
  readonly canopyHeightCm: number;
  /** Leaf area proxy, cm². Linear in biomass: ~600 cm² at K. */
  readonly leafAreaCm2: number;
  /** Leaf count proxy, integer. Slower than biomass: ~24 at K. */
  readonly leafCount: number;
  /** Colour-health proxy 0..1 (N status). 1 = vivid green, 0 = chlorotic. */
  readonly colorHealth: number;
  /** Effective growth rate at this snapshot, per day (post-modulation). */
  readonly effectiveR: number;
}

/**
 * Per-plot state for the multi-factor model. Each plot carries its crop
 * id, transplant time, the latest env actuals, and an accumulated biomass
 * (we integrate forward because env varies — closed form no longer holds).
 */
interface PlotState {
  readonly cropId: CropId;
  readonly sowedAtMs: number;
  /** Biomass accumulated up to lastAdvanceMs. */
  biomass: number;
  /** Simulation time of the last advance. */
  lastAdvanceMs: number;
  /** Most recent env actuals (set by treatment / sim each tick). */
  env: EnvActual;
  /** Deterministic noise sample applied per-plot (Gaussian-ish, seed-based). */
  noiseFactor: number;
}

/**
 * Deterministic Gaussian-ish sample in [0.85, 1.15] from a string seed.
 * Same seed → same factor across runs (essential for reproducible experiments).
 */
function noiseFromSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Take two 8-bit slices, average them — central-limit-ish.
  const a = ((h >>> 0) & 0xff) / 255;
  const b = ((h >>> 8) & 0xff) / 255;
  // Map mean-0.5 to ±0.15 swing centred on 1.0.
  return 1 + ((a + b) / 2 - 0.5) * 0.3;
}

/** Multiply all factor modulators against the crop's optimal ranges. */
function effectiveRateFactor(crop: CropParams, env: EnvActual): number {
  const o = crop.optimal;
  // Light: use DLI primarily; PPFD floor guards against zero light.
  const fL = modulator(env.DLI, o.DLI) * (env.PPFD > 1 ? 1 : 0);
  const fEC = modulator(env.EC, o.EC);
  const fpH = modulator(env.pH, o.pH);
  const fT = modulator(env.T_air, o.T);
  const fRH = modulator(env.RH, o.RH);
  const fCO2 = modulator(env.CO2, o.CO2);
  return fL * fEC * fpH * fT * fRH * fCO2;
}

export class MultiFactorBiomassModel {
  private readonly plots = new Map<string, PlotState>();

  /** Mark plot as transplanted with its crop + initial env. */
  transplant(
    plotId: string,
    cropId: CropId,
    sowedAtMs: number,
    env: EnvActual = ENV_DEFAULT,
  ): void {
    const crop = getCrop(cropId);
    this.plots.set(plotId, {
      cropId,
      sowedAtMs,
      biomass: crop.B0,
      lastAdvanceMs: sowedAtMs,
      env,
      noiseFactor: noiseFromSeed(plotId),
    });
  }

  harvest(plotId: string): void {
    this.plots.delete(plotId);
  }

  hasPlot(plotId: string): boolean {
    return this.plots.has(plotId);
  }

  /** Update a plot's environmental actuals (called per tick by the simulator). */
  setEnv(plotId: string, env: EnvActual): void {
    const state = this.plots.get(plotId);
    if (state) state.env = env;
  }

  /** Advance biomass to `nowMs` using Euler stepping under current env. */
  advance(plotId: string, nowMs: number): void {
    const state = this.plots.get(plotId);
    if (!state) return;
    if (nowMs <= state.lastAdvanceMs) return;
    const crop = getCrop(state.cropId);
    const dtDays = (nowMs - state.lastAdvanceMs) / 86_400_000;
    const factor = effectiveRateFactor(crop, state.env) * state.noiseFactor;
    const rEff = crop.r_max * factor;
    // Logistic increment under current rate (Euler step OK with sub-day dt).
    const dB = rEff * state.biomass * (1 - state.biomass / crop.K) * dtDays;
    state.biomass = Math.max(crop.B0, Math.min(crop.K, state.biomass + dB));
    state.lastAdvanceMs = nowMs;
  }

  /** Advance every tracked plot to `nowMs`. */
  advanceAll(nowMs: number): void {
    for (const plotId of this.plots.keys()) this.advance(plotId, nowMs);
  }

  /** Snapshot multi-metric state for a single plot at `nowMs`. */
  snapshot(plotId: string, nowMs: number): MultiMetricState | null {
    const state = this.plots.get(plotId);
    if (!state) return null;
    this.advance(plotId, nowMs);
    const crop = getCrop(state.cropId);
    const ageDays = Math.max(0, (nowMs - state.sowedAtMs) / 86_400_000);
    const f = state.biomass / crop.K; // 0..1 maturity
    const factor = effectiveRateFactor(crop, state.env) * state.noiseFactor;
    return {
      ageDays,
      biomass: state.biomass,
      canopyHeightCm: 14 * Math.cbrt(f),
      leafAreaCm2: 600 * f,
      leafCount: Math.round(24 * f),
      // Colour decays when EC, pH or light are far outside optimal.
      colorHealth: Math.max(
        0,
        Math.min(1, 0.6 + 0.4 * modulator(state.env.EC, crop.optimal.EC) - 0.2 * (1 - factor)),
      ),
      effectiveR: crop.r_max * factor,
    };
  }

  snapshotAll(nowMs: number): Map<string, MultiMetricState> {
    const out = new Map<string, MultiMetricState>();
    for (const plotId of this.plots.keys()) {
      const s = this.snapshot(plotId, nowMs);
      if (s) out.set(plotId, s);
    }
    return out;
  }

  plotIds(): readonly string[] {
    return [...this.plots.keys()];
  }

  cropOf(plotId: string): CropId | undefined {
    return this.plots.get(plotId)?.cropId;
  }

  reset(): void {
    this.plots.clear();
  }
}
