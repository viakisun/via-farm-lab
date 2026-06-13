// Process-wide MultiFactorBiomassModel — the Phase-2 experimental simulator.
//
// Unlike the demo BiomassModel (env-agnostic, staggered transplants for
// visual demo), this model is driven by experiment Treatments. It only
// receives plots whose owning experiment is in `running` state, and each
// tick the simulator advances biomass under the current env actuals.
import { ENV_DEFAULT, MultiFactorBiomassModel } from '@via-farm-lab/sim-models';

let instance: MultiFactorBiomassModel | null = null;

export function getMultiFactorModel(): MultiFactorBiomassModel {
  instance ??= new MultiFactorBiomassModel();
  return instance;
}

export function resetMultiFactorModelForTests(): void {
  instance?.reset();
  instance = null;
}

export { ENV_DEFAULT };
