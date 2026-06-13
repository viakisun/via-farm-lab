// Crop catalog — five leafy greens with per-species growth parameters and
// optimal environmental ranges. Used by the multi-factor growth model to
// modulate the intrinsic rate based on light / nutrient / environment state.
//
// Values are taken from CEA (controlled-environment agriculture) literature
// and the Reinfa product spec for AU pilot growing. Each crop carries:
//   - logistic params (K, r_max, B0)
//   - "optimal" ranges for each environmental factor + a soft tolerance band
//
// f_X(value) = 1 inside [min, max], decaying linearly to 0 over `tolerance`
// either side. The growth model multiplies all f_X factors (Liebig minimum
// in product form) so the slowest input bottlenecks growth.

export type CropId = 'butter-lettuce' | 'romaine-lettuce' | 'basil' | 'kale' | 'spinach';

export interface OptimalRange {
  /** Lower bound of the optimal plateau (modulator = 1). */
  readonly min: number;
  /** Upper bound of the optimal plateau. */
  readonly max: number;
  /** Soft band either side of the plateau over which the modulator decays to 0. */
  readonly tolerance: number;
}

export interface CropOptimalRanges {
  /** Photosynthetic photon flux density, µmol/m²/s. */
  readonly PPFD: OptimalRange;
  /** Daily light integral, mol/m²/day. */
  readonly DLI: OptimalRange;
  /** Nutrient electrical conductivity, mS/cm. */
  readonly EC: OptimalRange;
  /** Nutrient pH, unitless. */
  readonly pH: OptimalRange;
  /** Air temperature, °C. */
  readonly T: OptimalRange;
  /** Relative humidity, %. */
  readonly RH: OptimalRange;
  /** CO₂ concentration, ppm. */
  readonly CO2: OptimalRange;
}

export interface CropParams {
  readonly id: CropId;
  readonly latinName: string;
  readonly commonName: string;
  /** Typical days from transplant to harvest under near-ideal conditions. */
  readonly defaultGrowthDays: number;
  /** Asymptotic biomass at maturity (normalised to 100). */
  readonly K: number;
  /** Intrinsic growth rate per day under near-ideal conditions. */
  readonly r_max: number;
  /** Initial biomass at transplant. */
  readonly B0: number;
  readonly optimal: CropOptimalRanges;
}

export const CROP_CATALOG: Readonly<Record<CropId, CropParams>> = {
  'butter-lettuce': {
    id: 'butter-lettuce',
    latinName: 'Lactuca sativa var. capitata',
    commonName: 'Butter lettuce',
    defaultGrowthDays: 42,
    K: 100,
    r_max: 0.22,
    B0: 1,
    optimal: {
      PPFD: { min: 150, max: 250, tolerance: 100 },
      DLI: { min: 12, max: 17, tolerance: 6 },
      EC: { min: 1.2, max: 1.8, tolerance: 0.6 },
      pH: { min: 5.5, max: 6.5, tolerance: 0.8 },
      T: { min: 18, max: 22, tolerance: 6 },
      RH: { min: 60, max: 80, tolerance: 15 },
      CO2: { min: 400, max: 1200, tolerance: 400 },
    },
  },
  'romaine-lettuce': {
    id: 'romaine-lettuce',
    latinName: 'Lactuca sativa var. longifolia',
    commonName: 'Romaine lettuce',
    defaultGrowthDays: 55,
    K: 110,
    r_max: 0.18,
    B0: 1,
    optimal: {
      PPFD: { min: 180, max: 280, tolerance: 100 },
      DLI: { min: 13, max: 18, tolerance: 6 },
      EC: { min: 1.4, max: 2.0, tolerance: 0.6 },
      pH: { min: 5.5, max: 6.5, tolerance: 0.8 },
      T: { min: 16, max: 20, tolerance: 6 },
      RH: { min: 60, max: 75, tolerance: 15 },
      CO2: { min: 400, max: 1200, tolerance: 400 },
    },
  },
  basil: {
    id: 'basil',
    latinName: 'Ocimum basilicum',
    commonName: 'Basil',
    defaultGrowthDays: 65,
    K: 130,
    r_max: 0.16,
    B0: 1,
    optimal: {
      PPFD: { min: 300, max: 500, tolerance: 150 },
      DLI: { min: 17, max: 24, tolerance: 8 },
      EC: { min: 1.6, max: 2.2, tolerance: 0.6 },
      pH: { min: 5.5, max: 6.5, tolerance: 0.8 },
      T: { min: 22, max: 26, tolerance: 6 },
      RH: { min: 55, max: 75, tolerance: 15 },
      CO2: { min: 400, max: 1500, tolerance: 500 },
    },
  },
  kale: {
    id: 'kale',
    latinName: 'Brassica oleracea var. acephala',
    commonName: 'Kale',
    defaultGrowthDays: 60,
    K: 140,
    r_max: 0.17,
    B0: 1,
    optimal: {
      PPFD: { min: 200, max: 400, tolerance: 150 },
      DLI: { min: 15, max: 22, tolerance: 7 },
      EC: { min: 1.8, max: 2.5, tolerance: 0.7 },
      pH: { min: 6.0, max: 7.0, tolerance: 0.8 },
      T: { min: 15, max: 20, tolerance: 6 },
      RH: { min: 60, max: 80, tolerance: 15 },
      CO2: { min: 400, max: 1200, tolerance: 400 },
    },
  },
  spinach: {
    id: 'spinach',
    latinName: 'Spinacia oleracea',
    commonName: 'Spinach',
    defaultGrowthDays: 38,
    K: 90,
    r_max: 0.24,
    B0: 1,
    optimal: {
      PPFD: { min: 100, max: 200, tolerance: 80 },
      DLI: { min: 9, max: 14, tolerance: 5 },
      EC: { min: 1.6, max: 2.2, tolerance: 0.6 },
      pH: { min: 6.0, max: 7.0, tolerance: 0.8 },
      T: { min: 13, max: 18, tolerance: 5 },
      RH: { min: 50, max: 75, tolerance: 15 },
      CO2: { min: 400, max: 1200, tolerance: 400 },
    },
  },
};

export function getCrop(id: CropId): CropParams {
  return CROP_CATALOG[id];
}

export function allCrops(): readonly CropParams[] {
  return Object.values(CROP_CATALOG);
}
