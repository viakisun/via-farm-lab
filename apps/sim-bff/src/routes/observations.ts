// Observation query + manual entry endpoints.
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import type { Observation } from '../domain/observation';
import type { ObservationQuery } from '../storage/observationStore';
import { getObservationStore } from '../storage/observationStore';

const MetricNames = z.enum([
  'biomass',
  'canopyHeightCm',
  'leafAreaCm2',
  'leafCount',
  'colorHealth',
  'effectiveR',
]);

const ManualObservationBody = z.object({
  plotId: z.string().min(1),
  metric: MetricNames,
  value: z.number().finite(),
  unit: z.string().min(1).max(40),
  uncertainty: z.number().nonnegative().finite().optional(),
  timestampMs: z.number().int().nonnegative().optional(),
});

const QueryParams = z.object({
  plotId: z.string().optional(),
  metric: MetricNames.optional(),
  source: z.enum(['sim', 'manual', 'sensor', 'cv']).optional(),
  fromMs: z.coerce.number().int().nonnegative().optional(),
  toMs: z.coerce.number().int().nonnegative().optional(),
  limit: z.coerce.number().int().positive().max(50_000).optional(),
});

export const observationRoutes: FastifyPluginAsync = (app) => {
  const store = getObservationStore();

  app.get('/observations', (req, reply) => {
    const parsed = QueryParams.safeParse(req.query);
    if (!parsed.success) {
      void reply.status(400).send({
        type: 'https://errors.viafarm.com.au/bad-request',
        title: 'Bad Request',
        status: 400,
        detail: parsed.error.message,
      });
      return;
    }
    // Drop undefined entries — store query uses exactOptionalPropertyTypes.
    const q: ObservationQuery = {};
    const d = parsed.data;
    if (d.plotId !== undefined) q.plotId = d.plotId;
    if (d.metric !== undefined) q.metric = d.metric;
    if (d.source !== undefined) q.source = d.source;
    if (d.fromMs !== undefined) q.fromMs = d.fromMs;
    if (d.toMs !== undefined) q.toMs = d.toMs;
    if (d.limit !== undefined) q.limit = d.limit;
    return store.query(q);
  });

  app.post('/observations', (req, reply) => {
    const parsed = ManualObservationBody.safeParse(req.body);
    if (!parsed.success) {
      void reply.status(400).send({
        type: 'https://errors.viafarm.com.au/bad-request',
        title: 'Bad Request',
        status: 400,
        detail: parsed.error.message,
      });
      return;
    }
    const base = {
      timestampMs: parsed.data.timestampMs ?? Date.now(),
      plotId: parsed.data.plotId,
      metric: parsed.data.metric,
      value: parsed.data.value,
      unit: parsed.data.unit,
      source: 'manual' as const,
    };
    const obs: Observation =
      parsed.data.uncertainty !== undefined
        ? { ...base, uncertainty: parsed.data.uncertainty }
        : base;
    store.append(obs);
    return obs;
  });

  return Promise.resolve();
};
