// Bridges the experiment domain with the multi-factor simulator.
//
//   start(exp)    — transplant every assignment, push treatment env
//   stop(exp)     — harvest every assignment
//   tick(nowMs)   — advance every active plot under its current env, then
//                   emit one Observation per plot per metric into the store
//
// On startup, anything in `running` state in the ExperimentStore is
// re-hydrated into the multi-factor model so that a process restart
// resumes seamlessly.
import {
  type AnomalyEvent,
  applyDiurnal,
  classifyAnomalies,
  type DosingEvent,
  type EnvActual,
  getCrop,
  lightIntensityFactor,
  PoolModel,
  type PoolState,
  type PoolTarget,
} from '@via-farm-lab/sim-models';

import { type Experiment, treatmentToEnv } from '../domain/experiment';
import { METRIC_UNITS, type Observation } from '../domain/observation';
import { getExperimentStore } from '../storage/experimentStore';
import { getObservationStore } from '../storage/observationStore';

import { ENV_DEFAULT, getMultiFactorModel } from './multi-factor-singleton';

/** Snapshot env setpoints per plot. Updated whenever a treatment is applied;
 *  each tick we re-derive the diurnal-modulated EnvActual from these. */
const setpointsByPlot = new Map<string, EnvActual>();

/** Per-plot cropId — needed for anomaly classification each tick. */
const cropByPlot = new Map<string, ReturnType<typeof getCrop>>();

/** Per-plot nutrient pool — drives EC/pH dynamics + dosing visualisation. */
const poolModel = new PoolModel();

const recentAnomalies: AnomalyEvent[] = [];
const MAX_ANOMALIES = 200;

const recentDosingEvents: DosingEvent[] = [];
const MAX_DOSING_EVENTS = 200;

/** Site-wide dosing reservoirs. Decremented when a dose fires.
 *  TODO: reset / refill route once we model maintenance windows. */
const dosingTanks = {
  stockA_mL: 5000,
  stockB_mL: 5000,
  pHAcid_mL: 2000,
};
const dosingTankCapacities = { ...dosingTanks };

let lastTickMs: number | null = null;

const OBSERVATION_EVERY_TICKS = 60; // ≈ 1 / minute at 1 Hz tick
const ANOMALY_EVERY_TICKS = 10; // ≈ 6 Hz max at 60 Hz tick rate
let tickCounter = 0;

/** Build a per-dose recipe from a treatment setpoint. Stock A/B both
 *  scale with target EC (rough hydroponics convention); pH acid scales
 *  with how far below neutral the target is. */
function buildPoolTarget(env: EnvActual): PoolTarget {
  return {
    EC: env.EC,
    pH: env.pH,
    recipe: {
      stockA_mL: Math.max(2, env.EC * 4),
      stockB_mL: Math.max(2, env.EC * 4),
      pHAcid_mL: Math.max(0, (7 - env.pH) * 2),
    },
  };
}

/** Apply an experiment's assignments to the simulator (idempotent). Stores
 *  setpoints + cropId for diurnal modulation + anomaly classification. */
export function applyExperimentToSim(exp: Experiment): void {
  const model = getMultiFactorModel();
  for (const a of exp.assignments) {
    const treatment = exp.treatments.find((t) => t.id === a.treatmentId);
    const env = treatment ? treatmentToEnv(treatment, exp.factors, ENV_DEFAULT) : ENV_DEFAULT;
    setpointsByPlot.set(a.plotId, env);
    cropByPlot.set(a.plotId, getCrop(a.cropId));
    poolModel.setTarget(a.plotId, buildPoolTarget(env));
    if (!model.hasPlot(a.plotId)) {
      model.transplant(a.plotId, a.cropId, a.sowedAtMs, env);
    } else {
      model.setEnv(a.plotId, env);
    }
  }
}

/** Remove an experiment's plots from the simulator. */
export function removeExperimentFromSim(exp: Experiment): void {
  const model = getMultiFactorModel();
  for (const a of exp.assignments) {
    model.harvest(a.plotId);
    setpointsByPlot.delete(a.plotId);
    cropByPlot.delete(a.plotId);
    poolModel.remove(a.plotId);
  }
}

/** Recent anomaly events ring buffer. */
export function recentAnomalyEvents(): readonly AnomalyEvent[] {
  return recentAnomalies;
}

/** Recent dosing events ring buffer. */
export function recentDosingEventsList(): readonly DosingEvent[] {
  return recentDosingEvents;
}

/** Dosing tank reservoir state (mL + capacities). */
export function dosingTankState(): {
  readonly stockA_mL: number;
  readonly stockB_mL: number;
  readonly pHAcid_mL: number;
  readonly capacities: typeof dosingTankCapacities;
} {
  return { ...dosingTanks, capacities: dosingTankCapacities };
}

/** Per-plot pool state for streaming. */
export function poolStateFor(plotId: string): PoolState | undefined {
  return poolModel.get(plotId);
}

/** Re-hydrate every running experiment on startup. */
export function hydrateRunningExperiments(): void {
  const store = getExperimentStore();
  for (const exp of store.list()) {
    if (exp.status === 'running') applyExperimentToSim(exp);
  }
}

/** Advance every active plot and (every N ticks) emit a multi-metric
 *  observation per plot per metric. Returns the snapshot for streaming. */
export function tickExperiments(
  nowMs: number,
): Map<string, ReturnType<ReturnType<typeof getMultiFactorModel>['snapshot']>> {
  const model = getMultiFactorModel();
  // Step 1: re-derive each plot's diurnal-modulated env from its setpoint
  // and push into the multi-factor model.
  for (const [plotId, setpoint] of setpointsByPlot) {
    const actual = applyDiurnal(setpoint, nowMs);
    model.setEnv(plotId, actual);
  }

  model.advanceAll(nowMs);
  const snapshots = model.snapshotAll(nowMs);

  // Step 1b: advance the nutrient pool for every active plot.
  const dtMs = lastTickMs !== null ? Math.max(0, nowMs - lastTickMs) : 0;
  lastTickMs = nowMs;
  if (dtMs > 0) {
    const lf = lightIntensityFactor(nowMs);
    for (const [plotId, snap] of snapshots) {
      if (!snap) continue;
      const event = poolModel.advance(plotId, dtMs, snap.biomass, lf, nowMs);
      if (event) {
        recentDosingEvents.push(event);
        if (recentDosingEvents.length > MAX_DOSING_EVENTS) {
          recentDosingEvents.splice(0, recentDosingEvents.length - MAX_DOSING_EVENTS);
        }
        dosingTanks.stockA_mL = Math.max(0, dosingTanks.stockA_mL - event.stockA_mL);
        dosingTanks.stockB_mL = Math.max(0, dosingTanks.stockB_mL - event.stockB_mL);
        dosingTanks.pHAcid_mL = Math.max(0, dosingTanks.pHAcid_mL - event.pHAcid_mL);
      }
    }
  }

  tickCounter += 1;

  // Step 2: classify anomalies — throttled. At 60 Hz tick this fires
  // ~6 Hz which is still well above any UI refresh need.
  if (tickCounter % ANOMALY_EVERY_TICKS === 0) {
    for (const [plotId, snap] of snapshots) {
      if (!snap) continue;
      const crop = cropByPlot.get(plotId);
      const setpoint = setpointsByPlot.get(plotId);
      if (!crop || !setpoint) continue;
      const actual = applyDiurnal(setpoint, nowMs);
      const anomalies = classifyAnomalies(plotId, crop, snap, actual, nowMs);
      for (const a of anomalies) {
        recentAnomalies.push(a);
        if (recentAnomalies.length > MAX_ANOMALIES) {
          recentAnomalies.splice(0, recentAnomalies.length - MAX_ANOMALIES);
        }
      }
    }
  }

  if (tickCounter % OBSERVATION_EVERY_TICKS === 0) {
    const store = getObservationStore();
    const batch: Observation[] = [];
    for (const [plotId, s] of snapshots) {
      if (!s) continue;
      const pool = poolModel.get(plotId);
      batch.push(
        {
          timestampMs: nowMs,
          plotId,
          metric: 'biomass',
          value: s.biomass,
          unit: METRIC_UNITS.biomass,
          source: 'sim',
        },
        {
          timestampMs: nowMs,
          plotId,
          metric: 'canopyHeightCm',
          value: s.canopyHeightCm,
          unit: METRIC_UNITS.canopyHeightCm,
          source: 'sim',
        },
        {
          timestampMs: nowMs,
          plotId,
          metric: 'leafAreaCm2',
          value: s.leafAreaCm2,
          unit: METRIC_UNITS.leafAreaCm2,
          source: 'sim',
        },
        {
          timestampMs: nowMs,
          plotId,
          metric: 'leafCount',
          value: s.leafCount,
          unit: METRIC_UNITS.leafCount,
          source: 'sim',
        },
        {
          timestampMs: nowMs,
          plotId,
          metric: 'colorHealth',
          value: s.colorHealth,
          unit: METRIC_UNITS.colorHealth,
          source: 'sim',
        },
      );
      if (pool) {
        batch.push(
          {
            timestampMs: nowMs,
            plotId,
            metric: 'poolEC',
            value: pool.EC,
            unit: METRIC_UNITS.poolEC,
            source: 'sim',
          },
          {
            timestampMs: nowMs,
            plotId,
            metric: 'poolPH',
            value: pool.pH,
            unit: METRIC_UNITS.poolPH,
            source: 'sim',
          },
        );
      }
    }
    store.appendMany(batch);
  }

  // Map<string, MultiMetricState | null> — return shape suitable for WS payload.
  const out = new Map<string, ReturnType<ReturnType<typeof getMultiFactorModel>['snapshot']>>();
  for (const [k, v] of snapshots) out.set(k, v);
  return out;
}
