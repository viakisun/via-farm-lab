// Observation domain — time-stamped measurements per plot per metric.
// Source = 'sim' for simulator-derived snapshots, 'manual' for user input,
// 'sensor' for live BMS readings, 'cv' for ML/CV-derived measurements.
//
// Uncertainty is optional but should be populated whenever a measurement
// has a known confidence interval (CV outputs, sensor accuracy specs).
//
// Storage layer (in-memory ring buffer + JSON persist) lives in
// `src/storage/observationStore.ts`.

export type MetricName =
  | 'biomass'
  | 'canopyHeightCm'
  | 'leafAreaCm2'
  | 'leafCount'
  | 'colorHealth'
  | 'effectiveR'
  | 'poolEC'
  | 'poolPH';

export type ObservationSource = 'sim' | 'manual' | 'sensor' | 'cv';

export interface Observation {
  readonly timestampMs: number;
  readonly plotId: string;
  readonly metric: MetricName;
  readonly value: number;
  readonly unit: string;
  readonly source: ObservationSource;
  /** Standard deviation (±1σ) if known. */
  readonly uncertainty?: number;
}

/** Canonical units per metric — keeps Observation creation consistent. */
export const METRIC_UNITS: Readonly<Record<MetricName, string>> = {
  biomass: 'g',
  canopyHeightCm: 'cm',
  leafAreaCm2: 'cm²',
  leafCount: 'leaves',
  colorHealth: '0..1',
  effectiveR: '/day',
  poolEC: 'mS/cm',
  poolPH: '',
};
