// Environmental modulators — convert a measured value + the crop's optimal
// range into a 0..1 growth-rate multiplier. Used by the multi-factor
// biomass model as a Liebig (multiplicative) product:
//
//     r_effective = r_max × f_L × f_N × f_T × f_CO2 × ...
//
// Each f_X is 1 inside the crop's optimal plateau and decays linearly to 0
// over the configured tolerance band on either side. Outside the plateau +
// tolerance, the modulator clamps at 0 (the factor "blocks" growth).
//
// This is a deliberately simple shape — sufficient to surface treatment
// effects in experiment dashboards without overfitting to a single
// reference dataset. Each modulator can be swapped for a richer model
// (Mitscherlich saturation, Gaussian decay, etc.) without touching the
// caller.

import type { OptimalRange } from './crops';

/**
 * Trapezoidal modulator:
 *   plateau (= 1) inside [min, max]
 *   linear decay to 0 over `tolerance` on either side
 *   clamped at 0 beyond
 */
export function modulator(value: number, range: OptimalRange): number {
  const { min, max, tolerance } = range;
  if (value >= min && value <= max) return 1;
  if (value < min) {
    if (value <= min - tolerance) return 0;
    return (value - (min - tolerance)) / tolerance;
  }
  // value > max
  if (value >= max + tolerance) return 0;
  return (max + tolerance - value) / tolerance;
}
