// Diurnal cycle helpers — converts a treatment "setpoint" EnvActual into a
// time-varying "actual" by applying a sinusoidal day/night curve.
//
// We use sin²(π × t) over the light window. This gives a smooth ramp:
//   t=0   (dawn)    → 0
//   t=0.5 (noon)    → 1
//   t=1   (dusk)    → 0
// and zero outside the light window. T and CO₂ share the same factor for
// visual simplicity (in reality they trail PPFD by ~2h).

import { type EnvActual, envActual } from './environment';

export interface DiurnalConfig {
  readonly lightOnHour: number;
  readonly photoperiodH: number;
  /** Day-night T_air swing (±°C). */
  readonly tSwing: number;
  /** Day-night CO₂ swing (±ppm). */
  readonly co2Swing: number;
}

export const DEFAULT_DIURNAL: DiurnalConfig = {
  lightOnHour: 6,
  photoperiodH: 16,
  tSwing: 1.5,
  co2Swing: 200,
};

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

export function hourOfDay(simTimeMs: number): number {
  return (((simTimeMs % DAY_MS) + DAY_MS) % DAY_MS) / HOUR_MS;
}

/** Sin²(π × t) curve within the light window, 0 outside. 0..1. */
export function lightIntensityFactor(simTimeMs: number, cfg: Partial<DiurnalConfig> = {}): number {
  const lightOnHour = cfg.lightOnHour ?? DEFAULT_DIURNAL.lightOnHour;
  const photoperiodH = cfg.photoperiodH ?? DEFAULT_DIURNAL.photoperiodH;
  const h = hourOfDay(simTimeMs);
  if (h < lightOnHour || h >= lightOnHour + photoperiodH) return 0;
  const t = (h - lightOnHour) / photoperiodH;
  return Math.sin(Math.PI * t) ** 2;
}

/**
 * Apply diurnal modulation to a treatment setpoint. PPFD scales with
 * lightFactor; T and CO₂ swing around the setpoint by ±tSwing / ±co2Swing.
 */
export function applyDiurnal(
  base: EnvActual,
  simTimeMs: number,
  cfg: Partial<DiurnalConfig> = {},
): EnvActual {
  const tSwing = cfg.tSwing ?? DEFAULT_DIURNAL.tSwing;
  const co2Swing = cfg.co2Swing ?? DEFAULT_DIURNAL.co2Swing;
  const lf = lightIntensityFactor(simTimeMs, cfg);

  // T_air: dips at night (-tSwing) and peaks at noon (+tSwing)
  // CO₂: drops during photosynthesis (-co2Swing × lf), rises at night
  return envActual({
    PPFD: base.PPFD * lf,
    photoperiodH: cfg.photoperiodH ?? base.photoperiodH,
    EC: base.EC,
    pH: base.pH,
    recipeRatio: base.recipeRatio,
    T_air: base.T_air + (lf * 2 - 1) * tSwing,
    RH: base.RH,
    CO2: base.CO2 - lf * co2Swing + (1 - lf) * (co2Swing * 0.5),
    airflow: base.airflow,
  });
}
