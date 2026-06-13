// Pool state — one per plot. Tracks the actual EC/pH that the plants
// "see" right now, distinct from the treatment setpoint.

export interface PoolState {
  /** Reservoir volume (litres). Fixed per plot for now. */
  readonly volumeL: number;
  /** Current pool EC in mS/cm. Decreases as plants take up nutrients. */
  EC: number;
  /** Current pool pH (dimensionless). Drifts up under typical cation uptake. */
  pH: number;
  /** Sim-time of the most recent dosing event. `null` before any dose. */
  lastDosedAtMs: number | null;
}

export interface PoolTarget {
  /** Setpoint EC from the active treatment. */
  readonly EC: number;
  /** Setpoint pH from the active treatment. */
  readonly pH: number;
  /** Per-dose mL drawn from each stock when EC drops below threshold. */
  readonly recipe: {
    readonly stockA_mL: number;
    readonly stockB_mL: number;
    readonly pHAcid_mL: number;
  };
}

export type DosingKind = 'ec-boost' | 'ph-acid';

export interface DosingEvent {
  readonly plotId: string;
  readonly timestampMs: number;
  readonly kind: DosingKind;
  readonly stockA_mL: number;
  readonly stockB_mL: number;
  readonly pHAcid_mL: number;
  readonly beforeEC: number;
  readonly afterEC: number;
  readonly beforePH: number;
  readonly afterPH: number;
}

export const DEFAULT_NUTRIENT_PARAMS = {
  /** Pool volume per plot (litres). */
  volumeL: 2.5,
  /** EC drop below target that triggers an ec-boost dose. */
  ecBoostBelowTarget: 0.15,
  /** pH rise above target that triggers a pH-acid dose. */
  phAcidAboveTarget: 0.3,
  /** EC drawdown coefficient — mS/cm per (g biomass × s × lightFactor). */
  kUptakeEC: 0.0015,
  /** pH drift rate — pH units per (g biomass × s × lightFactor). */
  kDriftPH: 0.00002,
} as const;

export function makePool(target: PoolTarget): PoolState {
  return {
    volumeL: DEFAULT_NUTRIENT_PARAMS.volumeL,
    EC: target.EC,
    pH: target.pH,
    lastDosedAtMs: null,
  };
}
