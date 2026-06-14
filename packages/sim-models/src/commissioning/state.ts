// Commissioning rig state — models a single nutrient reservoir being
// *commissioned*: a commanded recipe is mixed, delivered, and the actual
// EC/pH ramps toward the target with a transport/mix time constant. Distinct
// from the steady-state PoolModel (which snaps to setpoint); here the whole
// point is to watch the commanded value become real and verify it.

export interface CommissionTarget {
  /** Target electrical conductivity (mS/cm). */
  readonly EC: number;
  /** Target pH. */
  readonly pH: number;
  /** Stock A : Stock B blend ratio (A/B). 1 = equal parts. */
  readonly abRatio: number;
}

export interface Recipe {
  readonly stockA_mL: number;
  readonly stockB_mL: number;
  readonly pHAcid_mL: number;
}

export interface RigState {
  readonly id: string;
  readonly label: string;
  volumeL: number;
  /** Actual measured pool EC (mS/cm). */
  EC: number;
  /** Actual measured pool pH. */
  pH: number;
  /** Commanded target, or null before any command. */
  target: CommissionTarget | null;
  /** EC/pH the commanded recipe is expected to produce (≈ target). */
  expectedEC: number | null;
  expectedPH: number | null;
  /** The mixed recipe for the active command. */
  recipe: Recipe | null;
  /** Live delivery-pump flow (L/min) and power draw (W). */
  flowLmin: number;
  powerW: number;
  /** Sim-time of the most recent command, or null if never commissioned. */
  lastCommandMs: number | null;
  /** Sim-time since which actual has stayed within tolerance, or null. */
  settledSinceMs: number | null;
}

export type Signal = 'Pending' | 'Estimated' | 'Measured';

export interface Verdict {
  readonly metric: 'EC' | 'pH' | 'flow' | 'power';
  readonly target: number;
  readonly actual: number;
  readonly variance: number;
  readonly tolerance: number;
  readonly withinTol: boolean;
  readonly settled: boolean;
  readonly signal: Signal;
}

export const COMMISSION_PARAMS = {
  /** EC acceptance tolerance (mS/cm). */
  ecTol: 0.1,
  /** pH acceptance tolerance. */
  phTol: 0.15,
  /** First-order transport/mix time constant (sim-seconds). */
  tauSec: 90,
  /** Actual must hold within tolerance this long before "settled" (sim-seconds). */
  settleHoldSec: 30,
  /** EC produced per (mL stock / L reservoir). Calibrated so the default
   *  EC 1.5 @ 2.5 L blends ≈ the experiment-runner buildPoolTarget recipe. */
  ecK: 0.3125,
  /** Reference reservoir volume the pH-acid heuristic was tuned for. */
  baseVolumeL: 2.5,
  /** Delivery pump flow while a dose is in flight (L/min). */
  flowRateLmin: 1.8,
  /** Delivery pump draw while running (W). */
  pumpPowerW: 12,
  /** Circulation baseline draw once settled (W). */
  baselinePowerW: 1.5,
  /** Default blend ratio when not specified. */
  defaultAbRatio: 1,
} as const;

export function makeRig(
  id: string,
  label: string,
  EC: number,
  pH: number,
  volumeL: number,
): RigState {
  return {
    id,
    label,
    volumeL,
    EC,
    pH,
    target: null,
    expectedEC: null,
    expectedPH: null,
    recipe: null,
    flowLmin: 0,
    powerW: 0,
    lastCommandMs: null,
    settledSinceMs: null,
  };
}
