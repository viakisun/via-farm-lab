// Experiment lifecycle REST endpoints. Pure CRUD + state transitions; all
// heavy lifting (simulator integration) is delegated to experiment-runner.
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import {
  defaultTreatmentLabel,
  type Experiment,
  type Factor,
  type PlotAssignment,
  type Treatment,
} from '../domain/experiment';
import { applyExperimentToSim, removeExperimentFromSim } from '../sim/experiment-runner';
import { getExperimentStore } from '../storage/experimentStore';

const newId = (prefix: string): string => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const CreateExperimentBody = z.object({
  name: z.string().min(1).max(120),
  hypothesis: z.string().max(2000).default(''),
  description: z.string().max(2000).default(''),
  designType: z
    .enum(['single-factor', 'full-factorial', 'fractional-factorial', 'RCBD'])
    .default('single-factor'),
});

const UpdateExperimentBody = CreateExperimentBody.partial();

const FactorInput = z.object({
  name: z.enum([
    'PPFD',
    'photoperiodH',
    'EC',
    'pH',
    'recipeRatio',
    'T_air',
    'RH',
    'CO2',
    'airflow',
  ]),
  unit: z.string().min(1).max(40),
  levels: z.array(z.number().finite()).min(1).max(12),
});

const SetFactorsBody = z.object({
  factors: z.array(FactorInput).min(1).max(6),
});

const AssignmentInput = z.object({
  plotId: z.string().min(1),
  treatmentId: z.string().min(1),
  cropId: z.enum(['butter-lettuce', 'romaine-lettuce', 'basil', 'kale', 'spinach']),
  sowedAtMs: z.number().int().nonnegative().optional(),
  replicateIndex: z.number().int().positive().default(1),
});

const SetAssignmentsBody = z.object({
  assignments: z.array(AssignmentInput).min(1).max(24),
});

const errPayload = (
  status: number,
  title: string,
  detail: string,
): {
  type: string;
  title: string;
  status: number;
  detail: string;
} => ({
  type: `https://errors.viafarm.com.au/${title.toLowerCase().replace(/\s+/g, '-')}`,
  title,
  status,
  detail,
});

/**
 * Cartesian product of factor levels → one Treatment per combination.
 * Pure helper so callers can preview before committing.
 */
function buildTreatmentsFromFactors(experimentId: string, factors: readonly Factor[]): Treatment[] {
  if (factors.length === 0) return [];
  // Cartesian product over [factor index, level value].
  const tuples: number[][] = [[]];
  for (const f of factors) {
    const next: number[][] = [];
    for (const t of tuples) {
      for (const lvl of f.levels) next.push([...t, lvl]);
    }
    tuples.splice(0, tuples.length, ...next);
  }
  const out: Treatment[] = [];
  for (const tuple of tuples) {
    const factorLevels: Record<string, number> = {};
    for (let i = 0; i < factors.length; i++) {
      const fid = factors[i]?.id;
      const lvl = tuple[i];
      if (fid !== undefined && lvl !== undefined) factorLevels[fid] = lvl;
    }
    out.push({
      id: newId('trt'),
      experimentId,
      factorLevels,
      label: defaultTreatmentLabel(factorLevels, factors),
    });
  }
  return out;
}

export const experimentRoutes: FastifyPluginAsync = (app) => {
  const store = getExperimentStore();

  app.get('/experiments', () => store.list());

  app.get<{ Params: { id: string } }>('/experiments/:id', (req, reply) => {
    const exp = store.get(req.params.id);
    if (!exp) {
      void reply.status(404).send(errPayload(404, 'Not Found', 'Unknown experiment id'));
      return;
    }
    return exp;
  });

  app.post('/experiments', (req, reply) => {
    const parsed = CreateExperimentBody.safeParse(req.body);
    if (!parsed.success) {
      void reply.status(400).send(errPayload(400, 'Bad Request', parsed.error.message));
      return;
    }
    const now = Date.now();
    const exp: Experiment = {
      id: newId('exp'),
      name: parsed.data.name,
      hypothesis: parsed.data.hypothesis,
      description: parsed.data.description,
      status: 'draft',
      designType: parsed.data.designType,
      factors: [],
      treatments: [],
      assignments: [],
      createdAtMs: now,
      startedAtMs: null,
      completedAtMs: null,
    };
    store.upsert(exp);
    return exp;
  });

  app.put<{ Params: { id: string } }>('/experiments/:id', (req, reply) => {
    const exp = store.get(req.params.id);
    if (!exp) {
      void reply.status(404).send(errPayload(404, 'Not Found', 'Unknown experiment id'));
      return;
    }
    if (exp.status !== 'draft') {
      void reply
        .status(409)
        .send(errPayload(409, 'Conflict', 'Only draft experiments can be edited'));
      return;
    }
    const parsed = UpdateExperimentBody.safeParse(req.body);
    if (!parsed.success) {
      void reply.status(400).send(errPayload(400, 'Bad Request', parsed.error.message));
      return;
    }
    const d = parsed.data;
    const updated: Experiment = {
      ...exp,
      name: d.name ?? exp.name,
      hypothesis: d.hypothesis ?? exp.hypothesis,
      description: d.description ?? exp.description,
      designType: d.designType ?? exp.designType,
    };
    store.upsert(updated);
    return updated;
  });

  app.delete<{ Params: { id: string } }>('/experiments/:id', (req, reply) => {
    const exp = store.get(req.params.id);
    if (!exp) {
      void reply.status(404).send(errPayload(404, 'Not Found', 'Unknown experiment id'));
      return;
    }
    if (exp.status === 'running') {
      void reply
        .status(409)
        .send(errPayload(409, 'Conflict', 'Stop the experiment before deleting'));
      return;
    }
    store.delete(exp.id);
    return { deleted: true, id: exp.id };
  });

  // Set factors → also auto-generates treatments from the full-factorial product.
  app.post<{ Params: { id: string } }>('/experiments/:id/factors', (req, reply) => {
    const exp = store.get(req.params.id);
    if (!exp) {
      void reply.status(404).send(errPayload(404, 'Not Found', 'Unknown experiment id'));
      return;
    }
    if (exp.status !== 'draft') {
      void reply
        .status(409)
        .send(errPayload(409, 'Conflict', 'Only draft experiments can be edited'));
      return;
    }
    const parsed = SetFactorsBody.safeParse(req.body);
    if (!parsed.success) {
      void reply.status(400).send(errPayload(400, 'Bad Request', parsed.error.message));
      return;
    }
    const factors: Factor[] = parsed.data.factors.map((f) => ({
      id: newId('fct'),
      name: f.name,
      unit: f.unit,
      levels: f.levels,
    }));
    const treatments = buildTreatmentsFromFactors(exp.id, factors);
    const updated: Experiment = {
      ...exp,
      factors,
      treatments,
      assignments: [], // factors changed → previous assignments invalid
    };
    store.upsert(updated);
    return updated;
  });

  app.post<{ Params: { id: string } }>('/experiments/:id/assignments', (req, reply) => {
    const exp = store.get(req.params.id);
    if (!exp) {
      void reply.status(404).send(errPayload(404, 'Not Found', 'Unknown experiment id'));
      return;
    }
    if (exp.status !== 'draft') {
      void reply
        .status(409)
        .send(errPayload(409, 'Conflict', 'Only draft experiments can be edited'));
      return;
    }
    const parsed = SetAssignmentsBody.safeParse(req.body);
    if (!parsed.success) {
      void reply.status(400).send(errPayload(400, 'Bad Request', parsed.error.message));
      return;
    }
    // Validate every treatment id refers to a known treatment.
    const treatmentIds = new Set(exp.treatments.map((t) => t.id));
    for (const a of parsed.data.assignments) {
      if (!treatmentIds.has(a.treatmentId)) {
        void reply
          .status(400)
          .send(errPayload(400, 'Bad Request', `Unknown treatmentId: ${a.treatmentId}`));
        return;
      }
    }
    const now = Date.now();
    const assignments: PlotAssignment[] = parsed.data.assignments.map((a) => ({
      plotId: a.plotId,
      experimentId: exp.id,
      treatmentId: a.treatmentId,
      cropId: a.cropId,
      sowedAtMs: a.sowedAtMs ?? now,
      replicateIndex: a.replicateIndex,
    }));
    const updated: Experiment = { ...exp, assignments };
    store.upsert(updated);
    return updated;
  });

  app.post<{ Params: { id: string } }>('/experiments/:id/start', (req, reply) => {
    const exp = store.get(req.params.id);
    if (!exp) {
      void reply.status(404).send(errPayload(404, 'Not Found', 'Unknown experiment id'));
      return;
    }
    if (exp.status === 'running') return exp;
    if (exp.status === 'completed') {
      void reply
        .status(409)
        .send(errPayload(409, 'Conflict', 'Completed experiments cannot be restarted'));
      return;
    }
    if (exp.assignments.length === 0) {
      void reply
        .status(409)
        .send(errPayload(409, 'Conflict', 'Set plot assignments before starting'));
      return;
    }
    const conflicts = store.validateStart(exp.id, exp.assignments);
    if (conflicts.length > 0) {
      void reply
        .status(409)
        .send(
          errPayload(
            409,
            'Plot conflict',
            `Plots already claimed by other running experiments: ${conflicts.join(', ')}`,
          ),
        );
      return;
    }
    const started: Experiment = {
      ...exp,
      status: 'running',
      startedAtMs: Date.now(),
    };
    store.upsert(started);
    applyExperimentToSim(started);
    return started;
  });

  app.post<{ Params: { id: string } }>('/experiments/:id/complete', (req, reply) => {
    const exp = store.get(req.params.id);
    if (!exp) {
      void reply.status(404).send(errPayload(404, 'Not Found', 'Unknown experiment id'));
      return;
    }
    if (exp.status !== 'running') {
      void reply
        .status(409)
        .send(errPayload(409, 'Conflict', 'Only running experiments can complete'));
      return;
    }
    const completed: Experiment = {
      ...exp,
      status: 'completed',
      completedAtMs: Date.now(),
    };
    store.upsert(completed);
    removeExperimentFromSim(completed);
    return completed;
  });

  return Promise.resolve();
};
