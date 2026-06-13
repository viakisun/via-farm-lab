// Uptake kinetics — how fast a plant of a given biomass pulls EC out of
// the pool and drifts its pH. Strictly first-order in biomass and light;
// crop-specific coefficients live in DEFAULT_NUTRIENT_PARAMS for now.

import { DEFAULT_NUTRIENT_PARAMS } from './state';

export interface UptakeRates {
  /** EC drawdown rate, mS/cm per second. Always ≥ 0. */
  readonly ec_drop_per_s: number;
  /** pH drift rate, pH units per second. Positive = pH rising. */
  readonly ph_drift_per_s: number;
}

/**
 * Compute instantaneous uptake rates for a plot.
 *
 * Plant size + light scale the consumption linearly. The `EC/targetEC`
 * ratio gives a mild self-limiting effect — when the pool is depleted,
 * uptake slows so EC doesn't run away to negative.
 */
export function uptakeRates(
  biomass_g: number,
  lightFactor: number,
  currentEC: number,
  targetEC: number,
): UptakeRates {
  if (biomass_g <= 0 || lightFactor <= 0 || currentEC <= 0) {
    return { ec_drop_per_s: 0, ph_drift_per_s: 0 };
  }
  const ratio = Math.max(0, currentEC / Math.max(0.01, targetEC));
  const ecRate = DEFAULT_NUTRIENT_PARAMS.kUptakeEC * biomass_g * lightFactor * ratio;
  const phRate = DEFAULT_NUTRIENT_PARAMS.kDriftPH * biomass_g * lightFactor;
  return { ec_drop_per_s: ecRate, ph_drift_per_s: phRate };
}
