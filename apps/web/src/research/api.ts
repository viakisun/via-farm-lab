// Thin fetch wrappers around the BFF experiment / observation / crop
// endpoints. No state — these are pure async functions. Hooks in
// `useExperiments.ts` (etc.) wrap them with React state + caching.

export type ExperimentStatus = 'draft' | 'running' | 'completed';
export type ExperimentDesignType =
  | 'single-factor'
  | 'full-factorial'
  | 'fractional-factorial'
  | 'RCBD';

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

export type CropId = 'butter-lettuce' | 'romaine-lettuce' | 'basil' | 'kale' | 'spinach';

export type MetricName =
  | 'biomass'
  | 'canopyHeightCm'
  | 'leafAreaCm2'
  | 'leafCount'
  | 'colorHealth'
  | 'effectiveR'
  | 'poolEC'
  | 'poolPH';

export interface Factor {
  readonly id: string;
  readonly name: FactorName;
  readonly unit: string;
  readonly levels: readonly number[];
}

export interface Treatment {
  readonly id: string;
  readonly experimentId: string;
  readonly factorLevels: Readonly<Record<string, number>>;
  readonly label: string;
}

export interface PlotAssignment {
  readonly plotId: string;
  readonly experimentId: string;
  readonly treatmentId: string;
  readonly cropId: CropId;
  readonly sowedAtMs: number;
  readonly replicateIndex: number;
}

export interface Experiment {
  readonly id: string;
  readonly name: string;
  readonly hypothesis: string;
  readonly description: string;
  readonly status: ExperimentStatus;
  readonly designType: ExperimentDesignType;
  readonly factors: readonly Factor[];
  readonly treatments: readonly Treatment[];
  readonly assignments: readonly PlotAssignment[];
  readonly createdAtMs: number;
  readonly startedAtMs: number | null;
  readonly completedAtMs: number | null;
}

export interface Observation {
  readonly timestampMs: number;
  readonly plotId: string;
  readonly metric: MetricName;
  readonly value: number;
  readonly unit: string;
  readonly source: 'sim' | 'manual' | 'sensor' | 'cv';
  readonly uncertainty?: number;
}

export interface OptimalRange {
  readonly min: number;
  readonly max: number;
  readonly tolerance: number;
}

export interface Crop {
  readonly id: CropId;
  readonly latinName: string;
  readonly commonName: string;
  readonly defaultGrowthDays: number;
  readonly K: number;
  readonly r_max: number;
  readonly B0: number;
  readonly optimal: Readonly<Record<string, OptimalRange>>;
}

export interface MultiMetricSnapshot {
  readonly plotId: string;
  readonly cropId: CropId | undefined;
  readonly ageDays: number;
  readonly biomass: number;
  readonly canopyHeightCm: number;
  readonly leafAreaCm2: number;
  readonly leafCount: number;
  readonly colorHealth: number;
  readonly effectiveR: number;
  readonly poolEC?: number;
  readonly poolPH?: number;
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

export interface NutrientTankState {
  readonly stockA_mL: number;
  readonly stockB_mL: number;
  readonly pHAcid_mL: number;
  readonly capacities: {
    readonly stockA_mL: number;
    readonly stockB_mL: number;
    readonly pHAcid_mL: number;
  };
}

async function json<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${detail}`);
  }
  return (await res.json()) as T;
}

export const api = {
  listExperiments: (): Promise<Experiment[]> => json('/experiments'),
  getExperiment: (id: string): Promise<Experiment> => json(`/experiments/${id}`),
  createExperiment: (body: {
    name: string;
    hypothesis?: string;
    description?: string;
    designType?: ExperimentDesignType;
  }): Promise<Experiment> => json('/experiments', { method: 'POST', body: JSON.stringify(body) }),
  deleteExperiment: (id: string): Promise<{ deleted: boolean }> =>
    json(`/experiments/${id}`, { method: 'DELETE' }),
  setFactors: (
    id: string,
    factors: readonly { name: FactorName; unit: string; levels: number[] }[],
  ): Promise<Experiment> =>
    json(`/experiments/${id}/factors`, {
      method: 'POST',
      body: JSON.stringify({ factors }),
    }),
  setAssignments: (
    id: string,
    assignments: readonly {
      plotId: string;
      treatmentId: string;
      cropId: CropId;
      sowedAtMs?: number;
      replicateIndex?: number;
    }[],
  ): Promise<Experiment> =>
    json(`/experiments/${id}/assignments`, {
      method: 'POST',
      body: JSON.stringify({ assignments }),
    }),
  startExperiment: (id: string): Promise<Experiment> =>
    json(`/experiments/${id}/start`, { method: 'POST' }),
  completeExperiment: (id: string): Promise<Experiment> =>
    json(`/experiments/${id}/complete`, { method: 'POST' }),

  listCrops: (): Promise<Crop[]> => json('/crops'),

  queryObservations: (q: {
    plotId?: string;
    metric?: MetricName;
    fromMs?: number;
    toMs?: number;
    limit?: number;
  }): Promise<Observation[]> => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) {
      if (v !== undefined) params.set(k, String(v));
    }
    const qs = params.toString();
    return json(`/observations${qs ? `?${qs}` : ''}`);
  },
  postObservation: (o: Omit<Observation, 'source'>): Promise<Observation> =>
    json('/observations', { method: 'POST', body: JSON.stringify(o) }),

  getMultiMetric: (): Promise<MultiMetricSnapshot[]> => json('/sim/multi-metric'),

  listScenarios: (): Promise<ScenarioTemplate[]> => json('/scenarios'),
  playScenario: (id: string): Promise<PlayScenarioResult> =>
    json(`/scenarios/${id}/play`, { method: 'POST', body: '{}' }),

  setClockSpeed: (multiplier: number): Promise<unknown> =>
    json('/sim/clock/speed', { method: 'POST', body: JSON.stringify({ multiplier }) }),
  startClock: (): Promise<unknown> => json('/sim/clock/start', { method: 'POST', body: '{}' }),
  pauseClock: (): Promise<unknown> => json('/sim/clock/pause', { method: 'POST', body: '{}' }),
  seekClock: (targetMs: number): Promise<unknown> =>
    json('/sim/clock/seek', { method: 'POST', body: JSON.stringify({ targetMs }) }),

  getNutrientTanks: (): Promise<NutrientTankState> => json('/nutrient/tanks'),

  listDosingEvents: (q: {
    sinceMs?: number;
    plotId?: string;
    kind?: DosingKind;
    limit?: number;
  }): Promise<DosingEvent[]> => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) {
      if (v !== undefined) params.set(k, String(v));
    }
    const qs = params.toString();
    return json(`/nutrient/events${qs ? `?${qs}` : ''}`);
  },

  listAnomalies: (q: {
    sinceMs?: number;
    severity?: AnomalySeverity;
    plotId?: string;
    limit?: number;
  }): Promise<AnomalyEvent[]> => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) {
      if (v !== undefined) params.set(k, String(v));
    }
    const qs = params.toString();
    return json(`/anomalies${qs ? `?${qs}` : ''}`);
  },
};

export type AnomalySeverity = 'info' | 'warning' | 'critical';
export type AnomalyKind =
  | 'co2-deficit'
  | 'co2-excess'
  | 'biomass-under-target'
  | 'biomass-over-target'
  | 'ec-drift'
  | 'ph-drift'
  | 't-cool-stress'
  | 't-heat-stress'
  | 'colour-chlorosis';

export interface AnomalyEvent {
  readonly timestampMs: number;
  readonly plotId: string;
  readonly kind: AnomalyKind;
  readonly severity: AnomalySeverity;
  readonly actualValue: number;
  readonly expectedRange: { readonly min: number; readonly max: number };
  readonly message: string;
}

export type CameraPreset = 'iso-pan' | 'closeup-dosing' | 'top-rotate' | 'iso-hvac';

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
  readonly cropAssignment: 'uniform' | 'byTreatmentFactor';
  readonly uniformCropId?: CropId;
  readonly treatmentCropIds?: readonly CropId[];
  readonly replicatesPerTreatment: number;
  readonly demo: {
    readonly durationSimDays: number;
    readonly simSpeedMultiplier: number;
    readonly cameraPreset: CameraPreset;
  };
}

export interface RecipeSpec {
  readonly stockA_mlL: number;
  readonly stockB_mlL: number;
  readonly pHAcid_mlL: number;
  readonly targetEC: number;
  readonly targetPH: number;
  readonly PPFD: number;
  readonly photoperiodH: number;
  readonly T_air: number;
  readonly RH: number;
  readonly CO2: number;
}

export interface PlayScenarioResult {
  readonly experimentId: string;
  readonly demo: ScenarioTemplate['demo'];
  readonly recipesByTreatment: Readonly<Record<string, RecipeSpec>>;
}

/** Plot ID enumeration helper — synchronised with plants.ts / plants-singleton.ts. */
export function allPlotIds(): readonly string[] {
  const out: string[] = [];
  for (const rack of ['r01', 'r02']) {
    for (const bed of ['b1', 'b2']) {
      for (const plot of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']) {
        out.push(`pilot.syd.a.${rack}.${bed}.${plot}`);
      }
    }
  }
  return out;
}
