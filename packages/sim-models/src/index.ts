// @via-farm-lab/sim-models — public API.
// Each model exported as a subpath for tree-shaking; the index re-exports
// only the most-used pieces so apps can `import { BiomassModel } from
// '@via-farm-lab/sim-models'` without thinking about layout.
export {
  BUTTER_LETTUCE_DEFAULT,
  BiomassModel,
  MultiFactorBiomassModel,
  biomassAt,
  type BiomassParams,
  type BiomassState,
  type MultiMetricState,
} from './biomass';
export { expectedEC, expectedPH, recipeForTarget } from './commissioning/mixing';
export { CommissioningModel, type RigSnapshot } from './commissioning/model';
export {
  COMMISSION_PARAMS,
  makeRig,
  type CommissionTarget,
  type Recipe,
  type RigState,
  type Signal,
  type Verdict,
} from './commissioning/state';
export {
  CROP_CATALOG,
  allCrops,
  getCrop,
  type CropId,
  type CropOptimalRanges,
  type CropParams,
  type OptimalRange,
} from './crops';
export {
  DEFAULT_DIURNAL,
  applyDiurnal,
  hourOfDay,
  lightIntensityFactor,
  type DiurnalConfig,
} from './diurnal';
export { ENV_DEFAULT, envActual, type EnvActual } from './environment';
export { modulator } from './modulators';
export { checkAndDose, type DosingResult } from './nutrient/dosing';
export { PoolModel } from './nutrient/pool-model';
export {
  DEFAULT_NUTRIENT_PARAMS,
  makePool,
  type DosingEvent,
  type DosingKind,
  type PoolState,
  type PoolTarget,
} from './nutrient/state';
export { uptakeRates, type UptakeRates } from './nutrient/uptake';
export {
  classifyAnomalies,
  targetBiomass,
  type AnomalyEvent,
  type AnomalyKind,
  type AnomalySeverity,
} from './thresholds';
