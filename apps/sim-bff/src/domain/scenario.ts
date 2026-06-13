// Scenario domain — a pre-baked experiment template that can be played
// with a single button click. The /scenarios/:id/play route materialises
// it into a real Experiment + Treatments + Plot Assignments and starts
// the simulator.
import type { CropId } from '@via-farm-lab/sim-models';

import type { Experiment, FactorName } from './experiment';

type ExperimentDesignType = Experiment['designType'];

/** Camera presets the 3D scene supports for demo playback. */
export type CameraPreset =
  | 'iso-pan' // panning the racks left → right
  | 'closeup-dosing' // closeup of dosing tanks → basin
  | 'top-rotate' // ortho top, slow rotation
  | 'iso-hvac'; // HVAC zone focus

/** Treatment-level recipe shown in the RecipeCard HUD. */
export interface RecipeSpec {
  readonly stockA_mlL: number; // ml/L of stock A
  readonly stockB_mlL: number; // ml/L of stock B
  readonly pHAcid_mlL: number; // ml/L of pH acid
  readonly targetEC: number;
  readonly targetPH: number;
  readonly PPFD: number;
  readonly photoperiodH: number;
  readonly T_air: number;
  readonly RH: number;
  readonly CO2: number;
}

/** How to apply crops to plots. */
export type CropAssignmentMode =
  /** Every plot uses the same cropId (uniformCropId). */
  | 'uniform'
  /** Each treatment is itself a cropId (1.3 Crop Comparison). */
  | 'byTreatmentFactor';

export interface ScenarioFactorSpec {
  readonly name: FactorName;
  readonly unit: string;
  readonly levels: readonly number[];
}

export interface ScenarioTemplate {
  readonly id: string;
  readonly name: string;
  readonly hypothesis: string;
  readonly description: string;
  readonly designType: ExperimentDesignType;
  readonly factors: readonly ScenarioFactorSpec[];
  readonly cropAssignment: CropAssignmentMode;
  /** Used when cropAssignment === 'uniform'. */
  readonly uniformCropId?: CropId;
  /** Used when cropAssignment === 'byTreatmentFactor' — one entry per treatment. */
  readonly treatmentCropIds?: readonly CropId[];
  readonly replicatesPerTreatment: number;
  readonly demo: {
    readonly durationSimDays: number;
    readonly simSpeedMultiplier: number;
    readonly cameraPreset: CameraPreset;
  };
}

/** PlayScenarioResult is returned by POST /scenarios/:id/play */
export interface PlayScenarioResult {
  readonly experimentId: string;
  readonly demo: ScenarioTemplate['demo'];
  readonly recipesByTreatment: Readonly<Record<string, RecipeSpec>>;
}
