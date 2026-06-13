// Experiment domain — pure type definitions + small helpers. No I/O.
// Storage layer (in-memory + JSON persist) lives in `src/storage/`.
//
// Lifecycle: draft → running → completed.
//   draft     — factors/treatments/assignments may be edited
//   running   — simulator advances biomass on assigned plots
//   completed — frozen; observations preserved but no further sim updates
//
// A plot can belong to at most ONE running experiment at a time. This is
// validated at start() — see storage/experimentStore.ts.
import type { CropId, EnvActual } from '@via-farm-lab/sim-models';

export type ExperimentStatus = 'draft' | 'running' | 'completed';

/** Factor identifiers we currently support; extend as more env modulators arrive. */
export type FactorName =
  | 'PPFD'
  | 'photoperiodH'
  | 'EC'
  | 'pH'
  | 'recipeRatio'
  | 'T_air'
  | 'RH'
  | 'CO2'
  | 'airflow';

export interface Factor {
  /** Stable id within an experiment. */
  readonly id: string;
  readonly name: FactorName;
  /** Display unit (e.g. "µmol/m²/s"). */
  readonly unit: string;
  /** Discrete levels assigned to this factor for treatments. */
  readonly levels: readonly number[];
}

export interface Treatment {
  readonly id: string;
  readonly experimentId: string;
  /** Map of factorId → level value. One entry per factor in the experiment. */
  readonly factorLevels: Readonly<Record<string, number>>;
  /** Human-readable label, e.g. "PPFD=400, EC=2.0". */
  readonly label: string;
}

export interface PlotAssignment {
  readonly plotId: string;
  readonly experimentId: string;
  readonly treatmentId: string;
  readonly cropId: CropId;
  readonly sowedAtMs: number;
  /** Replicate index within this treatment (1-based). */
  readonly replicateIndex: number;
}

export interface Experiment {
  readonly id: string;
  readonly name: string;
  readonly hypothesis: string;
  readonly description: string;
  readonly status: ExperimentStatus;
  readonly designType: 'single-factor' | 'full-factorial' | 'fractional-factorial' | 'RCBD';
  readonly factors: readonly Factor[];
  readonly treatments: readonly Treatment[];
  readonly assignments: readonly PlotAssignment[];
  readonly createdAtMs: number;
  readonly startedAtMs: number | null;
  readonly completedAtMs: number | null;
}

/** Compose an `EnvActual` snapshot from a treatment's factor levels, with
 *  defaults filling any factor the treatment doesn't override. */
export function treatmentToEnv(
  treatment: Treatment,
  factors: readonly Factor[],
  fallback: EnvActual,
): EnvActual {
  // Build name → value from the treatment using factor-id → name lookup.
  const byId = new Map(factors.map((f) => [f.id, f] as const));
  const out: Record<FactorName, number> = {
    PPFD: fallback.PPFD,
    photoperiodH: fallback.photoperiodH,
    EC: fallback.EC,
    pH: fallback.pH,
    recipeRatio: fallback.recipeRatio,
    T_air: fallback.T_air,
    RH: fallback.RH,
    CO2: fallback.CO2,
    airflow: fallback.airflow,
  };
  for (const [factorId, value] of Object.entries(treatment.factorLevels)) {
    const factor = byId.get(factorId);
    if (factor) out[factor.name] = value;
  }
  const DLI = (out.PPFD * out.photoperiodH * 3600) / 1_000_000;
  return {
    PPFD: out.PPFD,
    photoperiodH: out.photoperiodH,
    DLI,
    EC: out.EC,
    pH: out.pH,
    recipeRatio: out.recipeRatio,
    T_air: out.T_air,
    RH: out.RH,
    CO2: out.CO2,
    airflow: out.airflow,
  };
}

/** Build a label like "PPFD=400, EC=2.0" from a treatment. */
export function defaultTreatmentLabel(
  factorLevels: Readonly<Record<string, number>>,
  factors: readonly Factor[],
): string {
  const byId = new Map(factors.map((f) => [f.id, f] as const));
  const parts: string[] = [];
  for (const [factorId, value] of Object.entries(factorLevels)) {
    const factor = byId.get(factorId);
    if (factor) parts.push(`${factor.name}=${value}`);
  }
  return parts.join(', ');
}
