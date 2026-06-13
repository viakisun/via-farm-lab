// Per-plot environmental state — the inputs that drive the multi-factor
// growth model. A plot's `EnvActual` is the snapshot of all light, nutrient
// and air variables at the moment growth is being computed.
//
// In Phase 1 these are set directly by experiment Treatments (treatments
// dictate setpoints; the simulator copies setpoints → actuals each tick).
// Phase 2+ will introduce dynamics (slow drift, equipment latency, control
// loops) between setpoint and actual.

export interface EnvActual {
  /** Photosynthetic photon flux density now, µmol/m²/s (LED on). */
  readonly PPFD: number;
  /** Photoperiod, hours of light per 24 h day. */
  readonly photoperiodH: number;
  /** Daily light integral, mol/m²/day. Derived from PPFD × photoperiod × 3600 × 1e-6. */
  readonly DLI: number;
  /** Nutrient electrical conductivity, mS/cm. */
  readonly EC: number;
  /** Nutrient pH, unitless. */
  readonly pH: number;
  /** Recipe macro:micro ratio (placeholder 0..1; 0.5 = balanced). */
  readonly recipeRatio: number;
  /** Air temperature, °C. */
  readonly T_air: number;
  /** Relative humidity, %. */
  readonly RH: number;
  /** CO₂ concentration, ppm. */
  readonly CO2: number;
  /** Airflow above canopy, m/s. */
  readonly airflow: number;
}

/** Convenience constructor — fills DLI from PPFD × photoperiod. */
export function envActual(partial: Omit<EnvActual, 'DLI'> & { readonly DLI?: number }): EnvActual {
  const DLI = partial.DLI ?? (partial.PPFD * partial.photoperiodH * 3600) / 1_000_000;
  return {
    PPFD: partial.PPFD,
    photoperiodH: partial.photoperiodH,
    DLI,
    EC: partial.EC,
    pH: partial.pH,
    recipeRatio: partial.recipeRatio,
    T_air: partial.T_air,
    RH: partial.RH,
    CO2: partial.CO2,
    airflow: partial.airflow,
  };
}

/** Sensible "near-ideal lettuce" defaults. Used when a plot is unassigned. */
export const ENV_DEFAULT: EnvActual = envActual({
  PPFD: 200,
  photoperiodH: 16,
  EC: 1.5,
  pH: 6.0,
  recipeRatio: 0.5,
  T_air: 20,
  RH: 70,
  CO2: 800,
  airflow: 0.3,
});
