// Scenario play endpoint — materialises a scenario template into a running
// experiment with one POST. Uses the same primitives as routes/experiments.ts
// (store, sim-runner) so behaviour stays consistent with manually-built
// experiments.
import type { CropId } from '@via-farm-lab/sim-models';
import type { FastifyPluginAsync } from 'fastify';

import {
  defaultTreatmentLabel,
  type Experiment,
  type Factor,
  type PlotAssignment,
  type Treatment,
} from '../domain/experiment';
import type { PlayScenarioResult, RecipeSpec, ScenarioTemplate } from '../domain/scenario';
import { SCENARIO_CATALOG, getScenario } from '../scenarios';
import { applyExperimentToSim, removeExperimentFromSim } from '../sim/experiment-runner';
import { getExperimentStore } from '../storage/experimentStore';

const newId = (prefix: string): string => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const ALL_PLOTS: readonly string[] = (() => {
  const out: string[] = [];
  for (const rack of ['r01', 'r02']) {
    for (const bed of ['b1', 'b2']) {
      for (const plot of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']) {
        out.push(`pilot.syd.a.${rack}.${bed}.${plot}`);
      }
    }
  }
  return out;
})();

function cartesianFactorLevels(factors: readonly Factor[]): Readonly<Record<string, number>>[] {
  if (factors.length === 0) return [{}];
  let acc: Readonly<Record<string, number>>[] = [{}];
  for (const f of factors) {
    const next: Readonly<Record<string, number>>[] = [];
    for (const a of acc) {
      for (const lvl of f.levels) {
        next.push({ ...a, [f.id]: lvl });
      }
    }
    acc = next;
  }
  return acc;
}

/** Treatment → simple human-readable recipe (used by RecipeCard HUD). */
function buildRecipe(
  template: ScenarioTemplate,
  treatment: Treatment,
  factors: readonly Factor[],
): RecipeSpec {
  const get = (name: string, fallback: number): number => {
    const f = factors.find((x) => x.name === name);
    if (!f) return fallback;
    return treatment.factorLevels[f.id] ?? fallback;
  };
  const targetEC = get('EC', 1.8);
  const targetPH = get('pH', 6.0);
  // Stock A/B both scale with EC linearly (rough convention for CEA).
  const stockA = targetEC * 1.75;
  const stockB = targetEC * 1.75;
  // pH acid scales inversely with pH (lower pH = more acid).
  const pHAcid = Math.max(0, (7.0 - targetPH) * 0.5);
  return {
    stockA_mlL: Number(stockA.toFixed(2)),
    stockB_mlL: Number(stockB.toFixed(2)),
    pHAcid_mlL: Number(pHAcid.toFixed(2)),
    targetEC,
    targetPH,
    PPFD: get('PPFD', 250),
    photoperiodH: get('photoperiodH', 16),
    T_air: get('T_air', 20),
    RH: get('RH', 70),
    CO2: get('CO2', 800),
  };
}

export const scenarioRoutes: FastifyPluginAsync = (app) => {
  app.get('/scenarios', () => SCENARIO_CATALOG);

  app.get<{ Params: { id: string } }>('/scenarios/:id', (req, reply) => {
    const t = getScenario(req.params.id);
    if (!t) {
      void reply.status(404).send({
        type: 'https://errors.viafarm.com.au/not-found',
        title: 'Not Found',
        status: 404,
        detail: `Unknown scenario id: ${req.params.id}`,
      });
      return;
    }
    return t;
  });

  // POST /scenarios/:id/play
  // Side effects:
  //   1. creates a new Experiment from the template
  //   2. attaches factors + auto-generates treatments
  //   3. assigns plots in row-major order (treatment-major, then replicate)
  //   4. starts the experiment (pushes to multi-factor sim)
  app.post<{ Params: { id: string } }>('/scenarios/:id/play', (req, reply) => {
    const t = getScenario(req.params.id);
    if (!t) {
      void reply.status(404).send({
        type: 'https://errors.viafarm.com.au/not-found',
        title: 'Not Found',
        status: 404,
        detail: `Unknown scenario id: ${req.params.id}`,
      });
      return;
    }
    const store = getExperimentStore();
    const now = Date.now();

    // (1) experiment shell
    const experimentId = newId('exp');
    const factors: Factor[] = t.factors.map((f) => ({
      id: newId('fct'),
      name: f.name,
      unit: f.unit,
      levels: [...f.levels],
    }));

    // (2) treatments — cartesian on factor levels
    const levelTuples = cartesianFactorLevels(factors);
    const treatments: Treatment[] = levelTuples.map((factorLevels) => ({
      id: newId('trt'),
      experimentId,
      factorLevels,
      label: defaultTreatmentLabel(factorLevels, factors),
    }));

    // (3) assignments — treatment-major × replicates, walking ALL_PLOTS
    const cropForTreatment = (treatmentIdx: number): CropId => {
      if (t.cropAssignment === 'uniform') {
        return t.uniformCropId ?? 'butter-lettuce';
      }
      // byTreatmentFactor: each treatment gets its own crop from the list
      return t.treatmentCropIds?.[treatmentIdx] ?? 'butter-lettuce';
    };
    const assignments: PlotAssignment[] = [];
    let plotIdx = 0;
    for (let ti = 0; ti < treatments.length; ti++) {
      const trt = treatments[ti];
      if (!trt) continue;
      for (let r = 0; r < t.replicatesPerTreatment; r++) {
        const plotId = ALL_PLOTS[plotIdx++];
        if (!plotId) break;
        assignments.push({
          plotId,
          experimentId,
          treatmentId: trt.id,
          cropId: cropForTreatment(ti),
          sowedAtMs: now,
          replicateIndex: r + 1,
        });
      }
      if (plotIdx >= ALL_PLOTS.length) break;
    }

    const exp: Experiment = {
      id: experimentId,
      name: t.name,
      hypothesis: t.hypothesis,
      description: t.description,
      status: 'running',
      designType: t.designType,
      factors,
      treatments,
      assignments,
      createdAtMs: now,
      startedAtMs: now,
      completedAtMs: null,
    };

    // (4) Auto-complete any prior `running` experiments that occupy the
    // plots this scenario wants. Scenario play is intentionally a
    // "demo reset" operation — the previous demo may have been orphaned
    // by a page refresh / closed tab, and the only way the client can
    // signal "I'm starting fresh" is by calling /play again. Manually
    // built experiments that don't share plots are left untouched.
    const wantPlots = new Set(assignments.map((a) => a.plotId));
    for (const prior of store.list()) {
      if (prior.id === experimentId) continue;
      if (prior.status !== 'running') continue;
      const overlaps = prior.assignments.some((a) => wantPlots.has(a.plotId));
      if (!overlaps) continue;
      const completed: Experiment = {
        ...prior,
        status: 'completed',
        completedAtMs: now,
      };
      store.upsert(completed);
      removeExperimentFromSim(prior);
    }

    // After auto-cleanup, conflicts should be empty. Re-check defensively
    // in case a non-scenario experiment claims the same plot.
    const conflicts = store.validateStart(experimentId, assignments);
    if (conflicts.length > 0) {
      void reply.status(409).send({
        type: 'https://errors.viafarm.com.au/plot-conflict',
        title: 'Plot conflict',
        status: 409,
        detail: `Plots already running in other experiments: ${conflicts.join(', ')}`,
      });
      return;
    }
    store.upsert(exp);
    applyExperimentToSim(exp);

    const recipesByTreatment: Record<string, RecipeSpec> = {};
    for (const trt of treatments) {
      recipesByTreatment[trt.id] = buildRecipe(t, trt, factors);
    }

    const result: PlayScenarioResult = {
      experimentId,
      demo: t.demo,
      recipesByTreatment,
    };
    return result;
  });

  return Promise.resolve();
};
